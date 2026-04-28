#!/usr/bin/env tsx
/**
 * Eval harness CLI. Runs the agent against tests/rag/golden.json,
 * computes retrieval and faithfulness metrics, and exits non-zero
 * when either gate is breached.
 *
 * Phase 1.6 spec §5. On-demand only — no scheduled CI run.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { runAgentTurn } from "@/lib/ai/agent/run-turn";
import {
  checkFaithfulness,
  type FaithfulnessCandidate,
} from "@/lib/ai/rag/faithfulness";

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
  faithfulnessMin: 0.85,
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
  faithfulness: number;
  unsupported: string[];
}

async function confirmCostBanner(skipPrompt: boolean): Promise<void> {
  const banner = `
RAG eval will make ~50 Sonnet API calls (~$0.15 at current pricing).
Set RAG_EVAL_AGENT_MODEL=anthropic/claude-haiku-4.5 to drop cost to ~$0.05/run.
Press Enter to continue, Ctrl+C to abort.
`;
  if (skipPrompt) {
    console.log(banner.trim());
    console.log("--yes supplied; continuing without prompt.\n");
    return;
  }
  console.log(banner.trim());
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("> ", () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const skipPrompt = args.includes("--yes");
  await confirmCostBanner(skipPrompt);

  const goldenPath = path.resolve("tests/rag/golden.json");
  const golden: GoldenEntry[] = JSON.parse(await readFile(goldenPath, "utf8"));
  const results: Row[] = [];

  for (const entry of golden) {
    const start = Date.now();
    const turn = await runAgentTurn({ query: entry.query });
    const latencyMs = Date.now() - start;

    const productIdsByCall = turn.candidatesByCall.map((c) =>
      c.map((x) => x.productId),
    );
    const returned = productIdsByCall[0] ?? [];

    const candidates: FaithfulnessCandidate[] =
      turn.candidatesByCall[0]?.map((c) => ({
        id: c.id,
        productId: c.productId,
        text: c.text,
      })) ?? [];

    const faith = await checkFaithfulness({
      query: entry.query,
      candidates,
      answer: turn.answer,
    });

    results.push({
      id: entry.id,
      bucket: entry.bucket,
      latencyMs,
      recall1: recallAt(1, returned, entry.expectedProductIds),
      recall5: recallAt(5, returned, entry.expectedProductIds),
      recall10: recallAt(10, returned, entry.expectedProductIds),
      mrr: mrr(returned, entry.expectedProductIds),
      ndcg10: ndcgAt(10, returned, entry.expectedProductIds),
      faithfulness: faith.score,
      unsupported: faith.unsupportedClaims,
    });
  }

  const mean = (xs: number[]) =>
    xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length);
  const p = (xs: number[], q: number) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * q)] ?? 0;
  };

  const latencies = results.map((r) => r.latencyMs);
  const faiths = results.map((r) => r.faithfulness);
  const unsupportedRate =
    results.filter((r) => r.unsupported.length > 0).length /
    Math.max(1, results.length);

  console.log("\n==== RAG eval ====");
  console.log(`queries: ${results.length}`);
  console.log(
    `recall@1:        ${mean(results.map((r) => r.recall1)).toFixed(3)}`,
  );
  console.log(
    `recall@5:        ${mean(results.map((r) => r.recall5)).toFixed(3)}`,
  );
  console.log(
    `recall@10:       ${mean(results.map((r) => r.recall10)).toFixed(3)}`,
  );
  console.log(`MRR:             ${mean(results.map((r) => r.mrr)).toFixed(3)}`);
  console.log(
    `NDCG@10:         ${mean(results.map((r) => r.ndcg10)).toFixed(3)}`,
  );
  console.log(`faithfulness:    ${mean(faiths).toFixed(3)}`);
  console.log(`unsupported_rate ${unsupportedRate.toFixed(3)}`);
  console.log(`p50 ms:          ${p(latencies, 0.5).toFixed(0)}`);
  console.log(`p95 ms:          ${p(latencies, 0.95).toFixed(0)}`);

  // Per-bucket breakdown
  const buckets = [...new Set(results.map((r) => r.bucket))].sort();
  console.log("\n---- per bucket ----");
  for (const b of buckets) {
    const subset = results.filter((r) => r.bucket === b);
    const r5 = mean(subset.map((r) => r.recall5));
    const f = mean(subset.map((r) => r.faithfulness));
    console.log(
      `${b.padEnd(20)} n=${String(subset.length).padStart(2)}  ` +
        `recall@5=${r5.toFixed(3)}  faithfulness=${f.toFixed(3)}`,
    );
  }

  const recall5 = mean(results.map((r) => r.recall5));
  const faithfulnessMean = mean(faiths);
  let failed = false;
  if (recall5 < GATES.recallAt5Min) {
    console.error(
      `\nFAIL: recall@5 ${recall5.toFixed(3)} < gate ${GATES.recallAt5Min}`,
    );
    failed = true;
  }
  if (faithfulnessMean < GATES.faithfulnessMin) {
    console.error(
      `FAIL: faithfulness ${faithfulnessMean.toFixed(3)} < gate ${GATES.faithfulnessMin}`,
    );
    failed = true;
  }
  if (failed) process.exit(1);
  console.log("\nOK: gates passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
