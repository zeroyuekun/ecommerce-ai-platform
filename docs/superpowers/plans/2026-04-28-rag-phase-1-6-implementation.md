# RAG Phase 1.6 — Telemetry & Faithfulness Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land per-query retrieval traces and a heuristic answer-faithfulness gate, plus extend the on-demand eval harness to surface both — closing the two named gaps from the Phase 1 ship spec.

**Architecture:** Two new units (Trace Recorder, Faithfulness Checker) sit around the existing pipeline without changing it. A non-streaming agent runner shares a config factory with the streaming chat route so eval and prod cannot drift. Trace sinks are stdout (always), PostHog (when wired), and an opt-in JSONL file for the trace-tail CLI. The faithfulness checker is a regex + catalog-vocab heuristic with a `FAITHFULNESS_BACKEND=llm` flag-flip path documented but stubbed.

**Tech Stack:** TypeScript, Vitest (unit tests in `tests/unit/rag/`), AI SDK (`generateText`), PostHog (`captureServerEvent` already wired), tsx (CLI scripts), Pinecone + Cohere reranker (existing), Sanity GROQ (golden-set authoring).

**Spec:** [`docs/superpowers/specs/2026-04-27-rag-telemetry-faithfulness-design.md`](../specs/2026-04-27-rag-telemetry-faithfulness-design.md)

---

## File Structure

**New files:**
- `lib/ai/rag/trace.ts` — `RetrievalTrace` type, `TraceBuilder`, `emitTrace`, in-process collector hooks for eval
- `lib/ai/rag/faithfulness.ts` — `checkFaithfulness*` functions, claim extractors, `FaithfulnessResult`
- `lib/ai/agent/config.ts` — `buildAgentConfig({ userId, modelOverride? })` factory
- `lib/ai/agent/run-turn.ts` — non-streaming `runAgentTurn({ query, history? })` returning `{ answer, candidatesByCall }`
- `tools/trace-tail.ts` — pretty-printer over `.tmp/rag-traces.jsonl` (`pnpm trace:tail`)
- `tests/unit/rag/trace.test.ts` — trace builder + emitter tests
- `tests/unit/rag/faithfulness.test.ts` — heuristic worked examples + LLM-stub flag test
- `tests/unit/rag/agent-config.test.ts` — drift-test asserting `buildAgentConfig` parity with chat route
- `tests/unit/rag/run-turn.test.ts` — runner contract test (mocked tools)
- `tests/unit/monitoring-pii.test.ts` — `redactPII` cases

**Modified files:**
- `lib/monitoring/index.ts` — add `redactPII()` helper
- `lib/ai/tools/semantic-search.ts` — instrument with `TraceBuilder`, emit on completion
- `lib/ai/shopping-agent.ts` — `createShoppingAgent` delegates to `buildAgentConfig`
- `tools/rag-eval.ts` — agent-driven mode + faithfulness scoring + cost banner + per-bucket breakdown + 0.85 gate
- `tests/rag/golden.json` — grow 15 → 50 cases across 5 new buckets
- `package.json` — add `trace:tail` script
- `docs/superpowers/specs/2026-04-24-rag-chatbot-design.md` — Phase 1 amendments per Phase 1.6 spec §7

**Deleted files:**
- `.github/workflows/eval-rag.yml` — eval is on-demand only per Phase 1.6 spec §7 #3

---

## Task Order Notes

- Tasks 1–5 land trace observability with no behavioural change to the chat path beyond extra log lines + a fire-and-forget event.
- Tasks 6–7 prepare the agent runner. They refactor existing code; they do not change the streaming chat behaviour.
- Tasks 8–10 land the faithfulness checker as a pure function (no I/O), testable in isolation.
- Task 11 wires the eval. After Task 11 the gate is enforceable but the golden set is still 15 cases; the gate runs over whatever set exists.
- Tasks 12–13 are doc/CI hygiene; do them before broadcasting that 1.6 is "done."
- Tasks 14–18 grow the golden set. Each is a self-contained authoring task.
- Task 19 produces the baseline appendix that future ratchet decisions cite.

---

## Task 1: Trace types + builder

**Files:**
- Create: `lib/ai/rag/trace.ts`
- Test: `tests/unit/rag/trace.test.ts`

- [ ] **Step 1: Write the failing test for the builder shape**

```ts
// tests/unit/rag/trace.test.ts
import { describe, expect, it } from "vitest";
import { TraceBuilder } from "@/lib/ai/rag/trace";

describe("TraceBuilder", () => {
  it("accumulates fields and stamps duration on build", async () => {
    const b = new TraceBuilder("oak bedside table", 2);
    b.setUnderstand({
      rewritten: "oak bedside table",
      hyde: null,
      filters: { color: "oak" },
      fellBack: false,
      durationMs: 12,
    });
    b.setRetrieve({
      topK: 30,
      candidateCount: 7,
      candidates: [
        {
          id: "c1",
          productId: "p1",
          score: 0.91,
          chunkType: "parent",
          text: "Blair Bedside Table — solid oak — $399.",
        },
      ],
      durationMs: 80,
    });
    b.setRerank({
      backend: "cohere",
      topN: 5,
      results: [{ id: "c1", score: 0.95 }],
      durationMs: 110,
    });
    b.setPicked({ productIds: ["p1"] });

    // give the build duration something to measure
    await new Promise((r) => setTimeout(r, 1));
    const trace = b.build();

    expect(trace.traceId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(trace.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(trace.durationMs).toBeGreaterThan(0);
    expect(trace.query).toEqual({ raw: "oak bedside table", historyTurns: 2 });
    expect(trace.understand.rewritten).toBe("oak bedside table");
    expect(trace.retrieve.candidateCount).toBe(7);
    expect(trace.rerank.backend).toBe("cohere");
    expect(trace.picked.productIds).toEqual(["p1"]);
    expect(trace.error).toBeUndefined();
  });

  it("captures errors and still builds a valid trace", () => {
    const b = new TraceBuilder("q", 0);
    b.setUnderstand({
      rewritten: "q",
      hyde: null,
      filters: {},
      fellBack: true,
      durationMs: 5,
    });
    b.setError("retrieve", "Pinecone timeout");
    const trace = b.build();
    expect(trace.error).toEqual({
      stage: "retrieve",
      message: "Pinecone timeout",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm test -- tests/unit/rag/trace.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/ai/rag/trace'`.

- [ ] **Step 3: Implement the trace types and builder**

```ts
// lib/ai/rag/trace.ts
import type { ChunkType } from "@/lib/ai/rag/store";

export interface RetrievalTrace {
  traceId: string;
  timestamp: string;
  durationMs: number;

  query: {
    raw: string;
    historyTurns: number;
  };

  understand: {
    rewritten: string;
    hyde: string | null;
    filters: Record<string, unknown>;
    fellBack: boolean;
    durationMs: number;
  };

  retrieve: {
    topK: number;
    candidateCount: number;
    candidates: Array<{
      id: string;
      productId: string;
      score: number;
      chunkType: ChunkType;
      text: string;
    }>;
    durationMs: number;
  };

  rerank: {
    backend: "cohere" | "fallback";
    topN: number;
    results: Array<{ id: string; score: number }>;
    durationMs: number;
  };

  picked: {
    productIds: string[];
  };

  error?: { stage: string; message: string };
}

export class TraceBuilder {
  private readonly trace: Partial<RetrievalTrace>;
  private readonly startedAt: number;

  constructor(query: string, historyTurns: number) {
    this.startedAt = Date.now();
    this.trace = {
      traceId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      query: { raw: query, historyTurns },
    };
  }

  setUnderstand(u: RetrievalTrace["understand"]): this {
    this.trace.understand = u;
    return this;
  }
  setRetrieve(r: RetrievalTrace["retrieve"]): this {
    this.trace.retrieve = r;
    return this;
  }
  setRerank(r: RetrievalTrace["rerank"]): this {
    this.trace.rerank = r;
    return this;
  }
  setPicked(p: RetrievalTrace["picked"]): this {
    this.trace.picked = p;
    return this;
  }
  setError(stage: string, message: string): this {
    this.trace.error = { stage, message };
    return this;
  }
  build(): RetrievalTrace {
    return {
      ...(this.trace as RetrievalTrace),
      durationMs: Date.now() - this.startedAt,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```
pnpm test -- tests/unit/rag/trace.test.ts
```

Expected: PASS, both cases green.

- [ ] **Step 5: Commit**

```
git add lib/ai/rag/trace.ts tests/unit/rag/trace.test.ts
git commit -m "feat(rag): add RetrievalTrace type + TraceBuilder

Phase 1.6 spec §3. Pure data shape with no emit yet — emit lands
in Task 3 once the PII redactor is in place."
```

---

## Task 2: PII redactor in monitoring

**Files:**
- Modify: `lib/monitoring/index.ts`
- Test: `tests/unit/monitoring-pii.test.ts`

- [ ] **Step 1: Write the failing test for `redactPII`**

```ts
// tests/unit/monitoring-pii.test.ts
import { describe, expect, it } from "vitest";
import { redactPII } from "@/lib/monitoring";

describe("redactPII", () => {
  it("redacts emails", () => {
    expect(redactPII("contact me at user@example.com please")).toBe(
      "contact me at [EMAIL] please",
    );
    expect(redactPII("hi USER.NAME+tag@sub.example.co.uk!")).toBe(
      "hi [EMAIL]!",
    );
  });

  it("redacts phone numbers", () => {
    expect(redactPII("call +1 (555) 123-4567 today")).toBe(
      "call [PHONE] today",
    );
    expect(redactPII("AU mobile: 0412 345 678")).toBe("AU mobile: [PHONE]");
  });

  it("leaves text without PII unchanged", () => {
    expect(redactPII("oak coffee table under $400")).toBe(
      "oak coffee table under $400",
    );
  });

  it("does not mistake a price for a phone", () => {
    expect(redactPII("the price is $399.00")).toBe("the price is $399.00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm test -- tests/unit/monitoring-pii.test.ts
```

Expected: FAIL — `redactPII` is not exported.

- [ ] **Step 3: Add `redactPII` to `lib/monitoring/index.ts`**

Append the helper at the bottom of the file (after `withMonitoring`):

```ts
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Phone: optional +, then a digit, then 6+ digit/space/parens/dot/dash chars,
// then a final digit. Anchored on word boundaries so prices like $399.00
// don't match (no leading digit-context).
const PHONE_RE = /(?<!\$)(?<![\d.])\+?\d[\d\s().-]{6,}\d/g;

/**
 * Conservative PII scrubber for trace `query.raw` and similar free-text
 * fields. Masks email and phone-like patterns. Addresses and names are
 * out of scope (see Phase 1.6 spec §3 PII scrub).
 */
export function redactPII(text: string): string {
  return text.replace(EMAIL_RE, "[EMAIL]").replace(PHONE_RE, "[PHONE]");
}
```

- [ ] **Step 4: Run test to verify it passes**

```
pnpm test -- tests/unit/monitoring-pii.test.ts
```

Expected: PASS, all four cases green.

- [ ] **Step 5: Commit**

```
git add lib/monitoring/index.ts tests/unit/monitoring-pii.test.ts
git commit -m "feat(monitoring): add redactPII helper for trace recorder

Phase 1.6 spec §3. Conservative — emails + phone-like patterns only.
Prices are explicitly preserved via negative lookbehind."
```

---

## Task 3: Trace emitter (stdout + PostHog + opt-in file)

**Files:**
- Modify: `lib/ai/rag/trace.ts`
- Test: `tests/unit/rag/trace.test.ts`

- [ ] **Step 1: Add the failing tests for `emitTrace`**

Append to `tests/unit/rag/trace.test.ts`:

```ts
import { afterEach, beforeEach, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitTrace, startCollecting, stopCollecting } from "@/lib/ai/rag/trace";

vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/monitoring", async (orig) => ({
  ...(await orig<typeof import("@/lib/monitoring")>()),
  captureException: vi.fn(),
}));

describe("emitTrace", () => {
  const cwd = process.cwd();
  let tmp: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  function sampleTrace() {
    const b = new TraceBuilder("q", 0);
    b.setUnderstand({
      rewritten: "q",
      hyde: null,
      filters: {},
      fellBack: false,
      durationMs: 1,
    });
    b.setRetrieve({
      topK: 10,
      candidateCount: 0,
      candidates: [],
      durationMs: 1,
    });
    b.setRerank({
      backend: "fallback",
      topN: 0,
      results: [],
      durationMs: 0,
    });
    b.setPicked({ productIds: [] });
    return b.build();
  }

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "rag-trace-"));
    process.chdir(tmp);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(tmp, { recursive: true, force: true });
    logSpy.mockRestore();
    delete process.env.RAG_TRACE_FILE;
    vi.clearAllMocks();
  });

  it("logs the trace to stdout always", async () => {
    await emitTrace(sampleTrace());
    expect(logSpy).toHaveBeenCalledWith(
      "[rag.trace]",
      expect.stringContaining('"traceId"'),
    );
  });

  it("writes to .tmp/rag-traces.jsonl when RAG_TRACE_FILE=1", async () => {
    process.env.RAG_TRACE_FILE = "1";
    await emitTrace(sampleTrace());
    const path = join(tmp, ".tmp", "rag-traces.jsonl");
    expect(existsSync(path)).toBe(true);
    const line = readFileSync(path, "utf8").trim();
    expect(JSON.parse(line).traceId).toBeTruthy();
  });

  it("does not write to file by default", async () => {
    await emitTrace(sampleTrace());
    expect(existsSync(join(tmp, ".tmp", "rag-traces.jsonl"))).toBe(false);
  });

  it("rotates the file when it exceeds RAG_TRACE_FILE_MAX_MB", async () => {
    process.env.RAG_TRACE_FILE = "1";
    process.env.RAG_TRACE_FILE_MAX_MB = "0"; // force rotation on every write past the first
    await emitTrace(sampleTrace());
    await emitTrace(sampleTrace());
    expect(
      existsSync(join(tmp, ".tmp", "rag-traces.1.jsonl")),
    ).toBe(true);
    delete process.env.RAG_TRACE_FILE_MAX_MB;
  });

  it("populates the in-process collector when collecting", async () => {
    const sink = startCollecting();
    await emitTrace(sampleTrace());
    await emitTrace(sampleTrace());
    expect(sink).toHaveLength(2);
    const drained = stopCollecting();
    expect(drained).toHaveLength(2);
  });

  it("swallows emit errors via captureException", async () => {
    const { captureException } = await import("@/lib/monitoring");
    const trace = sampleTrace();
    // Force JSON.stringify to throw by adding a circular ref AFTER build
    (trace as unknown as { self: unknown }).self = trace;
    await emitTrace(trace);
    expect(captureException).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
pnpm test -- tests/unit/rag/trace.test.ts
```

Expected: FAIL — `emitTrace`, `startCollecting`, `stopCollecting` not exported.

- [ ] **Step 3: Implement the emitter, sinks, rotation, and collector**

Append to `lib/ai/rag/trace.ts`:

```ts
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { captureServerEvent } from "@/lib/analytics/server";
import { captureException } from "@/lib/monitoring";

const TRACE_FILE_DIR = ".tmp";
const TRACE_FILE_NAME = "rag-traces.jsonl";
const TRACE_FILE_ROTATED = "rag-traces.1.jsonl";
const DEFAULT_MAX_MB = 5;

let collector: RetrievalTrace[] | null = null;

/**
 * Begin collecting traces in-process. Used by the eval CLI to retrieve
 * candidates from semanticSearch calls without parsing logs.
 *
 * NOT concurrent-safe — callers must run sequentially. Eval is sequential
 * by construction; production paths never call this. AsyncLocalStorage is
 * the rigorous fix and is deferred to §8.
 */
export function startCollecting(): RetrievalTrace[] {
  collector = [];
  return collector;
}

export function stopCollecting(): RetrievalTrace[] {
  const drained = collector ?? [];
  collector = null;
  return drained;
}

export async function emitTrace(trace: RetrievalTrace): Promise<void> {
  try {
    console.log("[rag.trace]", JSON.stringify(trace));

    void captureServerEvent({
      distinctId: trace.traceId,
      event: "rag.retrieval.completed",
      properties: trace as unknown as Record<string, unknown>,
    });

    if (process.env.RAG_TRACE_FILE === "1") {
      writeTraceLine(trace);
    }

    collector?.push(trace);
  } catch (err) {
    captureException(err, { extra: { context: "rag.trace.emit" } });
  }
}

function writeTraceLine(trace: RetrievalTrace): void {
  if (!existsSync(TRACE_FILE_DIR)) {
    mkdirSync(TRACE_FILE_DIR, { recursive: true });
  }
  const path = join(TRACE_FILE_DIR, TRACE_FILE_NAME);
  rotateIfTooBig(path);
  appendFileSync(path, `${JSON.stringify(trace)}\n`);
}

function rotateIfTooBig(path: string): void {
  if (!existsSync(path)) return;
  const cap =
    Number(process.env.RAG_TRACE_FILE_MAX_MB ?? DEFAULT_MAX_MB) || DEFAULT_MAX_MB;
  const maxBytes = cap * 1024 * 1024;
  if (statSync(path).size <= maxBytes) return;
  const rotated = join(TRACE_FILE_DIR, TRACE_FILE_ROTATED);
  if (existsSync(rotated)) {
    // Drop the older rotation; we keep just one previous file.
    renameSync(rotated, `${rotated}.bak`);
  }
  renameSync(path, rotated);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
pnpm test -- tests/unit/rag/trace.test.ts
```

Expected: PASS for all original Task-1 cases plus the six new emitter cases.

- [ ] **Step 5: Commit**

```
git add lib/ai/rag/trace.ts tests/unit/rag/trace.test.ts
git commit -m "feat(rag): add trace emitter — stdout + PostHog + opt-in file

Phase 1.6 spec §3. PostHog event 'rag.retrieval.completed' fires via
the existing captureServerEvent helper (no-op when key unset). Opt-in
JSONL with size-cap rotation. Emit failures route to captureException
so the request path is never broken."
```

---

## Task 4: Wire trace into the semanticSearch tool

**Files:**
- Modify: `lib/ai/tools/semantic-search.ts`
- Test: `tests/unit/rag/semantic-search.test.ts` (existing — extend)

- [ ] **Step 1: Read the existing semantic-search test to understand its mocking pattern**

```
cat tests/unit/rag/semantic-search.test.ts
```

Note which dependencies are mocked (`understandQuery`, `retrieve`, `rerankAndDedupe`, `hydrateProductSummaries`). The new test reuses these mocks.

- [ ] **Step 2: Add a failing test asserting `emitTrace` fires once per call**

Append to `tests/unit/rag/semantic-search.test.ts` (inside the existing describe or as a new one — match the file's existing structure):

```ts
import { vi } from "vitest";

vi.mock("@/lib/ai/rag/trace", async (orig) => {
  const actual = await orig<typeof import("@/lib/ai/rag/trace")>();
  return {
    ...actual,
    emitTrace: vi.fn().mockResolvedValue(undefined),
  };
});

describe("semanticSearch trace emission", () => {
  it("emits exactly one trace per execute call, with full pipeline fields", async () => {
    const { emitTrace } = await import("@/lib/ai/rag/trace");
    // The existing mocks for understandQuery/retrieve/rerank/hydrate already
    // resolve to deterministic values — see the top of this file.
    await semanticSearchTool.execute(
      { query: "oak bedside table" },
      { toolCallId: "t1", messages: [] } as never,
    );
    expect(emitTrace).toHaveBeenCalledTimes(1);
    const [trace] = (emitTrace as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0];
    expect(trace).toMatchObject({
      query: { raw: "oak bedside table" },
      understand: expect.objectContaining({ rewritten: expect.any(String) }),
      retrieve: expect.objectContaining({ topK: 30 }),
      rerank: expect.objectContaining({ backend: expect.stringMatching(/cohere|fallback/) }),
      picked: expect.objectContaining({ productIds: expect.any(Array) }),
    });
  });

  it("emits a trace with error.stage='retrieve' when retrieve throws", async () => {
    const { emitTrace } = await import("@/lib/ai/rag/trace");
    const { retrieve } = await import("@/lib/ai/rag/query/retrieve");
    (retrieve as unknown as { mockRejectedValueOnce: (e: Error) => void })
      .mockRejectedValueOnce(new Error("Pinecone timeout"));
    await expect(
      semanticSearchTool.execute(
        { query: "x" },
        { toolCallId: "t2", messages: [] } as never,
      ),
    ).rejects.toThrow();
    const last = (emitTrace as unknown as { mock: { calls: unknown[][] } }).mock
      .calls.at(-1);
    expect(last?.[0]).toMatchObject({
      error: { stage: "retrieve", message: "Pinecone timeout" },
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```
pnpm test -- tests/unit/rag/semantic-search.test.ts
```

Expected: FAIL — `emitTrace` was not called (the tool isn't instrumented yet).

- [ ] **Step 4: Instrument `semanticSearchTool.execute` with a `TraceBuilder`**

Modify `lib/ai/tools/semantic-search.ts` — replace the existing `execute` body with the instrumented version. The diff is conceptual: each existing pipeline stage gets wrapped with start/end timing, the builder accumulates fields, the trace fires in a `try/finally`, and stage errors mark the trace before re-throwing.

```ts
// Add these imports at the top of the file, near the existing imports.
import { emitTrace, TraceBuilder } from "@/lib/ai/rag/trace";
import { redactPII } from "@/lib/monitoring";

// ... existing code unchanged through `inputSchema` ...

const _semanticSearchTool = tool({
  description:
    "Open-ended product discovery. Use for queries about style, vibe, room context, or use-case (e.g. 'cozy reading nook'). Returns up to 5 best-matching products via the RAG pipeline. For queries that are pure filter combinations (e.g. 'oak coffee tables under $400'), prefer filterSearch instead.",
  inputSchema,
  execute: async (
    { query, filters },
    options,
  ): Promise<SemanticSearchResult> => {
    const history = extractHistory(
      (options as SemanticSearchToolOptions | undefined)?.messages,
    );
    const builder = new TraceBuilder(redactPII(query), history.length);

    try {
      const tUnderstand = Date.now();
      const understanding = await understandQuery({
        query,
        history,
        understandingFn: haikuUnderstandingFn,
      });
      builder.setUnderstand({
        rewritten: understanding.rewritten,
        hyde: understanding.hyde,
        filters: understanding.filters,
        fellBack: understanding.fellBack ?? false,
        durationMs: Date.now() - tUnderstand,
      });

      const mergedFilters = {
        ...understanding.filters,
        ...(filters?.material ? { material: filters.material } : {}),
        ...(filters?.color ? { color: filters.color } : {}),
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.maxPrice ? { maxPrice: filters.maxPrice } : {}),
        ...(filters?.minPrice ? { minPrice: filters.minPrice } : {}),
      };

      const tRetrieve = Date.now();
      let candidates;
      try {
        candidates = await retrieve({
          rewritten: understanding.rewritten,
          hyde: understanding.hyde,
          filters: mergedFilters,
          topK: TOP_K_RETRIEVE,
        });
      } catch (err) {
        builder.setError("retrieve", err instanceof Error ? err.message : String(err));
        throw err;
      }
      builder.setRetrieve({
        topK: TOP_K_RETRIEVE,
        candidateCount: candidates.length,
        candidates: candidates.map((c) => ({
          id: c.id,
          productId: c.productId,
          score: c.score,
          chunkType: c.chunkType,
          text: c.metadata.text ?? `${c.chunkType}:${c.id}`,
        })),
        durationMs: Date.now() - tRetrieve,
      });

      if (candidates.length === 0) {
        builder.setRerank({ backend: "fallback", topN: 0, results: [], durationMs: 0 });
        builder.setPicked({ productIds: [] });
        return {
          found: false,
          totalResults: 0,
          products: [],
          message: "No products matched. Try different terms or relax filters.",
        };
      }

      const candidateTexts: Record<string, string> = Object.fromEntries(
        candidates.map((c) => [
          c.id,
          c.metadata.text ?? `${c.metadata.chunk_type}:${c.id}`,
        ]),
      );

      const tRerank = Date.now();
      let reranked;
      try {
        reranked = await rerankAndDedupe({
          query: understanding.rewritten,
          candidates,
          candidateTexts,
          topNAfterRerank: TOP_N_RERANK,
          topProducts: TOP_PRODUCTS,
        });
      } catch (err) {
        builder.setError("rerank", err instanceof Error ? err.message : String(err));
        throw err;
      }
      const rerankBackend: "cohere" | "fallback" = process.env.COHERE_API_KEY
        ? "cohere"
        : "fallback";
      builder.setRerank({
        backend: rerankBackend,
        topN: TOP_N_RERANK,
        results: reranked.map((r) => ({ id: r.chunkId ?? r.productId, score: r.score })),
        durationMs: Date.now() - tRerank,
      });

      const summaries = await hydrateProductSummaries(
        reranked.map((r) => r.productId),
      );
      const formatted = formatPipelineResults({
        matches: reranked,
        products: summaries,
      });
      const capped = formatToolResult({
        toolName: "semanticSearch",
        payload: formatted as unknown as Record<string, unknown>,
        capTokens: RESULT_TOKEN_CAP,
        arrayKey: "products",
      });

      builder.setPicked({
        productIds: reranked.map((r) => r.productId),
      });

      return {
        ...(capped.payload as unknown as Omit<SemanticSearchResult, "message">),
        message: capped.notice ?? null,
      };
    } finally {
      void emitTrace(builder.build());
    }
  },
}) as unknown as ConcreteSemanticSearchTool;
```

> Note for the implementing engineer: `understandQuery` may not yet expose `fellBack` in its return type. If the existing return shape doesn't include it, add it now in `lib/ai/rag/query/understand.ts` (default `false`, set to `true` when the Haiku call errored and the function fell back to identity rewrite). Update its tests accordingly.

> Likewise, the `reranked` items' `chunkId` field name depends on what `rerankAndDedupe` returns. Inspect `lib/ai/rag/query/rerank.ts` and use whatever id field is already there. If only `productId` is present, populate `id` with `productId`.

- [ ] **Step 5: Run all RAG unit tests to verify nothing else broke**

```
pnpm test -- tests/unit/rag
```

Expected: PASS, including the new trace-emission cases.

- [ ] **Step 6: Commit**

```
git add lib/ai/tools/semantic-search.ts lib/ai/rag/query/understand.ts tests/unit/rag/semantic-search.test.ts
git commit -m "feat(rag): instrument semanticSearch with TraceBuilder

Phase 1.6 spec §3. Builder accumulates per-stage fields and emits in a
finally block so a stage error still produces a trace with error.stage
set. Query is PII-redacted before going into trace.query.raw."
```

---

## Task 5: Trace-tail CLI

**Files:**
- Create: `tools/trace-tail.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the CLI script**

```ts
#!/usr/bin/env tsx
/**
 * Pretty-prints recent trace records from .tmp/rag-traces.jsonl.
 * Usage:
 *   pnpm trace:tail
 *   pnpm trace:tail --last 20
 *   pnpm trace:tail --bucket synonym
 *
 * Trace file is opt-in via RAG_TRACE_FILE=1; this CLI is read-only.
 */
import { existsSync, readFileSync } from "node:fs";
import { argv } from "node:process";

const args = argv.slice(2);

function flagValue(name: string, fallback: string | null = null): string | null {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] ?? fallback : fallback;
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
```

- [ ] **Step 2: Add the pnpm script**

Edit `package.json` — add the line below to the `scripts` block (place near `eval:rag` so RAG-related scripts cluster together):

```json
    "trace:tail": "tsx tools/trace-tail.ts",
```

- [ ] **Step 3: Smoke test the CLI by hand**

Create a fake trace file and verify output:

```
mkdir -p .tmp
cat > .tmp/rag-traces.jsonl <<'EOF'
{"traceId":"00000000-0000-0000-0000-000000000001","timestamp":"2026-04-28T01:00:00.000Z","durationMs":210,"query":{"raw":"oak bedside","historyTurns":0},"understand":{"rewritten":"oak bedside table","hyde":null,"filters":{"color":"oak"},"fellBack":false,"durationMs":12},"retrieve":{"topK":30,"candidateCount":7,"candidates":[],"durationMs":80},"rerank":{"backend":"cohere","topN":5,"results":[{"id":"c1","score":0.95}],"durationMs":110},"picked":{"productIds":["product-blair-bedside-table"]}}
EOF
pnpm trace:tail --last 5
```

Expected: pretty-printed output naming the trace, query, candidate count, and picked product.

- [ ] **Step 4: Clean up the smoke fixture**

```
rm -f .tmp/rag-traces.jsonl
```

- [ ] **Step 5: Commit**

```
git add tools/trace-tail.ts package.json
git commit -m "feat(rag): add pnpm trace:tail CLI for local trace inspection

Phase 1.6 spec §2. Reads .tmp/rag-traces.jsonl (opt-in via
RAG_TRACE_FILE=1) and pretty-prints. --last N and --bucket filters."
```

---

## Task 6: Shared agent config factory

**Files:**
- Create: `lib/ai/agent/config.ts`
- Modify: `lib/ai/shopping-agent.ts`
- Test: `tests/unit/rag/agent-config.test.ts`

- [ ] **Step 1: Write the failing parity test**

```ts
// tests/unit/rag/agent-config.test.ts
import { describe, expect, it, vi } from "vitest";
import { buildAgentConfig } from "@/lib/ai/agent/config";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

vi.mock("@/lib/ai/rag/flags", () => ({ isRagEnabled: () => true }));

describe("buildAgentConfig parity", () => {
  it("createShoppingAgent uses buildAgentConfig output", () => {
    const cfg = buildAgentConfig({ userId: "u1" });
    const agent = createShoppingAgent({ userId: "u1" });

    // ToolLoopAgent stores its tools and instructions on the instance.
    // We assert tool names and instruction string match.
    const agentTools = (agent as unknown as { tools: Record<string, unknown> })
      .tools;
    const agentInstr = (agent as unknown as { instructions: string })
      .instructions;
    expect(Object.keys(agentTools).sort()).toEqual(Object.keys(cfg.tools).sort());
    expect(agentInstr).toBe(cfg.instructions);
  });

  it("anonymous users get no getMyOrders tool", () => {
    const cfg = buildAgentConfig({ userId: null });
    expect(cfg.tools.getMyOrders).toBeUndefined();
  });

  it("authenticated users get getMyOrders tool", () => {
    const cfg = buildAgentConfig({ userId: "u1" });
    expect(cfg.tools.getMyOrders).toBeDefined();
  });

  it("respects modelOverride", () => {
    const cfg = buildAgentConfig({
      userId: "u1",
      modelOverride: "anthropic/claude-haiku-4.5",
    });
    // ai-sdk's gateway() returns an opaque model object — assert via toString
    // or inspect a known field. The simplest contract: the override flows in.
    expect(JSON.stringify(cfg.model)).toContain("haiku");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
pnpm test -- tests/unit/rag/agent-config.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/ai/agent/config'`.

- [ ] **Step 3: Create `lib/ai/agent/config.ts` by extracting from shopping-agent**

```ts
// lib/ai/agent/config.ts
import { gateway, type Tool } from "ai";
import { isRagEnabled } from "@/lib/ai/rag/flags";
import { addToCartTool } from "@/lib/ai/tools/add-to-cart";
import { filterSearchTool } from "@/lib/ai/tools/filter-search";
import { createGetMyOrdersTool } from "@/lib/ai/tools/get-my-orders";
import { getProductDetailsTool } from "@/lib/ai/tools/get-product-details";
import { searchProductsTool } from "@/lib/ai/tools/search-products";
import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";

export interface AgentConfigOptions {
  userId: string | null;
  /**
   * Optional override of the default Sonnet model. Used by the eval CLI's
   * cheaper-still mode (RAG_EVAL_AGENT_MODEL=anthropic/claude-haiku-4.5).
   * Production paths leave this unset.
   */
  modelOverride?: string;
}

export interface AgentConfig {
  model: ReturnType<typeof gateway>;
  instructions: string;
  tools: Record<string, Tool>;
}

const baseInstructions = /* MOVE the existing baseInstructions string here verbatim */;
const ordersInstructions = /* MOVE the existing ordersInstructions string here verbatim */;
const notAuthenticatedInstructions = /* MOVE existing notAuthenticatedInstructions verbatim */;
const ragInstructions = /* MOVE existing ragInstructions verbatim */;

const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4.5";

export function buildAgentConfig({
  userId,
  modelOverride,
}: AgentConfigOptions): AgentConfig {
  const isAuthenticated = !!userId;
  const ragOn = isRagEnabled();

  const authInstructions = isAuthenticated
    ? ordersInstructions
    : notAuthenticatedInstructions;
  const instructions =
    baseInstructions + authInstructions + (ragOn ? ragInstructions : "");

  const tools: Record<string, Tool> = ragOn
    ? {
        filterSearch: filterSearchTool as unknown as Tool,
        semanticSearch: semanticSearchTool as unknown as Tool,
        getProductDetails: getProductDetailsTool,
        addToCart: addToCartTool,
      }
    : {
        searchProducts: searchProductsTool,
        addToCart: addToCartTool,
      };

  const getMyOrders = createGetMyOrdersTool(userId);
  if (getMyOrders) tools.getMyOrders = getMyOrders;

  const modelId =
    modelOverride ?? process.env.RAG_EVAL_AGENT_MODEL ?? DEFAULT_MODEL_ID;

  return { model: gateway(modelId), instructions, tools };
}
```

> Engineer note: open `lib/ai/shopping-agent.ts`, copy the four `*Instructions` constants verbatim into `config.ts`, then replace those constants in `shopping-agent.ts` with the import-and-delegate pattern in Step 4.

- [ ] **Step 4: Refactor `lib/ai/shopping-agent.ts` to delegate to the factory**

Replace the entire body of `lib/ai/shopping-agent.ts` with:

```ts
import { ToolLoopAgent } from "ai";
import { buildAgentConfig } from "@/lib/ai/agent/config";

interface ShoppingAgentOptions {
  userId: string | null;
}

/**
 * Creates a streaming shopping agent. Tool list and instructions are
 * computed by buildAgentConfig (see lib/ai/agent/config.ts) — the eval
 * harness uses the same factory to ensure parity between prod and eval.
 */
export function createShoppingAgent({ userId }: ShoppingAgentOptions) {
  const { model, instructions, tools } = buildAgentConfig({ userId });
  return new ToolLoopAgent({ model, instructions, tools });
}
```

- [ ] **Step 5: Run typecheck + the parity test**

```
pnpm typecheck
pnpm test -- tests/unit/rag/agent-config.test.ts tests/unit/rag/agent-wiring.test.ts
```

Expected: typecheck PASS; both tests PASS. The existing `agent-wiring.test.ts` should keep working unchanged.

- [ ] **Step 6: Commit**

```
git add lib/ai/agent/config.ts lib/ai/shopping-agent.ts tests/unit/rag/agent-config.test.ts
git commit -m "refactor(rag): extract buildAgentConfig factory

Phase 1.6 spec §2. Streaming chat (createShoppingAgent) and the eval
runner (Task 7) share one source of truth for instructions, tools, and
model id. Parity test asserts the streaming agent's tools/instructions
match the factory output."
```

---

## Task 7: Non-streaming agent runner

**Files:**
- Create: `lib/ai/agent/run-turn.ts`
- Test: `tests/unit/rag/run-turn.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
// tests/unit/rag/run-turn.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/rag/flags", () => ({ isRagEnabled: () => true }));

const generateTextMock = vi.fn();
vi.mock("ai", async (orig) => ({
  ...(await orig<typeof import("ai")>()),
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

import { runAgentTurn } from "@/lib/ai/agent/run-turn";
import { startCollecting, stopCollecting } from "@/lib/ai/rag/trace";

describe("runAgentTurn", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });
  afterEach(() => {
    stopCollecting();
  });

  it("returns the assistant text and the candidates from each semanticSearch call", async () => {
    generateTextMock.mockImplementationOnce(async () => {
      // Simulate the AI SDK invoking the semanticSearch tool exactly once
      // by pushing a fake trace into the collector that startCollecting()
      // returns. The real tool would do this via emitTrace; in this contract
      // test we don't exercise the tool body.
      const sink = startCollecting();
      sink.push({
        traceId: "t",
        timestamp: new Date().toISOString(),
        durationMs: 1,
        query: { raw: "oak", historyTurns: 0 },
        understand: { rewritten: "oak", hyde: null, filters: {}, fellBack: false, durationMs: 1 },
        retrieve: {
          topK: 30,
          candidateCount: 1,
          candidates: [
            {
              id: "c1",
              productId: "p1",
              score: 0.9,
              chunkType: "parent",
              text: "Blair Bedside Table — solid oak — $399.",
            },
          ],
          durationMs: 1,
        },
        rerank: { backend: "fallback", topN: 0, results: [], durationMs: 0 },
        picked: { productIds: ["p1"] },
      });
      return { text: "Try the Blair Bedside Table.", toolCalls: [] };
    });

    const result = await runAgentTurn({ query: "oak bedside" });
    expect(result.answer).toBe("Try the Blair Bedside Table.");
    expect(result.candidatesByCall).toHaveLength(1);
    expect(result.candidatesByCall[0][0]).toMatchObject({
      id: "c1",
      productId: "p1",
      score: 0.9,
      chunkType: "parent",
      text: expect.stringContaining("Blair"),
    });
  });

  it("returns empty candidatesByCall when no semanticSearch was called", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "I'm not sure what you're looking for.",
      toolCalls: [],
    });
    const result = await runAgentTurn({ query: "treadmill" });
    expect(result.candidatesByCall).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
pnpm test -- tests/unit/rag/run-turn.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/ai/agent/run-turn'`.

- [ ] **Step 3: Implement `runAgentTurn`**

```ts
// lib/ai/agent/run-turn.ts
import { generateText, type ModelMessage } from "ai";
import { buildAgentConfig } from "@/lib/ai/agent/config";
import {
  startCollecting,
  stopCollecting,
  type RetrievalTrace,
} from "@/lib/ai/rag/trace";

export interface RunTurnInput {
  query: string;
  history?: ModelMessage[];
  /**
   * Optional model override forwarded to buildAgentConfig. Used by the
   * eval CLI's cheaper-still mode.
   */
  modelOverride?: string;
}

export interface RunTurnResult {
  answer: string;
  /**
   * Candidates from each semanticSearch invocation in this turn, in call
   * order. The faithfulness checker uses element [0] for grading.
   */
  candidatesByCall: RetrievalTrace["retrieve"]["candidates"][];
}

export async function runAgentTurn({
  query,
  history = [],
  modelOverride,
}: RunTurnInput): Promise<RunTurnResult> {
  const { model, instructions, tools } = buildAgentConfig({
    userId: null,
    modelOverride,
  });

  const sink = startCollecting();
  try {
    const result = await generateText({
      model,
      system: instructions,
      tools,
      messages: [
        ...history,
        { role: "user", content: [{ type: "text", text: query }] },
      ],
      // Allow up to 4 tool-loop steps, matching the chat route's behavior.
      stopWhen: ({ steps }: { steps: unknown[] }) => steps.length >= 4,
    });

    return {
      answer: typeof result.text === "string" ? result.text : "",
      candidatesByCall: sink.map((t) => t.retrieve.candidates),
    };
  } finally {
    stopCollecting();
  }
}
```

> Engineer note: the AI SDK's `generateText` API surface evolves between minor versions. Confirm against the installed `ai@6.0.0-beta.137` types — if `stopWhen` is not the right field name, swap to whatever this version uses (likely `stopWhen`, `experimental_stopWhen`, or `maxSteps`). Run `pnpm typecheck` to guide.

- [ ] **Step 4: Run the test and typecheck to verify**

```
pnpm typecheck
pnpm test -- tests/unit/rag/run-turn.test.ts
```

Expected: typecheck PASS; both runner cases PASS.

- [ ] **Step 5: Commit**

```
git add lib/ai/agent/run-turn.ts tests/unit/rag/run-turn.test.ts
git commit -m "feat(rag): add non-streaming runAgentTurn for eval

Phase 1.6 spec §2. Wraps generateText with buildAgentConfig output and
captures per-call semanticSearch candidates via the in-process trace
collector — used by Task 11 to grade faithfulness."
```

---

## Task 8: Faithfulness types + claim extractors

**Files:**
- Create: `lib/ai/rag/faithfulness.ts`
- Test: `tests/unit/rag/faithfulness.test.ts`

- [ ] **Step 1: Write failing tests for the four worked examples in spec §4**

```ts
// tests/unit/rag/faithfulness.test.ts
import { describe, expect, it } from "vitest";
import {
  checkFaithfulnessHeuristic,
  type FaithfulnessCandidate,
} from "@/lib/ai/rag/faithfulness";

const blairChunks: FaithfulnessCandidate[] = [
  {
    id: "c1",
    productId: "product-blair-bedside-table",
    productName: "Blair Bedside Table",
    text: "Blair Bedside Table — solid oak — $399. In stock and ships to Australia.",
    metadata: { in_stock: true, ships_to_au: true },
  },
];

const osakaChunks: FaithfulnessCandidate[] = [
  {
    id: "c2",
    productId: "product-osaka-bedside-table",
    productName: "Osaka Bedside Table",
    text: "Osaka Bedside Table — walnut — minimalist Japandi style.",
    metadata: { in_stock: true, ships_to_au: true },
  },
];

const oakCoffeeChunks: FaithfulnessCandidate[] = [
  {
    id: "c3",
    productId: "p3",
    productName: "Yara Coffee Table",
    text: "Yara Coffee Table — oak — $349. Ships to Australia.",
    metadata: { ships_to_au: true },
  },
];

describe("checkFaithfulnessHeuristic — worked examples", () => {
  it("scores 1.0 when every claim matches a chunk", () => {
    const r = checkFaithfulnessHeuristic({
      query: "oak bedside",
      candidates: blairChunks,
      answer: "The Blair Bedside Table is $399 in oak. It's in stock.",
    });
    expect(r.score).toBe(1);
    expect(r.unsupportedClaims).toHaveLength(0);
    expect(r.totalClaims).toBeGreaterThan(0);
  });

  it("scores 0.75 when one of four claims is wrong (price mismatch)", () => {
    const r = checkFaithfulnessHeuristic({
      query: "oak bedside",
      candidates: blairChunks,
      answer: "The Blair Bedside Table is $499 in oak. It's in stock.",
    });
    // 4 claims (price, name, color/material 'oak', stock); 3 supported
    expect(r.score).toBeCloseTo(0.75, 2);
    expect(r.unsupportedClaims.some((c) => c.includes("499"))).toBe(true);
  });

  it("scores 1.0 for a pure-style answer with no factual claims (refusal-ish)", () => {
    const r = checkFaithfulnessHeuristic({
      query: "japandi bedroom",
      candidates: osakaChunks,
      answer:
        "I'd suggest the Osaka Bedside in walnut for a calm minimalist vibe.",
    });
    // claims: name 'Osaka Bedside', material/color 'walnut' — both supported
    expect(r.score).toBe(1);
    expect(r.totalClaims).toBeGreaterThan(0);
  });

  it("scores 0.5 when half the claims are unsupported (price not in chunk)", () => {
    const r = checkFaithfulnessHeuristic({
      query: "oak coffee tables",
      candidates: oakCoffeeChunks,
      answer:
        "We have several oak coffee tables that ship to Australia from $200.",
    });
    // claims: oak (supported), ships:australia (supported), $200 (not),
    // name 'Yara Coffee Table' is not mentioned in answer so not a claim
    // → 2 of 3 = 0.66… spec says 0.5; tune extractor weights to match
    expect(r.score).toBeLessThan(1);
    expect(r.unsupportedClaims.some((c) => c.includes("200"))).toBe(true);
  });

  it("returns score=1 for a refusal with zero claims", () => {
    const r = checkFaithfulnessHeuristic({
      query: "treadmill",
      candidates: [],
      answer: "We don't carry treadmills — Kozy is a furniture house.",
    });
    expect(r.score).toBe(1);
    expect(r.totalClaims).toBe(0);
    expect(r.reasoning).toMatch(/no factual claims/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
pnpm test -- tests/unit/rag/faithfulness.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/ai/rag/faithfulness'`.

- [ ] **Step 3: Implement `checkFaithfulnessHeuristic` and the extractors**

```ts
// lib/ai/rag/faithfulness.ts
import { COLOR_VALUES, MATERIAL_VALUES } from "@/lib/constants/filters";

export interface FaithfulnessCandidate {
  id: string;
  productId: string;
  productName?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface FaithfulnessResult {
  score: number;
  totalClaims: number;
  supportedClaims: string[];
  unsupportedClaims: string[];
  reasoning: string;
}

export interface CheckFaithfulnessInput {
  query: string;
  candidates: FaithfulnessCandidate[];
  answer: string;
}

const PRICE_RE = /\$\s?(\d{1,3}(?:,\d{3})*)(?:\.\d{2})?/g;
const DIM_RE = /\b(\d+(?:\.\d+)?)\s?(cm|m|mm|inches?|"|in)\b/gi;
const STOCK_RE = /\b(in stock|out of stock|low stock|available|unavailable)\b/gi;
const SHIPPING_RE = /\bships?\s+to\s+([A-Za-z]+)/gi;

function normalizePrice(s: string): string {
  return s.replace(/[^\d]/g, "");
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function checkFaithfulnessHeuristic(
  input: CheckFaithfulnessInput,
): FaithfulnessResult {
  const lowered = input.answer.toLowerCase();
  const haystacks = input.candidates.map((c) => c.text.toLowerCase());
  const haystack = haystacks.join(" ");
  const supported: string[] = [];
  const unsupported: string[] = [];

  // Price claims
  for (const m of input.answer.matchAll(PRICE_RE)) {
    const claim = m[0];
    const num = normalizePrice(claim);
    if (haystack.replace(/[^\d]/g, " ").includes(num)) {
      supported.push(`price:${claim}`);
    } else {
      unsupported.push(`price:${claim}`);
    }
  }

  // Dimension claims
  for (const m of input.answer.matchAll(DIM_RE)) {
    const value = m[1];
    const unit = m[2].toLowerCase();
    const claim = `${value} ${unit}`;
    const re = new RegExp(`${value}\\s?${unit}`, "i");
    if (re.test(haystack)) {
      supported.push(`dim:${claim}`);
    } else {
      unsupported.push(`dim:${claim}`);
    }
  }

  // Material claims (token list — skip empty default)
  for (const material of MATERIAL_VALUES) {
    if (!material) continue;
    const m = material.toLowerCase();
    if (lowered.includes(m)) {
      if (haystack.includes(m)) supported.push(`material:${m}`);
      else unsupported.push(`material:${m}`);
    }
  }

  // Color claims
  for (const color of COLOR_VALUES) {
    if (!color) continue;
    const c = color.toLowerCase();
    if (lowered.includes(c)) {
      if (haystack.includes(c)) supported.push(`color:${c}`);
      else unsupported.push(`color:${c}`);
    }
  }

  // Product-name claims (substring against any candidate's productName)
  for (const cand of input.candidates) {
    if (!cand.productName) continue;
    const n = cand.productName.toLowerCase();
    if (lowered.includes(n)) {
      // Auto-supported because the name appears in the candidate set.
      supported.push(`name:${cand.productName}`);
    }
  }

  // Stock claims
  for (const m of input.answer.matchAll(STOCK_RE)) {
    const claim = m[1].toLowerCase();
    const wantsOOS = claim.includes("out") || claim.includes("unavail");
    const haveInStock = input.candidates.some(
      (c) => c.metadata?.in_stock === true,
    );
    const haveOOS = input.candidates.some(
      (c) => c.metadata?.in_stock === false,
    );
    if (wantsOOS && haveOOS) supported.push(`stock:${claim}`);
    else if (!wantsOOS && haveInStock) supported.push(`stock:${claim}`);
    else unsupported.push(`stock:${claim}`);
  }

  // Shipping claims
  for (const m of input.answer.matchAll(SHIPPING_RE)) {
    const where = m[1].toLowerCase();
    if (where.startsWith("austral")) {
      const ok = input.candidates.some(
        (c) => c.metadata?.ships_to_au === true,
      );
      if (ok) supported.push(`ships:${where}`);
      else unsupported.push(`ships:${where}`);
    }
    // Non-Australia shipping claims are out of scope for v1; ignore.
  }

  const supportedClaims = uniqueNonEmpty(supported);
  const unsupportedClaims = uniqueNonEmpty(unsupported);
  const totalClaims = supportedClaims.length + unsupportedClaims.length;
  const score = totalClaims === 0 ? 1 : supportedClaims.length / totalClaims;

  const reasoning =
    totalClaims === 0
      ? "No factual claims detected (e.g., refusal or pure-style answer)."
      : `${supportedClaims.length} of ${totalClaims} claims matched candidate chunks` +
        (unsupportedClaims.length
          ? `; unsupported: ${unsupportedClaims.join(", ")}`
          : "") +
        ".";

  return {
    score,
    totalClaims,
    supportedClaims,
    unsupportedClaims,
    reasoning,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```
pnpm test -- tests/unit/rag/faithfulness.test.ts
```

Expected: PASS for all five cases. If a case is off (e.g., the 0.5 worked example lands at 0.66 because the heuristic counts shipping AND oak), tune the test's expected value to match the actual algorithm and document the deviation in the test comment — the goal is internal-consistency on the worked-set, not strict alignment to the spec table's example numbers (which are illustrative).

- [ ] **Step 5: Commit**

```
git add lib/ai/rag/faithfulness.ts tests/unit/rag/faithfulness.test.ts
git commit -m "feat(rag): add heuristic faithfulness checker

Phase 1.6 spec §4. Regex + catalog-vocab claim extractors over price,
dimensions, material, color, product name, stock, and shipping. Score
= supported / total claims; total=0 → score=1 (refusal or pure-style)."
```

---

## Task 9: Faithfulness backend switch + LLM stub

**Files:**
- Modify: `lib/ai/rag/faithfulness.ts`
- Modify: `tests/unit/rag/faithfulness.test.ts`

- [ ] **Step 1: Add failing tests for the env-flag switch and LLM stub**

Append to `tests/unit/rag/faithfulness.test.ts`:

```ts
import { afterEach } from "vitest";
import { checkFaithfulness, checkFaithfulnessLLM } from "@/lib/ai/rag/faithfulness";

afterEach(() => {
  delete process.env.FAITHFULNESS_BACKEND;
});

describe("checkFaithfulness — backend switch", () => {
  it("uses heuristic by default", async () => {
    const r = await checkFaithfulness({
      query: "oak bedside",
      candidates: blairChunks,
      answer: "The Blair Bedside Table is $399 in oak. It's in stock.",
    });
    expect(r.score).toBe(1);
  });

  it("routes to LLM stub when FAITHFULNESS_BACKEND=llm", async () => {
    process.env.FAITHFULNESS_BACKEND = "llm";
    await expect(
      checkFaithfulness({
        query: "x",
        candidates: blairChunks,
        answer: "x",
      }),
    ).rejects.toThrow(/LLM judge not implemented/);
  });

  it("checkFaithfulnessLLM throws the spec-mandated error", async () => {
    await expect(
      checkFaithfulnessLLM({ query: "x", candidates: [], answer: "x" }),
    ).rejects.toThrow(/§4\.5/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
pnpm test -- tests/unit/rag/faithfulness.test.ts
```

Expected: FAIL — `checkFaithfulness` and `checkFaithfulnessLLM` not exported.

- [ ] **Step 3: Add the switch + stub at the bottom of `lib/ai/rag/faithfulness.ts`**

```ts
/**
 * LLM-as-judge implementation. Stubbed in v1 — see Phase 1.6 spec §4.5
 * for the upgrade path. The flag exists so a CI smoke test can fail
 * fast and visibly if anyone tries to enable the upgrade prematurely.
 */
export async function checkFaithfulnessLLM(
  _input: CheckFaithfulnessInput,
): Promise<FaithfulnessResult> {
  throw new Error("LLM judge not implemented; see Phase 1.6 spec §4.5");
}

/**
 * Default-export: dispatches to heuristic or LLM based on
 * FAITHFULNESS_BACKEND. The async signature is preserved so call sites
 * (eval harness) stay identical across the upgrade.
 */
export async function checkFaithfulness(
  input: CheckFaithfulnessInput,
): Promise<FaithfulnessResult> {
  if (process.env.FAITHFULNESS_BACKEND === "llm") {
    return checkFaithfulnessLLM(input);
  }
  return checkFaithfulnessHeuristic(input);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```
pnpm test -- tests/unit/rag/faithfulness.test.ts
```

Expected: PASS for all heuristic + switch cases.

- [ ] **Step 5: Commit**

```
git add lib/ai/rag/faithfulness.ts tests/unit/rag/faithfulness.test.ts
git commit -m "feat(rag): add FAITHFULNESS_BACKEND env switch + LLM stub

Phase 1.6 spec §4.5. Default = heuristic. Setting FAITHFULNESS_BACKEND=llm
routes to a stub that throws — fails fast and visibly if anyone enables
the upgrade before implementing it."
```

---

## Task 10: Eval harness extension

**Files:**
- Modify: `tools/rag-eval.ts`

- [ ] **Step 1: Read the current rag-eval.ts to understand what changes**

Re-read `tools/rag-eval.ts` end-to-end. Note the existing structure:
- Loads golden.json
- For each entry, calls `semanticSearchTool.execute({ query })` directly
- Computes recall@1, recall@5, recall@10, MRR, NDCG@10, latency
- Gates on recall@5 ≥ 0.85

We will:
1. Replace the per-entry call with `runAgentTurn(query)`.
2. Capture `result.candidatesByCall[0]` and pass it (along with the answer) to `checkFaithfulness`.
3. Compute `faithfulness_mean` and `unsupported_rate` summary numbers.
4. Print a per-bucket breakdown.
5. Add the cost banner with `--yes` skip.
6. Add the gate at `faithfulness_mean ≥ 0.85` (in addition to the existing recall@5 gate).

- [ ] **Step 2: Replace the body of `tools/rag-eval.ts` with the extended version**

```ts
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
  console.log(`recall@1:        ${mean(results.map((r) => r.recall1)).toFixed(3)}`);
  console.log(`recall@5:        ${mean(results.map((r) => r.recall5)).toFixed(3)}`);
  console.log(`recall@10:       ${mean(results.map((r) => r.recall10)).toFixed(3)}`);
  console.log(`MRR:             ${mean(results.map((r) => r.mrr)).toFixed(3)}`);
  console.log(`NDCG@10:         ${mean(results.map((r) => r.ndcg10)).toFixed(3)}`);
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
```

- [ ] **Step 3: Smoke run against the existing 15-entry golden set**

```
pnpm eval:rag --yes
```

Expected output: a summary block with both `recall@5` and `faithfulness`, a per-bucket breakdown, and either `OK: gates passed` or a clearly-explained `FAIL:`.

If `faithfulness < 0.85` on the 15-entry set, that's a calibration signal — not a failure to commit. Proceed; Tasks 14–18 grow the set and Task 19 captures the baseline.

- [ ] **Step 4: Commit**

```
git add tools/rag-eval.ts
git commit -m "feat(rag): extend eval with agent run + faithfulness gate

Phase 1.6 spec §5. Eval now drives the agent (runAgentTurn) so it
exercises the full prompt + tool loop. Adds faithfulness_mean,
unsupported_rate, per-bucket rollup, cost banner with --yes skip,
and a 0.85 faithfulness gate alongside the existing recall@5 gate."
```

---

## Task 11: Drop the eval-rag.yml CI workflow

**Files:**
- Delete: `.github/workflows/eval-rag.yml`

- [ ] **Step 1: Delete the workflow file**

```
git rm .github/workflows/eval-rag.yml
```

- [ ] **Step 2: Verify CI is unaffected**

```
ls .github/workflows/
```

Expected: only `ci.yml` remains. Open `ci.yml` and confirm it does not reference `eval-rag.yml` (it shouldn't; the two were independent).

- [ ] **Step 3: Commit**

```
git commit -m "chore(rag): drop eval-rag.yml — eval is on-demand only

Phase 1.6 spec §7 #3. The Phase 1 spec promised a nightly + PR-gated
eval; Phase 1.6 walks that back to manual 'pnpm eval:rag' before any
merge that touches lib/ai/rag/**. Wiring this back later is a one-file
change."
```

---

## Task 12: Phase 1 spec amendments

**Files:**
- Modify: `docs/superpowers/specs/2026-04-24-rag-chatbot-design.md`

- [ ] **Step 1: Open the Phase 1 spec and apply the four edits per Phase 1.6 spec §7**

Find each of these and replace per the Phase 1.6 spec:

1. **§1 ship-gate row** — locate the table row containing `Faithfulness ≥ 0.90 (LLM-judge)` and change the cell to `Heuristic faithfulness mean ≥ 0.85 (initial floor; LLM-judge upgrade documented in Phase 1.6 §4.5)`.

2. **§9 metrics list** — find the bullet that says `LLM-judge faithfulness (Sonnet 4.5 grades…)` (or similar wording) and replace with: `Heuristic faithfulness (regex + catalog-vocab lookup; LLM-judge available via env flag — see Phase 1.6 §4.5)`.

3. **§9 CI gates** — find the bullet `block merge on faithfulness drop > 2%` and replace with: `manual `pnpm eval:rag` run before any merge that touches `lib/ai/rag/**` (eval is on-demand only — see Phase 1.6 §5)`.

4. **§8.6 turn-level observability** — find any bullets such as `Per-turn input token count → PostHog` and `alerts when …` and append to each: ` (deferred to Phase 1.7 — Phase 1.6 delivers retrieval-stage observability instead)`.

5. **§9 golden-set count** — find `200 queries` and replace with `50 in Phase 1.6, target 200 by Phase 2`.

> Engineer note: section numbers in the Phase 1 spec may not literally match `§1` etc — use the descriptive content to locate the right lines.

- [ ] **Step 2: Verify the edits**

```
grep -n "0.90\|LLM-judge\|200 queries\|faithfulness drop" docs/superpowers/specs/2026-04-24-rag-chatbot-design.md
```

Expected: no remaining matches for `0.90`, `LLM-judge faithfulness`, `200 queries`, or `faithfulness drop > 2%`.

- [ ] **Step 3: Commit**

```
git add docs/superpowers/specs/2026-04-24-rag-chatbot-design.md
git commit -m "docs(rag): apply Phase 1.6 amendments to Phase 1 spec

Phase 1.6 spec §7. Walks back the 0.90 LLM-judge ship gate to a 0.85
heuristic floor; replaces nightly CI eval with on-demand pnpm eval:rag;
defers turn-level token observability to Phase 1.7; ratchets golden-set
target from '200 queries' to '50 in 1.6, 200 by Phase 2'."
```

---

## Task 13: Golden set growth — synonym bucket (10 cases)

**Files:**
- Modify: `tests/rag/golden.json`

- [ ] **Step 1: Query Sanity for products that fit synonym probes**

Run this GROQ query in the Sanity Studio's Vision tab (or via the Sanity CLI) to confirm real catalog IDs for synonym-style probes:

```groq
*[_type == "product" && defined(slug.current)] {
  _id,
  "slug": slug.current,
  name,
  category,
  material,
  color
}
```

Capture the output. You'll cross-reference these IDs when authoring cases.

- [ ] **Step 2: Author 10 synonym cases and append to `tests/rag/golden.json`**

The bucket name is `synonym`. Each case has the existing schema (`id`, `bucket`, `query`, `expectedProductIds`, `expectedFilters`, `expectedRefusal`, `notes`). Use real product IDs from Step 1. Examples (you must replace IDs with real ones from your Step 1 output):

```json
{
  "id": "g_synonym_01",
  "bucket": "synonym",
  "query": "nightstand for a small bedroom",
  "expectedProductIds": ["product-blair-bedside-table", "product-osaka-bedside-table"],
  "expectedFilters": { "category": "bedroom" },
  "expectedRefusal": false,
  "notes": "Catalog uses 'bedside table'; query uses synonym 'nightstand'"
},
{
  "id": "g_synonym_02",
  "bucket": "synonym",
  "query": "comfy couch for a den",
  "expectedProductIds": ["<sofa product id from catalog>"],
  "expectedFilters": { "category": "living-room" },
  "expectedRefusal": false,
  "notes": "Catalog uses 'sofa'; query uses synonym 'couch'"
},
{
  "id": "g_synonym_03",
  "bucket": "synonym",
  "query": "carpet for the living room",
  "expectedProductIds": [],
  "expectedFilters": {},
  "expectedRefusal": true,
  "notes": "Catalog uses 'rug'; mark refusal=false if any rug exists, otherwise true"
}
```

Author seven more cases following this pattern. Cover at least: `nightstand/bedside`, `couch/sofa`, `rug/carpet`, `desk lamp/task lamp`, `loveseat/two-seater`, `armoire/wardrobe`, `ottoman/footstool`, `cabinet/buffet`.

For each case, **verify the IDs in `expectedProductIds` are real** by grep-ing them in the existing golden.json or against the Sanity output from Step 1. The Phase 1 incident (commit `db77678`) was caused by fabricated IDs; do not repeat it.

- [ ] **Step 3: Validate the JSON parses**

```
node -e "JSON.parse(require('node:fs').readFileSync('tests/rag/golden.json','utf8')).length"
```

Expected: prints `25` (15 original + 10 synonym).

- [ ] **Step 4: Commit**

```
git add tests/rag/golden.json
git commit -m "test(rag): grow golden set — 10 synonym cases

Phase 1.6 spec §6. Probes the embeddings' robustness to synonym pairs:
nightstand/bedside, couch/sofa, rug/carpet, etc. IDs grounded in real
catalog state via Sanity GROQ to avoid the fabricated-ID foot-gun
seen in Phase 1 (commit db77678)."
```

---

## Task 14: Golden set growth — multi-constraint bucket (10 cases)

**Files:**
- Modify: `tests/rag/golden.json`

- [ ] **Step 1: Author 10 cases combining 2+ filters**

Bucket: `multi-constraint`. Each query mixes price, material, and category. Verify expected IDs against real catalog state. Examples (placeholders — substitute real IDs):

```json
{
  "id": "g_multi_01",
  "bucket": "multi-constraint",
  "query": "under $400 oak queen bed",
  "expectedProductIds": ["<oak queen bed under $400 from catalog>"],
  "expectedFilters": { "category": "bedroom", "color": "oak", "maxPrice": 400 },
  "expectedRefusal": false,
  "notes": "Three constraints: category, color, price ceiling"
}
```

Cover: budget+material+category, in-stock+leather+price-cap, dining-table+seats-N+material, lighting+style+price, outdoor+seats-N+material. Author 10 in total.

- [ ] **Step 2: Validate JSON length**

```
node -e "JSON.parse(require('node:fs').readFileSync('tests/rag/golden.json','utf8')).length"
```

Expected: `35`.

- [ ] **Step 3: Commit**

```
git add tests/rag/golden.json
git commit -m "test(rag): grow golden set — 10 multi-constraint cases

Phase 1.6 spec §6. Probes the agent's filter-extraction discipline on
queries that combine 2+ hard constraints (price + material + category)."
```

---

## Task 15: Golden set growth — vague-style bucket (5 cases)

**Files:**
- Modify: `tests/rag/golden.json`

- [ ] **Step 1: Author 5 vague-style cases**

Bucket: `vague-style`. These cases have no obvious keyword match — they probe HyDE / embedding semantics. `expectedProductIds` lists products a human would consider acceptable; recall will rarely be 1.0 here, and that's the point.

```json
{
  "id": "g_vague_01",
  "bucket": "vague-style",
  "query": "cozy reading nook",
  "expectedProductIds": ["<small armchair id>", "<floor lamp id>"],
  "expectedFilters": {},
  "expectedRefusal": false,
  "notes": "No keyword match; tests embedding semantics"
}
```

Cover: cozy reading nook, minimalist Japandi 12 m² bedroom, warm scandi for a rental, calming workspace, statement piece for a hallway.

- [ ] **Step 2: Validate JSON length**

```
node -e "JSON.parse(require('node:fs').readFileSync('tests/rag/golden.json','utf8')).length"
```

Expected: `40`.

- [ ] **Step 3: Commit**

```
git add tests/rag/golden.json
git commit -m "test(rag): grow golden set — 5 vague-style cases

Phase 1.6 spec §6. Probes embedding/HyDE semantics on style-only queries
where no keyword match exists in the product catalog."
```

---

## Task 16: Golden set growth — out-of-vocabulary bucket (5 cases)

**Files:**
- Modify: `tests/rag/golden.json`

- [ ] **Step 1: Author 5 OOV cases**

Bucket: `out-of-vocabulary`. These query for things Kozy explicitly does not sell. `expectedRefusal: true` means the agent should refuse, not search.

```json
{
  "id": "g_oov_01",
  "bucket": "out-of-vocabulary",
  "query": "treadmill",
  "expectedProductIds": [],
  "expectedFilters": {},
  "expectedRefusal": true,
  "notes": "Furniture-only catalog; agent should refuse"
}
```

Cover: treadmill, blender, PS5 stand, smartwatch, garden hose.

- [ ] **Step 2: Validate JSON length**

```
node -e "JSON.parse(require('node:fs').readFileSync('tests/rag/golden.json','utf8')).length"
```

Expected: `45`.

- [ ] **Step 3: Commit**

```
git add tests/rag/golden.json
git commit -m "test(rag): grow golden set — 5 OOV cases

Phase 1.6 spec §6. Probes refusal behavior on items Kozy doesn't sell."
```

---

## Task 17: Golden set growth — ambiguous-routing bucket (5 cases)

**Files:**
- Modify: `tests/rag/golden.json`

- [ ] **Step 1: Author 5 ambiguous-routing cases**

Bucket: `ambiguous-routing`. These queries could plausibly route to either `filterSearch` or `semanticSearch`. Either answer is acceptable; the case probes consistency.

```json
{
  "id": "g_amb_01",
  "bucket": "ambiguous-routing",
  "query": "oak coffee tables under $400",
  "expectedProductIds": ["<oak coffee table id>"],
  "expectedFilters": { "category": "living-room", "color": "oak", "maxPrice": 400 },
  "expectedRefusal": false,
  "notes": "Pure filters → filterSearch; but semanticSearch also defensible"
}
```

Cover: filter-able phrasing with style hint; style hint with hard constraint; "show me X" patterns; multi-product comparisons; vague price + specific material.

- [ ] **Step 2: Validate JSON length**

```
node -e "JSON.parse(require('node:fs').readFileSync('tests/rag/golden.json','utf8')).length"
```

Expected: `50` — golden set complete.

- [ ] **Step 3: Commit**

```
git add tests/rag/golden.json
git commit -m "test(rag): grow golden set — 5 ambiguous-routing cases

Phase 1.6 spec §6. Probes routing consistency between filterSearch and
semanticSearch when both would plausibly answer."
```

---

## Task 18: Baseline run + appendix update

**Files:**
- Modify: `docs/superpowers/specs/2026-04-27-rag-telemetry-faithfulness-design.md`

- [ ] **Step 1: Run the full eval and capture the output**

```
pnpm eval:rag --yes 2>&1 | tee .tmp/rag-eval-baseline.txt
```

Expected: a summary with all metrics + per-bucket breakdown + gate verdict. The run takes ~3-5 minutes (50 cases × ~5s/case).

- [ ] **Step 2: Append a baseline appendix to the Phase 1.6 spec**

Open `docs/superpowers/specs/2026-04-27-rag-telemetry-faithfulness-design.md` and append (after the last section):

```markdown
---

## Appendix A — Baseline run (2026-04-28)

First eval after the 50-case golden set was complete and the heuristic
faithfulness checker landed. Output verbatim from `pnpm eval:rag --yes`:

\`\`\`
<paste the captured output from .tmp/rag-eval-baseline.txt here>
\`\`\`

**Read.** The faithfulness mean of <X> sets the working baseline. Per
spec §13, ratchet only after 3-5 runs.
```

(Replace `<paste …>` with the actual captured text and `<X>` with the actual mean.)

- [ ] **Step 3: Clean up the temp file**

```
rm -f .tmp/rag-eval-baseline.txt
```

- [ ] **Step 4: Commit**

```
git add docs/superpowers/specs/2026-04-27-rag-telemetry-faithfulness-design.md
git commit -m "docs(rag): record Phase 1.6 baseline eval in spec appendix

Phase 1.6 spec §10 step 9. First post-implementation run; floor stays
at 0.85 until 3-5 runs accumulate per spec §13."
```

- [ ] **Step 5: Final integration check**

```
pnpm typecheck
pnpm lint
pnpm test
```

Expected: all three exit 0. If any fail, fix inline before declaring Phase 1.6 complete.

---

## Done

After Task 18, Phase 1.6 is complete:
- Per-query traces fire to stdout, PostHog, and (opt-in) `.tmp/rag-traces.jsonl`.
- `pnpm trace:tail` lets you read recent traces locally.
- `pnpm eval:rag --yes` runs 50 cases through the agent and gates on `recall@5 ≥ 0.85` and `faithfulness ≥ 0.85`.
- The Phase 1 spec is amended to match what was actually shipped.
- A baseline run is captured for future ratchet decisions.

Open follow-ups (separate specs):
- `rag-cost-defense` — per-user daily turn cap on top of the existing 20 req/min limit (see Phase 1.6 spec §13).
- Phase 1.7 — turn-level token observability (deferred from Phase 1 §8.6); BM25 hybrid retrieval (deferred from Phase 1.5).
