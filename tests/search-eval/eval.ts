import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineQuery } from "next-sanity";
import { embedBatch } from "@/lib/search/embed";
import { getSearchIndex, type IndexRecord } from "@/lib/search/index";
import { buildEmbeddingText } from "@/lib/search/text";
import { client } from "@/sanity/lib/client";

interface Query {
  query: string;
  relevantIds: string[];
}

interface RunResult {
  recallAt5: number;
  mrr: number;
  numQueries: number;
  numSkipped: number;
  runAt: string;
  perQuery: Array<{
    query: string;
    recallAt5: number;
    reciprocalRank: number;
    topIds: string[];
    relevantIds: string[];
  }>;
}

const DIR = join(process.cwd(), "tests", "search-eval");
const CACHE_FILE = join(DIR, ".embeddings-cache.json");

function loadCache(): Record<string, number[]> {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as Record<
      string,
      number[]
    >;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, number[]>): void {
  writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

async function embedWithCache(
  texts: string[],
  cache: Record<string, number[]>,
): Promise<number[][]> {
  const missing: string[] = [];
  const missingIdx: number[] = [];
  const result: (number[] | null)[] = texts.map((t) => {
    const cached = cache[hashText(t)];
    return cached ?? null;
  });
  for (let i = 0; i < texts.length; i += 1) {
    if (result[i] === null) {
      missingIdx.push(i);
      missing.push(texts[i]);
    }
  }
  if (missing.length > 0) {
    const fresh = await embedBatch(missing);
    for (let i = 0; i < missing.length; i += 1) {
      cache[hashText(missing[i])] = fresh[i];
      result[missingIdx[i]] = fresh[i];
    }
    saveCache(cache);
  }
  return result as number[][];
}

async function runOne(
  q: Query,
  vector: number[],
): Promise<{ recallAt5: number; reciprocalRank: number; topIds: string[] }> {
  const res = await getSearchIndex().query(vector, { topK: 10 });
  const topIds = res.map((r) => r.id);
  const relevant = new Set(q.relevantIds);
  const top5 = topIds.slice(0, 5);
  const hits5 = top5.filter((id) => relevant.has(id)).length;
  const recallAt5 = relevant.size === 0 ? 0 : hits5 / relevant.size;
  let reciprocalRank = 0;
  for (let i = 0; i < topIds.length; i += 1) {
    if (relevant.has(topIds[i])) {
      reciprocalRank = 1 / (i + 1);
      break;
    }
  }
  return { recallAt5, reciprocalRank, topIds };
}

const ALL_PRODUCTS_QUERY = defineQuery(`
  *[_type == "product"]{
    _id,
    "slug": slug.current,
    name,
    description,
    price,
    stock,
    material,
    color,
    "category": category->slug.current
  }
`);

interface SeedProduct {
  _id: string;
  slug: string;
  name: string | null;
  description: string | null;
  price: number;
  stock: number;
  material: string | null;
  color: string | null;
  category: string | null;
}

async function seedIndex(cache: Record<string, number[]>) {
  const products = (await client.fetch(ALL_PRODUCTS_QUERY)) as SeedProduct[];
  const index = getSearchIndex();
  const texts: string[] = [];
  const kept: SeedProduct[] = [];
  for (const p of products) {
    const text = buildEmbeddingText(p);
    if (text.length === 0) continue;
    texts.push(text);
    kept.push(p);
  }
  const vectors = await embedWithCache(texts, cache);
  const records: IndexRecord[] = kept.map((p, i) => ({
    id: p._id,
    vector: vectors[i],
    metadata: {
      _id: p._id,
      slug: p.slug,
      name: p.name ?? "",
      category: p.category,
      price: p.price,
      stock: p.stock,
    },
  }));
  await index.upsert(records);
  console.log(
    `[eval] seeded ${records.length} products into ${index.backend} index`,
  );
}

async function main() {
  const cache = loadCache();

  // Seed when explicitly asked, or when the backend is in-memory (tests, local
  // runs without Upstash). The Upstash backend is assumed to be pre-populated
  // by the backfill script, so we skip seeding there.
  const shouldSeed =
    process.argv.includes("--seed") || getSearchIndex().backend === "memory";
  if (shouldSeed) {
    await seedIndex(cache);
  }

  const queries = JSON.parse(
    readFileSync(join(DIR, "queries.json"), "utf8"),
  ) as Query[];

  const scorable = queries.filter((q) => q.relevantIds.length > 0);
  const skipped = queries.length - scorable.length;

  // Embeddings are deterministic: cache to disk to avoid re-hitting AI Gateway.
  const vectors =
    scorable.length === 0
      ? []
      : await embedWithCache(
          scorable.map((q) => q.query),
          cache,
        );

  const scored: RunResult["perQuery"] = [];
  for (let i = 0; i < scorable.length; i += 1) {
    const q = scorable[i];
    const { recallAt5, reciprocalRank, topIds } = await runOne(q, vectors[i]);
    scored.push({
      query: q.query,
      recallAt5,
      reciprocalRank,
      topIds: topIds.slice(0, 5),
      relevantIds: q.relevantIds,
    });
  }

  const recallAt5 =
    scored.length === 0
      ? 0
      : scored.reduce((s, r) => s + r.recallAt5, 0) / scored.length;
  const mrr =
    scored.length === 0
      ? 0
      : scored.reduce((s, r) => s + r.reciprocalRank, 0) / scored.length;

  const result: RunResult = {
    recallAt5,
    mrr,
    numQueries: scored.length,
    numSkipped: skipped,
    runAt: new Date().toISOString(),
    perQuery: scored,
  };

  const outFile = join(DIR, `results-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  writeFileSync(join(DIR, "latest.json"), JSON.stringify(result, null, 2));

  console.log(`[eval] recall@5 = ${recallAt5.toFixed(3)}`);
  console.log(`[eval] MRR      = ${mrr.toFixed(3)}`);
  console.log(`[eval] queries  = ${scored.length} (skipped ${skipped})`);
  console.log(`[eval] wrote    = ${outFile}`);

  if (process.argv.includes("--promote")) {
    writeFileSync(
      join(DIR, "baseline.json"),
      JSON.stringify(
        { recallAt5, mrr, numQueries: scored.length, runAt: result.runAt },
        null,
        2,
      ),
    );
    console.log("[eval] baseline updated");
  }

  if (process.argv.includes("--check")) {
    const baseline = JSON.parse(
      readFileSync(join(DIR, "baseline.json"), "utf8"),
    ) as {
      recallAt5: number;
    };
    const threshold = baseline.recallAt5 - 0.05;
    if (recallAt5 < threshold) {
      console.error(
        `[eval] FAIL: recall@5 ${recallAt5.toFixed(3)} < baseline ${baseline.recallAt5.toFixed(3)} - 0.05`,
      );
      process.exit(1);
    }
    console.log("[eval] OK vs baseline");
  }
}

main().catch((err) => {
  console.error("[eval] crashed:", err);
  process.exit(1);
});
