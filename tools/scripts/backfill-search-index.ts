/**
 * One-shot backfill: fetch all products from Sanity, embed, upsert to
 * Upstash Vector. Idempotent — re-running is safe.
 *
 * Run: `pnpm backfill:search` (see package.json).
 */
import "dotenv/config";
import { defineQuery } from "next-sanity";
import { embedBatch } from "@/lib/search/embed";
import { getSearchIndex, type IndexRecord } from "@/lib/search/index";
import { buildEmbeddingText } from "@/lib/search/text";
import { client } from "@/sanity/lib/client";

const ALL_PRODUCTS_FOR_INDEX_QUERY = defineQuery(`
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

interface BackfillProduct {
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

const BATCH_SIZE = 50;

async function main() {
  const start = Date.now();
  const products = (await client.fetch(
    ALL_PRODUCTS_FOR_INDEX_QUERY,
  )) as BackfillProduct[];
  console.log(`[backfill] fetched ${products.length} products from Sanity`);

  const index = getSearchIndex();
  console.log(`[backfill] index backend: ${index.backend}`);

  let indexed = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const texts = batch.map(buildEmbeddingText);
    const keptIdx: number[] = [];
    const keptTexts: string[] = [];
    batch.forEach((_, j) => {
      if (texts[j].length === 0) return;
      keptIdx.push(j);
      keptTexts.push(texts[j]);
    });
    skipped += batch.length - keptIdx.length;

    const vectors = await embedBatch(keptTexts);

    const records: IndexRecord[] = keptIdx.map((j, k) => ({
      id: batch[j]._id,
      vector: vectors[k],
      metadata: {
        _id: batch[j]._id,
        slug: batch[j].slug,
        name: batch[j].name ?? "",
        category: batch[j].category,
        price: batch[j].price,
        stock: batch[j].stock,
      },
    }));
    await index.upsert(records);
    indexed += records.length;
    console.log(
      `[backfill] progress ${Math.min(i + BATCH_SIZE, products.length)}/${products.length}`,
    );
  }

  const durationSec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[backfill] done: indexed=${indexed} skipped=${skipped} in ${durationSec}s`,
  );
}

main().catch((err) => {
  console.error("[backfill] FAILED:", err);
  process.exit(1);
});
