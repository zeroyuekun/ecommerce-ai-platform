#!/usr/bin/env tsx
/**
 * Pretty-prints recent trace records from .tmp/rag-traces.jsonl.
 * Usage:
 *   pnpm trace:tail
 *   pnpm trace:tail --last 20
 *   pnpm trace:tail --bucket synonym
 *
 * Trace file is opt-in via RAG_TRACE_FILE=1; this CLI is read-only.
 * Note: --bucket relies on a tracer-side `bucket` annotation that's not
 * emitted yet — the filter is forward-looking and will return no
 * matches against current traces.
 */
import { existsSync, readFileSync } from "node:fs";
import { argv } from "node:process";

const args = argv.slice(2);

function flagValue(name: string, fallback: string | null = null): string | null {
  const idx = args.indexOf(name);
  if (idx < 0) return fallback;
  const next = args[idx + 1];
  if (next === undefined || next.startsWith("--")) {
    console.error(`Flag ${name} requires a value.`);
    process.exit(1);
  }
  return next;
}

const last = Number(flagValue("--last", "50")) || 50;
const bucket = flagValue("--bucket");
const path = ".tmp/rag-traces.jsonl";

if (!existsSync(path)) {
  console.error(
    `No trace file at ${path}. Set RAG_TRACE_FILE=1 and run a query first.`,
  );
  process.exit(1);
}

const lines = readFileSync(path, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const recent = lines.slice(-last);

let printed = 0;
for (const line of recent) {
  let trace: Record<string, unknown>;
  try {
    trace = JSON.parse(line);
  } catch {
    console.error(`! malformed line: ${line.slice(0, 80)}…`);
    continue;
  }
  if (bucket) {
    // bucket is metadata that lives in tracer-side annotations, not the
    // base trace shape — so this is a substring filter for now.
    if (!line.includes(`"bucket":"${bucket}"`)) continue;
  }
  printed += 1;
  const t = trace as {
    traceId: string;
    timestamp: string;
    durationMs: number;
    query: { raw: string; historyTurns: number };
    understand: { rewritten: string; fellBack: boolean };
    retrieve: { candidateCount: number; durationMs: number };
    rerank: { backend: string; results: unknown[] };
    picked: { productIds: string[] };
    error?: { stage: string; message: string };
  };
  console.log(`[${t.timestamp}] ${t.traceId} ${t.durationMs}ms`);
  console.log(`  query:      ${t.query.raw} (${t.query.historyTurns} turns)`);
  console.log(
    `  understand: ${t.understand.rewritten}${t.understand.fellBack ? " [fallback]" : ""}`,
  );
  console.log(
    `  retrieve:   ${t.retrieve.candidateCount} candidates in ${t.retrieve.durationMs}ms`,
  );
  console.log(
    `  rerank:     ${t.rerank.backend} → ${t.rerank.results.length} results`,
  );
  console.log(`  picked:     ${t.picked.productIds.join(", ") || "(none)"}`);
  if (t.error) {
    console.log(`  error:      ${t.error.stage} — ${t.error.message}`);
  }
  console.log();
}

if (printed === 0) {
  console.error(`No matching traces (filter bucket=${bucket}).`);
  process.exit(2);
}
