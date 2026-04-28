#!/usr/bin/env tsx
/**
 * Cost-free version of the RAG eval. Runs all 50 golden cases through
 * the real Pinecone retrieve + rerank pipeline (free tier) using a stub
 * query-understanding function so no LLM/gateway calls are made.
 *
 * What this proves at $0:
 *   - The eval harness wiring is intact (golden set parses, pipeline
 *     runs end-to-end without errors, metric math runs).
 *   - Pinecone retrieval recall@k is REAL on the 50-case set —
 *     the headline number Phase 1 reported (recall@5 = 1.000 on 15
 *     cases) gets re-baselined on the bigger, harder set.
 *   - Per-bucket breakdown shows where the index is strong/weak:
 *     specific/aesthetic typically near-perfect; vague-style and
 *     synonym are the harder buckets without HyDE/reranking by Cohere.
 *
 * What this does NOT prove:
 *   - The agent's prompt picks the right tool per query (needs Sonnet)
 *   - The agent's answer is faithful to the chunks (needs Sonnet)
 *   - Filter F1 (needs Haiku for understanding extraction)
 *
 * Faithfulness in this mode synthesizes an "answer" from the top
 * retrieved chunks, so the score is a "wiring intact" check (will
 * mostly be ≥ 0.9), not a meaningful hallucination detector.
 *
 * Usage:
 *   pnpm eval:rag-cheap
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkFaithfulnessHeuristic } from "@/lib/ai/rag/faithfulness";
import { rerankAndDedupe } from "@/lib/ai/rag/query/rerank";
import { retrieve } from "@/lib/ai/rag/query/retrieve";
import {
  type UnderstandingFn,
  understandQuery,
} from "@/lib/ai/rag/query/understand";

interface GoldenEntry {
  id: string;
  bucket: string;
  query: string;
  expectedProductIds: string[];
  expectedFilters: Record<string, unknown>;
  expectedRefusal: boolean;
  notes: string;
}

const TOP_K_RETRIEVE = 30;
const TOP_N_RERANK = 10;
const TOP_PRODUCTS = 5;

const stubUnderstandingFn: UnderstandingFn = async ({ query }) => ({
  rewritten: query,
  hyde: null,
  filters: {},
  fellBack: false,
});

function recallAt(k: number, returned: string[], expected: string[]): number {
  if (expected.length === 0) return returned.length === 0 ? 1 : 0;
  const top = new Set(returned.slice(0, k));
  const hits = expected.filter((id) => top.has(id)).length;
  return hits / expected.length;
}

function mrr(returned: string[], expected: string[]): number {
  if (expected.length === 0) return returned.length === 0 ? 1 : 0;
  for (let i = 0; i < returned.length; i += 1) {
    if (expected.includes(returned[i])) return 1 / (i + 1);
  }
  return 0;
}

function ndcgAt(k: number, returned: string[], expected: string[]): number {
  if (expected.length === 0) return returned.length === 0 ? 1 : 0;
  const expectedSet = new Set(expected);
  let dcg = 0;
  let idcg = 0;
  for (let i = 0; i < k; i += 1) {
    const rel = expectedSet.has(returned[i] ?? "") ? 1 : 0;
    dcg += rel / Math.log2(i + 2);
    if (i < expected.length) idcg += 1 / Math.log2(i + 2);
  }
  return idcg === 0 ? 0 : dcg / idcg;
}

interface Row {
  id: string;
  bucket: string;
  isRefusal: boolean;
  latencyMs: number;
  recall1: number;
  recall5: number;
  recall10: number;
  mrr: number;
  ndcg10: number;
  faithfulness: number;
}

async function runOne(entry: GoldenEntry): Promise<Row> {
  const start = Date.now();

  const understanding = await understandQuery({
    query: entry.query,
    history: [],
    understandingFn: stubUnderstandingFn,
  });

  const candidates = await retrieve({
    rewritten: understanding.rewritten,
    hyde: understanding.hyde,
    filters: understanding.filters,
    topK: TOP_K_RETRIEVE,
  });

  const candidateTexts: Record<string, string> = Object.fromEntries(
    candidates.map((c) => [c.id, c.metadata.text ?? `${c.chunkType}:${c.id}`]),
  );

  const reranked = await rerankAndDedupe({
    query: understanding.rewritten,
    candidates,
    candidateTexts,
    topNAfterRerank: TOP_N_RERANK,
    topProducts: TOP_PRODUCTS,
  });

  const returnedProductIds = reranked.map((r) => r.productId);

  // Synthetic answer from top-3 candidate chunks. Faithfulness will be
  // ≈ 1.0 by construction; this is a wiring check, not a hallucination
  // detector. See module docstring.
  const synthAnswer = reranked
    .slice(0, 3)
    .map((r) => candidateTexts[r.id] ?? "")
    .join("\n\n");

  const faith = checkFaithfulnessHeuristic({
    query: entry.query,
    candidates: reranked.map((r) => ({
      id: r.id,
      productId: r.productId,
      text: candidateTexts[r.id] ?? "",
    })),
    answer: synthAnswer,
  });

  return {
    id: entry.id,
    bucket: entry.bucket,
    isRefusal: entry.expectedRefusal,
    latencyMs: Date.now() - start,
    recall1: recallAt(1, returnedProductIds, entry.expectedProductIds),
    recall5: recallAt(5, returnedProductIds, entry.expectedProductIds),
    recall10: recallAt(10, returnedProductIds, entry.expectedProductIds),
    mrr: mrr(returnedProductIds, entry.expectedProductIds),
    ndcg10: ndcgAt(10, returnedProductIds, entry.expectedProductIds),
    faithfulness: faith.score,
  };
}

async function main() {
  console.log("RAG eval — no-LLM mode (free, ~30s on 50 cases).");
  console.log(
    "Recall metrics are real; faithfulness is a wiring check (synthetic answer).\n",
  );

  const goldenPath = path.resolve("tests/rag/golden.json");
  const golden: GoldenEntry[] = JSON.parse(await readFile(goldenPath, "utf8"));

  const rows: Row[] = [];
  for (const entry of golden) {
    try {
      const row = await runOne(entry);
      rows.push(row);
      process.stdout.write(".");
    } catch (err) {
      console.error(`\nFAIL on ${entry.id}:`, err);
      throw err;
    }
  }
  console.log("\n");

  const mean = (xs: number[]) =>
    xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length);
  const p = (xs: number[], q: number) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * q)] ?? 0;
  };

  // Refusal-bucket cases (OOV, some synonyms) can't be scored on recall
  // without an agent — retrieve always returns 30, so recall would be 0.
  // Compute headline metrics on the non-refusal subset.
  const recallable = rows.filter((r) => !r.isRefusal);
  const latencies = rows.map((r) => r.latencyMs);

  console.log("==== RAG eval (no-LLM) ====");
  console.log(`queries:           ${rows.length}`);
  console.log(
    `refusal-bucket:    ${rows.length - recallable.length} (skipped from recall mean — agent required)`,
  );
  console.log(
    `recall@1:          ${mean(recallable.map((r) => r.recall1)).toFixed(3)}`,
  );
  console.log(
    `recall@5:          ${mean(recallable.map((r) => r.recall5)).toFixed(3)}`,
  );
  console.log(
    `recall@10:         ${mean(recallable.map((r) => r.recall10)).toFixed(3)}`,
  );
  console.log(
    `MRR:               ${mean(recallable.map((r) => r.mrr)).toFixed(3)}`,
  );
  console.log(
    `NDCG@10:           ${mean(recallable.map((r) => r.ndcg10)).toFixed(3)}`,
  );
  console.log(
    `faithfulness:      ${mean(rows.map((r) => r.faithfulness)).toFixed(3)} (synthetic answer)`,
  );
  console.log(`p50 latency ms:    ${p(latencies, 0.5).toFixed(0)}`);
  console.log(`p95 latency ms:    ${p(latencies, 0.95).toFixed(0)}`);

  const buckets = [...new Set(rows.map((r) => r.bucket))].sort();
  console.log("\n---- per bucket ----");
  for (const b of buckets) {
    const subset = rows.filter((r) => r.bucket === b);
    const recallableSubset = subset.filter((r) => !r.isRefusal);
    const r5 =
      recallableSubset.length > 0
        ? mean(recallableSubset.map((r) => r.recall5)).toFixed(3)
        : "n/a   ";
    const f = mean(subset.map((r) => r.faithfulness)).toFixed(3);
    const note = subset.every((r) => r.isRefusal)
      ? " (refusals — agent required)"
      : "";
    console.log(
      `${b.padEnd(20)} n=${String(subset.length).padStart(2)}  ` +
        `recall@5=${r5}  faithfulness=${f}${note}`,
    );
  }

  // Spot-check report — the lowest-recall non-refusal cases tell you
  // which queries the index struggles with. Useful diagnostic when the
  // mean is OK but specific buckets are quietly bad.
  const worst = recallable
    .filter((r) => r.recall5 < 1)
    .sort((a, b) => a.recall5 - b.recall5)
    .slice(0, 5);
  if (worst.length > 0) {
    console.log("\n---- lowest-recall non-refusal cases ----");
    for (const r of worst) {
      const golden = (
        JSON.parse(await readFile(goldenPath, "utf8")) as GoldenEntry[]
      ).find((g) => g.id === r.id);
      console.log(
        `${r.id.padEnd(20)} bucket=${r.bucket.padEnd(18)} recall@5=${r.recall5.toFixed(2)}  "${golden?.query ?? ""}"`,
      );
    }
  }

  console.log(
    "\nNote: this run made 0 LLM calls. Faithfulness shown is a 'wiring intact' check.",
  );
  console.log(
    "Real faithfulness scoring requires the agent loop — run 'pnpm eval:rag --yes' once credits are available.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
