import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { embedText } from "@/lib/search/embed";
import { getSearchIndex } from "@/lib/search/index";

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

async function runOne(q: Query): Promise<{
  recallAt5: number;
  reciprocalRank: number;
  topIds: string[];
}> {
  const vector = await embedText(q.query);
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

async function main() {
  const queries = JSON.parse(
    readFileSync(join(DIR, "queries.json"), "utf8"),
  ) as Query[];

  const scored: RunResult["perQuery"] = [];
  let skipped = 0;

  for (const q of queries) {
    if (q.relevantIds.length === 0) {
      skipped += 1;
      continue;
    }
    const { recallAt5, reciprocalRank, topIds } = await runOne(q);
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
