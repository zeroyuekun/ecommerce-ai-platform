# RAG Telemetry & Faithfulness Gate — Design (Phase 1.6)

**Status:** Proposed 2026-04-27
**Author:** Claude (Opus 4.7), in collaboration with Neville Zeng
**Predecessor:** [Phase 1 — RAG Chatbot Design (2026-04-24)](./2026-04-24-rag-chatbot-design.md)
**Scope:** Close two named gaps in Phase 1 — retrieval observability and answer-faithfulness measurement — at portfolio quality, without adding required SaaS dependencies.

---

## 1. Goal & success criteria

Phase 1 §1 lists `Faithfulness ≥ 0.90 (LLM-judge)` as a ship-gate metric, and §8.6 promises retrieval observability events. Neither is currently implemented. This spec delivers both at a quality bar that:

1. A hiring reviewer can run end-to-end with no new credentials beyond the keys already required for Phase 1.
2. Catches real regressions on PRs that touch the RAG pipeline.
3. Is structured for swap-in to a production APM later — `lib/monitoring/index.ts` is already a thin abstraction by design; we extend it, not replace it.

### Bar to ship

| Metric | Target | Measured by |
|---|---|---|
| Per-query retrieval trace emitted on every `semanticSearch` call | 100% | unit test on the trace emitter; manual sanity via `pnpm trace:tail` |
| Faithfulness mean ≥ 0.70 on the golden set | initial gate; ratchet toward Phase 1's 0.90 target after 2 weeks of stable baseline (floor at 0.85 if baseline doesn't support 0.90) | `pnpm eval:rag` exits non-zero below floor |
| Golden-set size | ≥ 50 cases across 6 buckets | `pnpm eval:rag` summary |
| New SaaS keys required | 0 | env-var inventory check in CI |

### Explicit non-goals

- No production-grade durable trace store (Upstash/Postgres) — see §8.
- No public dashboard or alerting.
- No live-traffic sampling, beyond a `RAG_TRACE_SAMPLE_RATE` env hook reserved for the future.
- No new vector store, embedding model, or rerank backend.
- No change to the chat UI, the streaming chat endpoint, or the LLM-visible tool contracts.

---

## 2. Architecture — two new units

The Phase 1 architecture is unchanged. Two new units sit around the existing pipeline:

```
        existing                                                added by this spec
 ┌───────────────────────┐
 │ semanticSearch tool   │ ─── call(query, opts) ───┐
 │  understand → retrieve│                          │
 │   → rerank → format   │                          ▼
 └───────────────────────┘                  ┌────────────────┐
                                            │ Trace Recorder │
                                            │ (lib/ai/rag/   │
                                            │   trace.ts)    │
                                            └────┬───────────┘
                                                 │ stdout JSON  +  .tmp/rag-traces.jsonl (opt-in)
                                                 ▼
                                         AI Gateway logs (LLM calls)  +  trace file (pipeline calls)

 pnpm eval:rag                                    consumed by
 (extended) ──→ runAgentTurn(case) ──┐                          ┌────────────────┐
                                     ▼                          │ Faithfulness   │
                              candidates +  ─────────────────→  │ Judge          │
                              assistant text                    │ (Haiku 4.5)    │
                                                                └────┬───────────┘
                                                                     ▼
                                                            summary row in eval CLI
                                                            gate: mean ≥ 0.70
```

| Unit | Path | Owns |
|---|---|---|
| **Trace Recorder** | `lib/ai/rag/trace.ts` | Typed trace record + emitter. Stdout JSON always; `.tmp/rag-traces.jsonl` when `RAG_TRACE_FILE=1`. |
| **Faithfulness Judge** | `lib/ai/rag/judge.ts` | One pure async function: `judgeFaithfulness({query, candidates, answer}) → {score, unsupportedClaims, reasoning}`. |
| **Agent Runner** | `lib/ai/agent/run-turn.ts` | Non-streaming `runAgentTurn(query, history?)` used by eval (and reusable for future test suites). Wraps the same tools, system prompt, and model the chat route uses. |
| **Trace Tail CLI** | `tools/trace-tail.ts` | Reads `.tmp/rag-traces.jsonl`, pretty-prints. `pnpm trace:tail [--last N] [--bucket B]`. |
| **Eval extension** | `tools/rag-eval.ts` (existing) | Extended to run the agent, capture the answer, score faithfulness, add gate. |

### Boundaries

- The trace recorder is fire-and-forget — its failure must never break the request path. A single `try/catch` around the emit call routes errors to `captureException`.
- The judge runs only inside the eval CLI; never on user-facing requests.
- The agent runner is non-streaming. The streaming chat route is untouched. Both share a `buildAgentConfig()` factory so they can't drift on system-prompt or tool-list.
- Trace shape is a TypeScript interface owned by `trace.ts`; consumers parse it; no dynamic shape.

---

## 3. Trace shape & emission

One record per `semanticSearch` invocation, emitted at completion. The agent's natural-language response is **not** part of the trace — it lives in AI Gateway logs by request id, cross-referenced via `traceId`.

```ts
// lib/ai/rag/trace.ts
import type { ChunkType } from "@/lib/ai/rag/store";

export interface RetrievalTrace {
  traceId: string;          // nanoid; correlates with AI Gateway request id
  timestamp: string;        // ISO
  durationMs: number;       // total semanticSearch wall-clock

  query: {
    raw: string;            // PII-redacted at the boundary
    historyTurns: number;   // count only, not contents
  };

  understand: {
    rewritten: string;
    hyde: string | null;
    filters: Record<string, unknown>;
    fellBack: boolean;      // true if Haiku errored and we identity-rewrote
    durationMs: number;
  };

  retrieve: {
    topK: number;
    candidateCount: number;
    candidates: Array<{
      id: string;            // chunk id
      productId: string;
      score: number;         // Pinecone similarity
      chunkType: ChunkType;
    }>;
    durationMs: number;
  };

  rerank: {
    backend: "cohere" | "fallback";   // 'fallback' = key absent or call failed
    topN: number;
    results: Array<{ id: string; score: number }>;
    durationMs: number;
  };

  picked: {
    productIds: string[];     // post-dedupe top-5
  };

  error?: { stage: string; message: string };
}
```

### Emission point

A single `TraceBuilder` accumulates fields across the existing stage calls in `lib/ai/tools/semantic-search.ts` and emits once at the end. Wrapping is minimal — no new layer of indirection over the pipeline. Failure modes (Haiku error, retrieve error, rerank error) populate `error` and still emit, so we can debug failures from the trace alone.

### Sinks

- **Always:** `console.log("[rag.trace]", JSON.stringify(trace))` — captured by Vercel Logs in production, by stderr in CI.
- **Opt-in:** when `process.env.RAG_TRACE_FILE === "1"`, append a line to `.tmp/rag-traces.jsonl`. Used by the trace-tail CLI; never enabled in deployed environments.
- **No persistent store.** Production durable storage is the §8 extension.

### PII scrub

`query.raw` runs through a `redactPII()` helper that masks email and phone patterns. Pattern set is conservative; addresses and names are out of scope. Codified in `lib/monitoring/index.ts` next to the existing credential `redact()`.

### Sample rate

Reserved env hook: `RAG_TRACE_SAMPLE_RATE` (0–1.0; default 1.0). Honored by the recorder but pinned to 1.0 in this spec — sampling is a §8 concern, the hook just keeps the call site stable across the upgrade.

---

## 4. Faithfulness judge

### Rubric (Ragas-style, simplified)

> Given the customer's question, the candidate chunks the retrieval pipeline returned, and the assistant's natural-language answer, score the answer's *faithfulness*: every factual claim in the answer (product names, prices, materials, dimensions, stock, shipping) must be supported by content in the candidate chunks.

- A claim is *supported* if a chunk mentions the same product and the same factual value.
- A claim is *unsupported* if the answer asserts a fact not present in any chunk.
- Style/aesthetic statements ("would suit a Japandi space") are not counted as factual claims.
- Score = `1 − (unsupported_claims / total_factual_claims)`. Clamped to `[0, 1]`. If there are no factual claims, score = 1.0.

### Implementation

`lib/ai/rag/judge.ts` exports `judgeFaithfulness({query, candidates, answer})`. Uses Haiku 4.5 via AI Gateway with `generateObject` against:

```ts
const SCHEMA = z.object({
  score: z.number().min(0).max(1),
  totalClaims: z.number().int().nonnegative(),
  unsupportedClaims: z.array(z.string()),
  reasoning: z.string().max(800),
});
```

The prompt explicitly instructs: *"Only count concrete factual assertions about products in this catalog. Do not penalize subjective style language. If a price is in the answer but not in any chunk, that is unsupported."* Three worked examples (one all-supported, one partial, one obvious hallucination) anchor the rubric. Full prompt lives in `judge.ts`.

Cost: ~$0.001 per case × 50 cases = **~$0.05 per full eval**, on top of ~$0.15 for the agent runs.

### Why Haiku, not Sonnet

Phase 1 §9 names Sonnet 4.5 as the judge. We choose Haiku 4.5 because:

1. Haiku 4.5 was released after Phase 1 was written and is materially better than Haiku 3 on structured-output tasks while ~5× cheaper than Sonnet.
2. Faithfulness is a structured rule-following task, not a creative one — Sonnet's marginal lift is small.
3. Using a different model than the generator (Sonnet) avoids the *graded-by-self* bias that would inflate scores when both roles run on the same model.

This is a deliberate amendment to Phase 1 §9; it's enumerated in §7 below.

---

## 5. Eval harness extension

`tools/rag-eval.ts` currently runs `semanticSearchTool.execute` and computes recall/MRR/NDCG. It does not drive the agent or judge faithfulness. Changes:

1. Add `runAgentTurn(query, history?) → {answer, candidatesByCall[]}` in `lib/ai/agent/run-turn.ts`. Uses `generateText` (non-streaming) with the same tools, system prompt, and model the chat route uses, sourced from a shared `buildAgentConfig()` factory.
2. For each golden case: call `runAgentTurn(query)`. Capture `answer` and `candidatesByCall[0]` (the first `semanticSearch` invocation's candidate set) for the judge.
3. Call `judgeFaithfulness({query, candidates, answer})`. Store score + `unsupportedClaims`.
4. Extend the summary printer with: `faithfulness_mean` (mean score across cases), `unsupported_rate` (fraction of cases with `unsupportedClaims.length > 0`), `judge_p95_ms`, plus a per-bucket breakdown.
5. Add gate: `if faithfulness_mean < 0.70 → exit 1`. Same exit-code pattern as the existing `recallAt5Min`.

### Cost & runtime

Current eval (15 cases): ~$0.05, ~2 min.
New eval (50 cases): ~$0.20, ~7 min.

CI gating model unchanged: full eval runs nightly + on PRs touching `lib/ai/rag/**`. Acceptable for nightly; not for every PR.

---

## 6. Test-set growth — `golden.json`: 15 → 50

The current set is 15 entries, all biased toward "specific item recall." We grow with deliberate weak-spot probes per the failure-mode-driven approach. New buckets:

| Bucket | Target count | Probes |
|---|---|---|
| `specific` (existing) | 15 | unchanged |
| `synonym` | 10 | "nightstand"/"bedside table"; "couch"/"sofa"; "rug"/"carpet"; "desk lamp"/"task lamp" |
| `multi-constraint` | 10 | "under $400 oak queen bed"; "in-stock leather sofa not over $1500"; "dining table seats six in walnut" |
| `vague-style` | 5 | "cozy reading nook"; "minimalist Japandi 12 m² bedroom"; "warm scandi for a rental" |
| `out-of-vocabulary` | 5 | "treadmill"; "blender"; "PS5 stand" — must return `expectedRefusal: true` |
| `ambiguous-routing` | 5 | cases where filterSearch and semanticSearch produce different but defensible answers |
| **`golden.json` total** | **50** | |
| `multi-turn` (separate file) | 4 | unchanged in `multi-turn.json` |

Each new case carries the existing fields (`bucket`, `query`, `expectedProductIds`, `expectedFilters`, `expectedRefusal`, `notes`).

**Authoring approach:** new cases are seeded by querying the real catalog (Sanity) for products that match each probe, so `expectedProductIds` is grounded in actual catalog state. The Phase 1 fix-up in commit `db77678` ("replace fabricated golden-set IDs with real catalog IDs") proved fabricated IDs are a foot-gun; we won't repeat it.

Stretch: 10 more cases in Phase 1.7 once we observe which weak buckets the new gate exposes. Stop at 50 for this spec.

---

## 7. Phase 1 spec amendments

The Phase 1 spec made promises that this work either fulfills or explicitly walks back. To keep the design surface honest, the same PR that lands this work edits the Phase 1 doc:

1. **§1 ship-gate row** — change `Faithfulness ≥ 0.90` to `Faithfulness mean ≥ 0.70 (initial floor; ratchet toward 0.90 after 2 weeks of stable baseline; floor at 0.85 if baseline doesn't support 0.90)`.
2. **§9 metrics list** — change "LLM-judge faithfulness (Sonnet 4.5 grades…)" to "(Haiku 4.5 grades…)" with a one-line rationale (different model than the generator avoids graded-by-self bias).
3. **§9 CI gates** — keep "faithfulness drop > 2%" as a gate; mark active starting on the post-baseline ratchet.
4. **§8.6 turn-level observability bullets** ("Per-turn input token count → PostHog", alerts) — mark as "deferred to Phase 1.7" with a forward link to that future spec. Phase 1.6 gives us *retrieval-stage* observability, not turn-level token observability.
5. **§9 golden-set count** — change "200 queries" to "50 in Phase 1.6, target 200 by Phase 2".

These edits are part of this spec's deliverables, not a separate task.

---

## 8. Production-grade extension (not built)

Sketched here so reviewers can see the full design surface without us building it:

- **Durable trace store.** Replace stdout-only with a write to a Postgres table (`rag_traces` — Vercel Marketplace Neon would be the natural pick) or an Upstash Redis hash with a 7-day TTL. Keep stdout for redundancy.
- **Sampling.** Honor `RAG_TRACE_SAMPLE_RATE` (already a recorder hook); default 1.0 in dev, 0.1 in prod. Never sample cases tagged `error`.
- **Dashboard.** PostHog event `rag.retrieval.completed` with the trace as properties; Insights for p95 retrieve-stage latency, faithfulness-gate violations per day, top-K hit-rate per bucket.
- **Alerting.** PostHog Insight → Slack webhook on faithfulness-mean 7-day drop > 2% or trace-error-rate > 1%.
- **PII policy.** Real PII scrubber (current `redactPII` is a floor); audit logging; configurable retention.
- **Live-traffic faithfulness.** Sample 1% of production turns into the judge; compare drift vs golden-set baseline; flag distribution shift.

Estimated effort for the full extension: 2–3 weeks plus ops setup. Not justified at portfolio scale.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Agent runner drifts from the chat route's behavior | Both import from a shared `buildAgentConfig()` factory (system prompt, tools, model). Add a unit test that asserts both paths produce identical `tools.length` and identical model id. |
| Judge over-penalizes legitimate paraphrase ("queen-size bed" vs "queen bed") | Rubric prompt accepts paraphrase of the same fact; three worked examples in the prompt anchor accept/reject. |
| Judge under-penalizes (always reports ≈ 1.0) | `tests/rag/judge.spec.ts` runs the judge on a hand-built obvious-hallucination set (5 cases); asserts faithfulness ≤ 0.50. Catches model drift on the rubric. |
| Initial 0.70 floor masks a real regression | After 2 weeks of stable scores, ratchet to (baseline − 1σ), capped at 0.90 above and 0.85 below. Tracked as a follow-up issue, not part of this spec. |
| `.tmp/rag-traces.jsonl` grows unbounded in dev | Recorder rotates the file after `RAG_TRACE_FILE_MAX_MB` MB (default 5) — renames to `.1.jsonl` and starts fresh. The trace-tail CLI reads the latest file. |
| Trace recorder throws and breaks the request path | `try/catch` around the emit call; failure → `captureException`. Unit-tested with a deliberately broken JSON serializer. |
| Eval cost climbs beyond budget | $0.20/eval × 30 nightly runs/month ≈ $6/month. Spec §1's existing `$/query` budget assertion is extended to include the new judge spend. |

---

## 10. Build order

Roughly day-shaped chunks; not a binding plan (writing-plans skill produces that next).

1. **Trace shape + recorder.** Type, builder, single emission point in `semantic-search.ts`. Unit tests with a fake clock and a captured-log array.
2. **Trace-tail CLI.** Reads `.tmp/rag-traces.jsonl`, pretty-prints. Smoke test only.
3. **Agent runner.** Non-streaming `runAgentTurn`; shared `buildAgentConfig()` extracted from chat route. Drift-test asserting parity with chat route.
4. **Faithfulness judge.** Rubric prompt, schema, function. Worked-examples unit test (hallucination set ≤ 0.50; obvious-true set ≥ 0.85).
5. **Eval extension.** Wire judge into `tools/rag-eval.ts`; new summary columns and per-bucket rollup; gate at 0.70.
6. **Test-set growth.** Author 35 new cases per §6, grounded in real catalog product IDs (verified via Sanity GROQ before commit).
7. **Phase 1 spec amendments.** Apply the §7 edits to the Phase 1 doc in the same PR for traceability.
8. **Run the full eval, observe baseline, log it in the spec's appendix.** This is the artifact that drives the future ratchet.

---

## 11. What this spec is explicitly NOT doing

- No production durable trace store (§8).
- No public dashboard, alerting, or live-traffic sampling.
- No new test-set buckets beyond §6.
- No change to the streaming chat route or LLM tool contract.
- No structured citation output from the LLM.
- No replacement of the eval harness with Ragas / DeepEval / Braintrust.
- No revisit of BM25 hybrid retrieval (still Phase 1.5).

---

## 12. Spots most worth pushback on

The three decisions in this spec where I'd most expect a reviewer to push back, with my reasoning:

1. **Initial faithfulness floor of 0.70, not 0.90.** Phase 1 promised 0.90. I'm walking that back to 0.70 with a documented ratchet path because we have no baseline data — setting a 0.90 gate now risks a flapping CI on day one and there's no way to tell the difference between "the gate is too tight" and "we have a real regression." The honest move is: measure the real distribution for two weeks, then set the gate. If you'd rather hold the 0.90 promise and accept the flap risk, the spec needs a §1 edit.
2. **Haiku-as-judge instead of Sonnet-as-judge.** I'm overriding the Phase 1 choice for cost + graded-by-self bias reasons. If you'd rather keep Sonnet to match the generator strength, swap one line in `judge.ts` and add ~$0.10/eval.
3. **Test set 15 → 50, not 15 → 100.** The video says 50–100. I picked the floor because recall@k variance flattens fast and authoring 35 grounded cases is already several hours of careful catalog work. If the portfolio story benefits from "we're over the recommended bar," I can take this to 75.

---

## 13. Open questions to revisit after baseline

- Is 0.70 the right initial floor? Re-evaluate after two weeks of baseline data (matching §1's ratchet schedule).
- Do we want a per-bucket gate (synonym ≥ 0.80, ambiguous-routing ≥ 0.60)? Defer until per-bucket scores stabilize.
- Should the judge also score *citation correctness* (i.e., the answer mentions a product that didn't actually score in the top-5)? Useful, but redundant with the answer-attribution telemetry once §3's `picked.productIds` are logged. Defer.
