#!/usr/bin/env tsx
/**
 * Eval harness CLI. Loads tests/rag/golden.json, runs each query through
 * the RAG pipeline (semanticSearchTool.execute), computes metrics, and
 * exits non-zero if recall@5 < 0.85 (per spec §1).
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";

interface GoldenEntry {
  id: string;
  bucket: string;
  query: string;
  expectedProductIds: string[];
  expectedFilters: Record<string, unknown>;
  expectedRefusal: boolean;
  notes: string;
}

const GATES = {
  recallAt5Min: 0.85,
};

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
  latencyMs: number;
  recall1: number;
  recall5: number;
  recall10: number;
  mrr: number;
  ndcg10: number;
}

async function main() {
  const goldenPath = path.resolve("tests/rag/golden.json");
  const golden: GoldenEntry[] = JSON.parse(await readFile(goldenPath, "utf8"));
  const results: Row[] = [];

  for (const entry of golden) {
    const start = Date.now();
    const out = await semanticSearchTool.execute({ query: entry.query }, {
      messages: [],
      toolCallId: `eval-${entry.id}`,
    } as never);
    const latencyMs = Date.now() - start;
    const returned = (
      (out as { products?: { id: string }[] }).products ?? []
    ).map((p) => p.id);
    results.push({
      id: entry.id,
      bucket: entry.bucket,
      latencyMs,
      recall1: recallAt(1, returned, entry.expectedProductIds),
      recall5: recallAt(5, returned, entry.expectedProductIds),
      recall10: recallAt(10, returned, entry.expectedProductIds),
      mrr: mrr(returned, entry.expectedProductIds),
      ndcg10: ndcgAt(10, returned, entry.expectedProductIds),
    });
  }

  const mean = (xs: number[]) =>
    xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length);
  const p = (xs: number[], q: number) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * q)] ?? 0;
  };

  const latencies = results.map((r) => r.latencyMs);
  console.log("==== RAG eval ====");
  console.log(`queries: ${results.length}`);
  console.log(`recall@1:  ${mean(results.map((r) => r.recall1)).toFixed(3)}`);
  console.log(`recall@5:  ${mean(results.map((r) => r.recall5)).toFixed(3)}`);
  console.log(`recall@10: ${mean(results.map((r) => r.recall10)).toFixed(3)}`);
  console.log(`MRR:       ${mean(results.map((r) => r.mrr)).toFixed(3)}`);
  console.log(`NDCG@10:   ${mean(results.map((r) => r.ndcg10)).toFixed(3)}`);
  console.log(`p50 ms:    ${p(latencies, 0.5).toFixed(0)}`);
  console.log(`p95 ms:    ${p(latencies, 0.95).toFixed(0)}`);

  const recall5 = mean(results.map((r) => r.recall5));
  if (recall5 < GATES.recallAt5Min) {
    console.error(
      `FAIL: recall@5 ${recall5.toFixed(3)} < gate ${GATES.recallAt5Min}`,
    );
    process.exit(1);
  }
  console.log("OK: gates passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
