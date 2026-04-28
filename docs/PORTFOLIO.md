# Kozy — AI Furniture E-commerce Platform

**A walkthrough for software engineering hiring managers.**

---

## TL;DR

Kozy is a production-shipped, AI-augmented e-commerce platform for a premium Australian furniture brand. It pairs a polished Next.js 16 storefront with a Retrieval-Augmented Generation (RAG) shopping assistant that understands aesthetic intent ("cozy reading nook in oak tones, under $400") and grounds every spec/price answer in tool-call truth.

| Signal | Value |
|---|---|
| Live URL | https://ecommerce-ai-platform-rho.vercel.app |
| Total commits | **140+** across ~8 weeks (2026-03-05 → 2026-04-28) |
| Unit/integration tests | **166 passing**, 15 gated live tests |
| RAG eval results (15-query Phase 1 golden set) | **recall@5 = 1.000, MRR = 1.000, NDCG@10 = 0.995** |
| Phase 1.6 golden set | **50 queries across 7 buckets**, every ID grounded in real Sanity catalog |
| First-token latency budget | **p95 < 2.0 s** (k6 gate) |
| TypeScript | strict, **0 errors** |
| Lint | Biome, **0 errors across 276 files** |
| Architecture decisions | **5 ADRs** in [`docs/adr/`](./adr/) |
| Rollback safety | **7 git tags** for one-command revert (incl. `pre-phase-1-6`) |

The novel engineering — **production hardening, the full RAG pipeline, a same-day post-merge audit that found and fixed five critical defects, and a follow-up phase that closed two named telemetry/faithfulness gaps with a cost-free verification path** — is documented in detail below with paths, numbers, and tradeoffs.

---

## 1. What the product does

**Storefront.** A full furniture catalog with category/material/color/price filters, multi-select tags, full-text search with popular-query suggestions, product variant grouping (one card with color swatches), recently-viewed carousel, sale/new flags, breadcrumbs, related products, persistent cart with stock validation, Stripe checkout to 44 countries, and order tracking. Real-time inventory via Sanity Live (no polling). Full dark mode. Six static information pages (FAQ, Returns, Shipping, etc.) and a six-location store locator.

**AI shopping assistant.** A chat agent powered by Claude Sonnet 4.5 (via Vercel AI Gateway) that answers natural-language style queries — "Japandi for a 12 m² bedroom", "warm minimalist living room" — by retrieving over a Pinecone vector index of the catalog, reranking with Cohere, and returning structured product cards. The agent calls tools for ground-truth specs/stock and can add items to the cart inline. Image upload is supported (visual analysis → similar-product suggestions). Tools adapt to authentication state — guests cannot call `getMyOrders`.

**Admin dashboard.** Inventory management with direct Sanity App SDK mutations (real-time reactivity without a custom WebSocket layer), order workflow, low-stock alerts, revenue analytics, and **Claude-generated sales insights** drawn from the inventory + order data. Sanity Studio is embedded at `/studio`.

---

## 2. Tech stack at a glance

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** App Router, React 19, RSC + Server Actions | Modern data-fetching patterns, no separate API layer for most reads |
| Language | TypeScript (strict) | Type safety end-to-end, including Sanity TypeGen-generated query types |
| CMS | **Sanity v4** + App SDK + TypeGen | Sanity types are auto-generated from GROQ query strings — refactors break loudly |
| Auth | **Clerk** + AgentKit | AI tools scoped to authenticated user identity at agent construction time |
| Payments | **Stripe** | Webhook-driven order creation (orders never exist without payment) |
| AI generation | **Claude Sonnet 4.5** via Vercel AI Gateway | Hot-swappable per AI SDK v6 conventions |
| AI query understanding | **Claude Haiku 4.5** via AI Gateway | ~$0.001/call, 200–400 ms; structured outputs via `generateObject` |
| Vector store | **Pinecone Serverless** | Vercel Marketplace integration, native hybrid retrieval, sub-10 ms p50 |
| Embeddings | **Pinecone Inference** (`multilingual-e5-large` @ 1024d) | One-vendor consolidation; was Voyage initially (see ADR-0005) |
| Reranker | **Cohere Rerank 3.5** (optional) | Skipped automatically when `COHERE_API_KEY` missing — pipeline degrades, doesn't break |
| Cache + queue | **Upstash Redis + QStash** | Durable webhook delivery with idempotency keys |
| Observability | **PostHog** + custom `lib/monitoring/` | Vendor-neutral capture surface; redacts credentials before logging |
| State (client) | **Zustand** + localStorage persistence | Cart hits the server only at checkout |
| Styling | Tailwind v4 + shadcn/ui + Radix primitives | |
| Lint/format | **Biome** | Single tool replaces ESLint + Prettier; ~70 ms full-repo check |
| Tests | **Vitest** (unit) + **Playwright** (e2e) + **k6** (load) | |
| CI | GitHub Actions | Typecheck + lint + test + build on every push |

---

## 3. How I built it (chronological)

The 113 commits cluster into four distinct stages. Each shipped to production behind a feature flag or git tag so it could be rolled back independently.

### Stage 1 — Storefront foundation (~ March – early April 2026, ~50 commits)

Built the customer-facing experience on a Next.js scaffold:

- Hero banners + video section, category mega-menu, smart hide-on-scroll header
- Product catalog with filter UI, variant grouping, recently-viewed (12-item localStorage)
- Stripe checkout with shipping-address collection (44 countries) and **webhook-driven order creation** — orders are only written to Sanity after `payment_intent.succeeded`, with stock decremented atomically
- Admin dashboard with Sanity App SDK direct mutations (no API layer for inventory edits)
- AI chatbot v1: keyword `searchProducts` tool + `addToCart` tool + image upload
- Typography system (Cormorant Garamond + DM Sans), full dark mode
- 12 informational pages (Privacy, Returns, Shipping, FAQ, Terms, etc.)
- Six-location store locator

**Why this matters to a hiring manager.** Webhook-driven order creation is documented in [`docs/adr/0001`](./adr/0001-webhook-driven-order-creation.md): the alternative — optimistic order writes — produces a class of bugs where orders exist without payment or stock decrements before payment confirms. Naming the tradeoff explicitly is more useful than the code itself.

### Stage 2 — Production hardening (April 20–24, 2026, 4 audit passes)

Three sequential audit-and-fix passes, each tagged for rollback. The goal: bring the codebase to the hygiene of a small production service.

**Pass 1 — Performance & robustness audit** (`b8c0eb6`)

- `sanity/lib/client.ts` — enabled `useCdn: true` on the read-only client (write client still bypasses CDN for freshness)
- `app/api/chat/route.ts` — added zod schema validation, 256 KB body cap, sliding-window rate limiter (20 req/min), explicit `runtime: "nodejs"` and `maxDuration: 60`
- `app/api/webhooks/stripe/route.ts` — replaced fragile `lineItems.data[index]`-by-position matching with `productId`-from-metadata matching (line-order assumption was a real correctness bug)
- `lib/hooks/useCartStock.ts` — O(n²) `products.find()` per cart item replaced with O(1) Map lookup; 400 ms debounce; `AbortController` cancellation; stable signature memoisation
- `lib/ai/json-extract.ts` — replaced greedy `/\{[\s\S]*\}/` JSON extraction with a balanced-brace state-machine parser (the regex over-matches when the model wraps JSON in explanation prose)

**Pass 2 — Production hardening v1** (`7a3dd1f`, tag `production-hardening-v1`)

- Unit tests for cart store, cart-stock hook, rate limiter, JSON extractor, monitoring
- Vitest configured with `happy-dom` + `@testing-library/react`
- GitHub Actions CI: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` on every push and PR
- Concurrency groups so superseded runs cancel
- Security headers in [`next.config.ts`](../next.config.ts) — HSTS (`max-age=63072000; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, **structured-fields-correct `Permissions-Policy`** (single quotes parse-fail silently — see header tests for the guard), and a `Content-Security-Policy-Report-Only` header (CSP shipped in observe-mode first to surface Sanity Studio / Clerk / Stripe / AI Gateway violations before flipping to enforcing)
- ADRs 0001–0004 documenting non-obvious decisions (webhook orders, Sanity CDN, Zustand cart, in-memory rate limit)

**Pass 3 — Production hardening v2** (`fa816fc`, tag `production-hardening-v2`)

- Playwright e2e suite (homepage, cart drawer, static pages, security-header contract test)
- Lighthouse CI (`lighthouserc.json`) — perf ≥ 0.7, a11y ≥ 0.9, LCP < 3.5 s, CLS < 0.1, TBT < 300 ms
- **Upstash Redis swap** for the rate limiter — the limiter detects `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` and silently upgrades from in-memory to distributed; no code change required
- PostHog scaffold via `lib/analytics/server.ts:captureServerEvent` and a client-side provider that initialises only when the key is set

**Pass 4 — Polish** (`e4e27be`)
- LICENSE, SECURITY.md, dead-code cleanup, full TypeGen refresh

**Why this stage matters.** The hardening stage shows what production discipline looks like in code: ADRs that name the migration path away, env-gated capabilities (`UPSTASH_REDIS_REST_URL` triggers an automatic upgrade to distributed rate limiting), report-only CSP before enforcement, regression-test guards on subtle correctness bugs (the `Permissions-Policy` double-quote regression has a dedicated test).

### Stage 3 — RAG chatbot Phase 1 (April 24 – 25, 2026, ~50 commits)

Replaced the keyword `searchProducts` tool with a full RAG pipeline. Shipped behind a feature flag (`RAG_ENABLED`) so the existing keyword agent remained the safe default until cutover.

The work was scoped tight up-front: a [design spec](./superpowers/specs/2026-04-24-rag-chatbot-design.md) (~500 lines) approved before any code was written, plus an implementation plan, plus [ADR-0005](./adr/0005-rag-stack-choice.md) capturing the stack-choice tradeoffs.

**The build sequence (commit-by-commit, condensed):**

1. **Vendor scaffolding** — added `@pinecone-database/pinecone`, `cohere-ai`, `@upstash/qstash`. Added `RAG_ENABLED` feature flag (default off) and seven new env vars in `.env.example`.
2. **Embedding adapter** — `lib/ai/rag/embed.ts`. Started on Voyage SDK; **discovered an ESM packaging bug; switched to direct fetch**; later swapped to **Pinecone Inference** for one-vendor consolidation (recorded as ADR-0005 amendment).
3. **Vector-store adapter** — `lib/ai/rag/store.ts`. Single-file Pinecone wrapper. Hybrid query interface keeps `sparseVector` optional so Phase 1.5 (sparse hybrid via `pinecone-text`, currently Python-only) is purely additive.
4. **Reranker adapter** — `lib/ai/rag/rerank.ts`. **Skipped automatically when `COHERE_API_KEY` missing** — the pipeline preserves Pinecone's native similarity scores and degrades by an estimated ~10–15% rather than failing.
5. **Token estimator** — `lib/ai/rag/tokens.ts`.
6. **`formatToolResult`** — `lib/ai/rag/format.ts`. **Hard token caps per tool** (semanticSearch ≤ 1200, getProductDetails ≤ 500, etc.). Truncated results emit an explicit `"(N more available — refine with: ...)"` sentinel so the agent learns to refine instead of bloating context.
7. **Hierarchical chunker** — `lib/ai/rag/indexer/chunk.ts`. Each product becomes 4 base chunks (parent / description / specs / care) + N synthetic Q&A chunks.
8. **Synthetic Q&A generator** — `lib/ai/rag/indexer/synthetic-qa.ts`. Haiku-via-AI-Gateway generates 5 plausible customer questions per product at index time. Document expansion is the single biggest recall lever.
9. **Indexer orchestrator** — `lib/ai/rag/indexer/index-product.ts`. Pure function over `(product) → chunks → embeddings → upserts`.
10. **Bulk reindex CLI** — `tools/reindex-rag.ts`. `pnpm reindex:rag --all` for initial seed and disaster recovery.
11. **Sanity webhook → QStash enqueue** — `app/api/webhooks/sanity-rag/route.ts`. HMAC-verified, debounces on `_rev`.
12. **QStash worker route** — `app/api/jobs/reindex-product/route.ts`. Verified signature, idempotency key `${_id}:${_rev}`, at-least-once delivery.
13. **Query understanding stage** — `lib/ai/rag/query/understand.ts`. Haiku-driven conversational rewrite + filter extraction (`{ maxPrice: 400, color: "oak" }`) + conditional HyDE for short queries.
14. **Retrieve stage** — `lib/ai/rag/query/retrieve.ts`. Pre-filter on metadata, then hybrid Pinecone query.
15. **Rerank + dedupe pipeline wrapper** — Cohere reranks top-30 → dedupe by `product_id` → top-5 to LLM.
16. **Pipeline output formatter** — `lib/ai/rag/query/format.ts`.
17. **Three new tools** — `getProductDetails` (authoritative truth, mandatory before quoting any number), `filterSearch` (renamed from `searchProducts`), `semanticSearch` (full pipeline + hydrate helper).
18. **Wired the agent** — `lib/ai/shopping-agent.ts` reads `RAG_ENABLED` and exposes the new tool surface; legacy `searchProducts` is fully removed when RAG is on, eliminating a price/dimensions/stock leak path.
19. **Context Manager into chat route** — `app/api/chat/route.ts`. Per-turn token budget (32 K hard, 16 K soft warn), Haiku-driven sliding-window compaction with a prompt that **explicitly preserves "user constraints, preferences, and named entities verbatim"** — guards against losing load-bearing details ("for my mother who has back pain") in long conversations.
20. **Fresh-start button** — manual reset surfaced in chat header after ≥10 turns.
21. **Eval datasets** — `tests/rag/golden.json`, `multi-turn.json`, `adversarial.json` (~100 cases each, hand-curated).
22. **Eval harness** — `tools/rag-eval.ts` computes recall@k, MRR, NDCG. Gated behind `RAG_LIVE_TESTS=1` so it doesn't fire on every PR.
23. **Marathon spec** — `tests/rag/marathon.spec.ts`. 30-turn synthetic conversation that exercises 2+ compaction events. Asserts that intent stated at turn 2 still informs turn 28.
24. **Adversarial spec** — `tests/rag/adversarial.spec.ts`. ~50 prompt-injection patterns from the OWASP LLM Top 10, PII solicitation, out-of-catalog ("do you sell mattresses?"), SKU-as-query, multilingual, 4 K-char queries.
25. **k6 load profile** — `tests/load/rag-pipeline.k6.js`. 100 VU × 10 min, p95 < 2 s gate, error rate < 0.5%.
26. **Cold-start warm-up probe** — every 4 minutes against the popular-products namespace to keep Pinecone Serverless warm.
27. **Tightening pass** — sanitize extracted filters with zod bounds, replace fabricated golden-set IDs with **real catalog IDs** (cross-checked via `tools/list-products.ts`), tolerate first-time 404 on `deleteByProductId`, swap embedding backend to Pinecone Inference.
28. **Merge to master** as `597ce5a`. Pre-cutover state tagged `pre-rag` for one-command revert.

**Cutover and same-day production deploy** via `vercel --prod`.

### Stage 4 — Same-day senior-SWE audit (April 25, 2026, 1 commit, 5 critical fixes)

Within hours of merging, ran a senior-SWE-style audit of the freshly shipped code. **Surfaced five critical defects plus several high-severity ones.** All were fixed in the same session with regression tests, captured in commit `4472977`:

| # | Bug | Fix |
|---|---|---|
| **C1** | Compactor dropped the **current user turn** when assembling messages (off-by-one in `lib/ai/rag/context.ts`) | Position-encoded test added; current turn now always preserved |
| **C2** | `Number(env ?? "default")` zeroed token caps when env was set to empty string (`Number("") === 0`), 500-ing every request | Switched to `\|\|` so empty strings fall back to default. Inline comment in `app/api/chat/route.ts:24-28` documents the trap |
| **C3** | Cohere reranker was being fed **chunk IDs, not chunk text** — reranker scored on string lengths, not document content | Persist `text` on `ChunkMetadata`; reranker reads it. Old vectors without `text` get a graceful fallback path |
| **C4** | Legacy `searchProducts` coexisted with new RAG tools when `RAG_ENABLED=true`, **leaking price/dimensions/stock** through the unguarded path | Old tool removed when RAG is on; `filterSearch` becomes a real stripped-payload impl; system prompt overridden in RAG mode |
| **C5** | `formatToolResult` no-arrayKey path didn't enforce the token cap (caps applied only to the array path) | Cap applied to both paths; regression test |

Plus high-severity fixes:
- **H5** — `assembleContext` failure now caught and falls back to the raw 12-message tail; would previously 500 mid-conversation
- **H6** — `rag.turn.input_tokens` and `rag.compaction.triggered` PostHog events are now emitted (spec §8 observability requirement was not yet wired)

After fixes: typecheck clean, **127 tests passing** (up from 113), no regressions, **+11 new tests** including the position-encoded compactor regression test.

**Carry-forward (honestly tracked, not yet shipped):**
- H1 vendor timeouts, H2 Sanity webhook timing-safe compare, H3 404→200 on deleted product, H4 Pinecone outage fallback in semantic-search, H7 Edge Config namespace pointer (currently env-var), H8 Upstash init failure observability, H10 input guardrails

**Why this stage matters most.** The post-merge audit is the strongest engineering-maturity signal in the project. Five critical defects in freshly shipped code is normal; **what matters is finding them within hours of merge, fixing the root cause not the symptom, adding regression tests, and writing down everything that's still open.** The fixes are visible in the current code: `app/api/chat/route.ts:25-28` has the C2 inline comment; `lib/ai/rag/store.ts:28-36` has the C3 comment explaining why `text` is persisted on `ChunkMetadata`.

### Stage 5 — RAG Phase 1.6: telemetry + faithfulness gate (April 27–28, 2026, 17 of 18 tasks shipped)

Phase 1 left two named gaps: no per-query observability into what retrieval picked, and no automated way to detect answer hallucinations. Phase 1.6 closes both. [Spec](./superpowers/specs/2026-04-27-rag-telemetry-faithfulness-design.md), [plan](./superpowers/plans/2026-04-28-rag-phase-1-6-implementation.md).

**Build sequence (each task its own commit, TDD throughout):**

1. **Trace recorder** (`lib/ai/rag/trace.ts`) — one structured `RetrievalTrace` per `semanticSearch` call, captured at every stage (query/understand/retrieve/rerank/picked + optional error). Three sinks: stdout (Vercel Logs in prod), PostHog event `rag.retrieval.completed` (free tier, reuses Phase 1's `captureServerEvent` plumbing), and opt-in `.tmp/rag-traces.jsonl` via `RAG_TRACE_FILE=1` with rotation at 5 MB.
2. **PII redactor** (`lib/monitoring`) — emails + phone-like patterns scrubbed before traces emit.
3. **`pnpm trace:tail` CLI** — local-only inspection of `.tmp/rag-traces.jsonl` with `--bucket` / `--since` filters.
4. **Heuristic faithfulness checker** (`lib/ai/rag/faithfulness.ts`) — regex + catalog-vocab matching for price / dimension / material / color / name / stock / shipping claims. Zero recurring cost. LLM-as-judge upgrade is a one-line `FAITHFULNESS_BACKEND=llm` flag flip; the LLM path ships as a typed stub so the env switch fails fast and visibly if flipped prematurely.
5. **Eval harness extended** (`tools/rag-eval.ts`) — drives the agent via a non-streaming `runAgentTurn` extracted from Phase 1's streaming chat route. Adds faithfulness gate (≥ 0.85), per-bucket rollup, `--yes` cost banner. **On-demand only** (`pnpm eval:rag`) — Phase 1's nightly + PR-gated CI was walked back because the cost-discipline win (~$0.15/run, only when actually evaluating) outweighed the catch-bugs-on-PR loss for a portfolio project.
6. **Golden set grew 15 → 50** across 7 buckets — synonym (10), multi-constraint (10), vague-style (5), out-of-vocabulary (5), ambiguous-routing (5). **Every product ID grounded in the live Sanity catalog via MCP query** — same fabricated-ID risk as the Phase 1 incident (commit `db77678`) doesn't repeat.
7. **CI hygiene** — dropped `eval-rag.yml`; amended the Phase 1 spec to match shipped reality (LLM-judge ship gate walked back to 0.85 heuristic floor; turn-level token *alerts* deferred to Phase 1.7 — note: the events themselves shipped in Phase 1, only alerts are deferred).
8. **Pre-rollback git tag `pre-phase-1-6`** set before T1.

**Cost-free verification path (`pnpm verify:rag`).** When credits aren't available — and they weren't, mid-implementation, due to a Vercel AI Gateway free-tier abuse block — the eval harness can't run. Wrote `tools/verify-phase-1-6.ts` to drive the **real** Pinecone + Cohere pipeline with a stub query-understanding function so traces get emitted, faithfulness scoring runs over real catalog text, and code paths are exercised end-to-end at $0. Surfaces a per-claim score / supported / unsupported / reasoning block. The verification doubles as a CI candidate for non-credit-burning regression coverage.

**Two real bugs the verification surfaced and fixed (TDD):**

- **Price heuristic substring false-positive** — `$99.99` was scoring as supported when haystack contained `$179.99` because the prior code stripped cents and used plain substring (`"99"` is in `"179"`). [Commit `5700a07`](../commit/5700a07): canonical-form match (integer + optional `.NN`) with non-digit/non-dot lookbehind. The hallucinate-case score in `pnpm verify:rag` correctly dropped 0.50 → 0.25 after the fix.
- **Dim heuristic same class** — `45 cm` was matching inside `245 cm` for the same reason. [Commit `36c22b3`](../commit/36c22b3): same boundary fix applied. Not observed in production runs; surfaced by code review while in the same area.

**Production reindex (2026-04-28).** Discovered during verification that the production Pinecone namespace predated the 2026-04-25 C3 fix that puts chunk text in `metadata.text` — every retrieved candidate's `text` field was the placeholder `${chunkType}:${id}`. Added `pnpm reindex:rag --no-qa` flag (skips the Haiku-backed synthetic-Q&A pass) so chunk text could be refreshed at $0. Ran on all 57 products, 0 failures. Faithfulness on the truthful verify case immediately rose 0.000 → 0.750. Synthetic-Q&A chunks will backfill on the next full re-index.

**Honest carry-forward.** T10 smoke run + T18 baseline-appendix paste **remain pending** on the gateway free-tier abuse block. The first eval trace fires clean (proving infra is correct); the agent's Sonnet hop returns 429. Resolution is paid credits. Documented in CHANGELOG with the exact unblock command (`pnpm eval:rag --yes`).

**Why this stage matters.** Phase 1.6 is the discipline of going back to close named gaps instead of moving on to the next feature. The cost-free verify path, the reindex `--no-qa` flag, and the two heuristic substring fixes were all reactions to the gateway block — they wouldn't have existed if credits had been there. Constraint-driven engineering produces broader infra than the original spec asked for.

---

## 4. Architecture: the RAG layer

The pipeline is six isolated units. Each has one purpose, a typed interface, and is independently testable. **No unit knows the implementation details of another** — vendor swaps mean editing one file plus an env var.

### The six units

| Unit | Path | Owns |
|---|---|---|
| **Catalog Indexer** | `lib/ai/rag/indexer/` | chunk → embed → upsert. Webhook handler + bulk CLI. |
| **Embedding Adapter** | `lib/ai/rag/embed.ts` | Single function `embed(texts: string[]) => number[][]`. Currently Pinecone Inference. |
| **Vector Store Adapter** | `lib/ai/rag/store.ts` | Hybrid query, upsert, delete, namespace pointer. Pinecone-specific. |
| **Reranker Adapter** | `lib/ai/rag/rerank.ts` | Cohere Rerank 3.5. Auto-skip when key missing. |
| **Query Pipeline** | `lib/ai/rag/query/` | Pure functions: `understand → retrieve → rerank → format`. Knows nothing about the LLM. |
| **Context Manager** | `lib/ai/rag/context.ts` | Pure `(messages[], budget) => messages[]`. Compaction, sliding window, token estimation. |

### Read path (one query, end-to-end)

Example: *"something cozy for a small reading corner under $400, in oak tones"* — turn 5 of a conversation.

```
[0] Context Manager
    ├── estimate input tokens for this turn
    ├── if projected > 32 K → invoke Haiku compaction (~150 ms)
    └── assemble messages: cached prefix + compacted history + current turn   (~5 ms)

[1] Heuristic router
    └── price token detected → route to semanticSearch                         (~1 ms)

[2] Haiku query understanding (parallel internal steps)
    ├── conversational rewrite (resolve "the blue one" using last 3 turns)
    ├── filter extraction → { maxPrice: 400, color: "oak", inStock: true }
    └── conditional HyDE: short query → generate hypothetical product blurb    (~300 ms)

[3] Cache check (Upstash semantic cache)
    └── embed rewritten query → cosine vs last-hour cache; ≥0.97 = hit         (~80 ms miss)

[4] Pre-filter + Pinecone hybrid query
    ├── metadata filter applied first (in_stock=true AND price<=400 AND ships_to=AU)
    ├── hybrid: dense vector + (Phase 1.5) sparse BM25
    └── top 30 returned                                                         (~30 ms)

[5] Cohere Rerank 3.5
    └── input: original query + top-30 chunk text → scored top-10              (~600 ms)

[6] Format
    ├── deduplicate by product_id (a product may appear via multiple chunks)
    ├── take top-5 product_ids
    ├── fetch authoritative details from product cache
    └── emit structured tool result (≤ 1200 tokens total)                       (~20 ms)

[7] Sonnet 4.5 streams response with inline ProductCardWidgets                  (TTFT ~400 ms)
```

**Latency budget (cache miss, first token):** 5 + 1 + 300 + 80 + 30 + 600 + 20 + 400 ≈ **1.44 s**, comfortably under the 2.0 s gate.

**Latency budget (cache hit, first token):** 5 + 1 + 80 + 20 + 400 ≈ **0.51 s**.

### Write path (catalog updates)

```
Editor publishes Product in Sanity Studio
        ↓
Sanity webhook → POST /api/webhooks/sanity-rag (HMAC-verified)
        ↓
Enqueue to Upstash QStash with idempotency key = ${_id}:${_rev}
        ↓
QStash delivers → POST /api/jobs/reindex-product
        ↓
[1] Fetch product from Sanity (writeClient — bypass CDN for freshness)
[2] Build 4 base chunks (parent + description + specs + care) + 5 synthetic Q&A
[3] Embed all chunks via Pinecone Inference in one batch
[4] Upsert to Pinecone with full metadata payload (text included for reranker)
[5] Bump per-product version in Redis → invalidates product-detail cache
[6] Emit reindex-success event to monitoring
```

Idempotency key on `_rev` means rapid edits within the QStash retry window dedupe cleanly. Failure modes (Pinecone down, Cohere down, Voyage outage if we swap back) all have rollback strategies in [ADR-0005](./adr/0005-rag-stack-choice.md) and [the spec](./superpowers/specs/2026-04-24-rag-chatbot-design.md) §12.

### Why single-file adapters

`lib/ai/rag/{embed,store,rerank}.ts` are vendor-isolated. The original spec picked Voyage for embeddings; **mid-implementation, a Voyage SDK ESM packaging bug forced a swap.** The replacement (Pinecone Inference) was a one-file change plus an env var. That swap is now codified in [ADR-0005's decision-revision section](./adr/0005-rag-stack-choice.md), and the migration path *back* to Voyage if quality regresses is documented as ~2 hours.

This is the architectural payoff of the boundary discipline: when reality doesn't match your spec, a one-file edit beats a refactor.

---

## 5. Decisions and tradeoffs

The decisions table below names every non-obvious pick, what was rejected, and why. Full versions live in `docs/adr/`.

| Layer | Pick | Rejected | Rationale |
|---|---|---|---|
| **Vector store** | Pinecone Serverless | Turbopuffer (~5× cheaper, newer); Sanity native semantic (10-chunk cap, opaque); pgvector via Neon (forces new primary DB); Upstash Vector (no production reranker) | Vercel Marketplace integration auto-injects env vars; native sparse-dense hybrid in one query; sub-10 ms p50; ~5 yrs production maturity. Cost is irrelevant at low-thousands of vectors. |
| **Embeddings** | Pinecone Inference (`multilingual-e5-large` @ 1024d) | Voyage `voyage-3-large` (original pick — ESM SDK bug + extra vendor); OpenAI text-embedding-3-large (no advantage); Cohere embed-v4 (multilingual edge unneeded) | One-vendor consolidation; same dim as the rejected Voyage pick so swap-back is a re-index, not a schema change. Quality bar met on furniture-style retrieval; rerank closes the gap. |
| **Reranker** | Cohere Rerank 3.5 | Voyage Rerank 2.5; LLM-as-reranker | Longest production track record; ~30% precision lift; ~600 ms p50. **Optional in our pipeline** — auto-skipped when `COHERE_API_KEY` missing; preserves Pinecone scores. Quality drops ~10–15% but stays above the recall@5 ≥ 0.85 gate. |
| **Reindex pipeline** | Sanity webhook → QStash → worker | Direct synchronous reindex; cron polling | At-least-once delivery, exponential backoff retries, idempotency on `_rev`. Already paying for Upstash. |
| **Context discipline** | Per-tool token caps + per-turn 32 K hard cap + sliding-window compaction | Naive RAG (full history every turn); LLM long-context only | RAG amplifies context bloat: 5 products × 200 tokens = 1 KB *per turn*. By turn 8–10 a furniture conversation is 15–20 K input tokens. Hard caps force the agent to refine instead of bloat. |
| **Cart state** | Zustand + localStorage | Cart API + DB writes per click | Stock validation only at checkout; no DB write amplification. Cart hits the server only at the Stripe session creation step. ADR-0003. |
| **Order creation** | Stripe webhook only | Optimistic write at checkout | Orders cannot exist without payment confirmation. Atomic stock decrement happens after `payment_intent.succeeded`. ADR-0001. |
| **Rate limiting** | In-memory sliding-window with auto-upgrade to Upstash | Always-distributed | Hobbyist Hobby plan handles in-memory fine; auto-detects `UPSTASH_REDIS_REST_URL` and silently upgrades. Zero code change to promote. ADR-0004. |
| **Lint + format** | Biome | ESLint + Prettier | Single tool, ~70 ms full-repo check, 262 files. Less config sprawl. |
| **Eval framework** | Custom Vitest harness, 200-query golden set | Ragas SaaS, Braintrust, LangFuse | ~150 LOC. Avoids premature SaaS dependency. Ports to a platform later if eval volume justifies it. |
| **Stress testing** | k6 in GitHub Actions | Locust, custom Node load harness | JS-native, free Grafana Cloud tier, gates release on tagged commits only (cost). |
| **Observability** | AI Gateway logs + PostHog + custom monitoring abstraction | Sentry / Datadog from day one | Use what's paid for. Vendor-neutral `lib/monitoring/` exposes `captureException` / `captureMessage` / `withMonitoring` — swap implementation in one file when scale justifies. |
| **CSP** | Report-only first, then enforcing | Blocking from day one | Sanity Studio, Clerk, Stripe, AI Gateway iframes break under blocking CSP. Report-only collects violations in browser console first. |

---

## 6. Quality signals (the evidence)

### RAG eval (production data, post-merge)

15-query golden set against **real catalog product IDs** (the original synthetic set was caught and replaced — see commit `db77678`):

| Metric | Result | Bar to ship |
|---|---|---|
| recall@5 | **1.000** | ≥ 0.85 |
| MRR | **1.000** | — |
| NDCG@10 | **0.995** | — |

Gate is enforced via `pnpm eval:rag`; CI blocks merge on recall@5 drop > 2% (when running in `RAG_LIVE_TESTS=1` mode).

### Test coverage

```
30 test files, 142 total tests (127 passing, 15 skipped — gated live tests)

Non-RAG unit tests (45 tests across 5 files):
  cart-store.test.ts                  11 tests
  json-extract.test.ts                13 tests  (LLM preamble, escapes, nested braces)
  rate-limit.test.ts                  10 tests  (bucket isolation, eviction, rollover)
  monitoring.test.ts                   6 tests  (credential redaction)
  use-cart-stock.test.ts               5 tests  (debounce + AbortController cancellation)

RAG unit tests (82 tests across 22 files in tests/unit/rag/):
  Adapters & primitives    embed (5), store (4), rerank (3), format (5), tokens (4),
                           flags (4), chunk (5), context (4)
  Pipeline stages          understand (3), retrieve (3), query-rerank (3),
                           query-format (2), semantic-search (7)
  Indexer                  synthetic-qa (3), index-product (5)
  Tools                    filter-search (4), get-product-details (3), agent-wiring (3)
  Integration / route      chat-route-context (4), webhook (3), job-reindex (2)
  Component                fresh-start-button.test.tsx (3)

E2E (Playwright, env-gated tests/e2e/):
  homepage / cart drawer / static pages / security-header contract

Live RAG suites (gated behind RAG_LIVE_TESTS=1, 15 skipped by default):
  rag/eval.spec.ts        (1 scenario,  recall/MRR/NDCG vs golden set)
  rag/marathon.spec.ts    (4 scenarios, 30-turn compaction + needle-in-history)
  rag/adversarial.spec.ts (10 scenarios, injection / PII / OOC / typo / SKU-as-query)

Load (k6, tagged-release only):
  rag-pipeline.k6.js       100 VU × 10 min, p95 < 2 s gate
```

### CI gates

`.github/workflows/ci.yml` runs on every push and PR:

```
pnpm typecheck   # strict TypeScript, exit 0 required
pnpm lint        # Biome, exit 0 required across 262 files
pnpm test        # Vitest, all unit + component + route tests
pnpm build       # Next.js production build with stubbed env
```

Concurrency groups cancel superseded runs. Build env vars are stubbed so the production build validates without real secrets.

### Security headers

Set at the Next.js edge in [`next.config.ts`](../next.config.ts):

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://js.stripe.com")` |
| `X-DNS-Prefetch-Control` | `on` |
| `Content-Security-Policy-Report-Only` | scoped allowlist for Sanity, Clerk, Stripe, AI Gateway, PostHog |

A dedicated e2e test guards against the **Permissions-Policy double-quote regression** (single quotes parse-fail silently in Structured Fields headers — the policy looks correct but does nothing).

### Observability

- `rag.turn.input_tokens` event per turn with the input-token count and a `compacted` boolean
- `rag.compaction.triggered` event when the Haiku compactor fires, with summary-present flag
- `lib/monitoring/captureException` redacts `token` / `secret` / `password` / `apikey` / `authorization` field names from context payloads before logging
- Alert thresholds defined: p95 turn input tokens > 24 K over 24 h; compaction failure rate > 1%

### Rollback strategy

Six git tags, each one-command revert:

```bash
git tag --list
# pre-audit-2026-04-20            ← before any audit work
# pre-hardening-v1                ← after perf audit
# production-hardening-v1         ← after v1 hardening
# pre-hardening-v2                ← before v2
# production-hardening-v2         ← after v2
# pre-rag                         ← before RAG cutover

git reset --hard pre-rag          # disable RAG entirely
```

Plus the **feature-flag rollback**: `vercel env rm RAG_ENABLED production && vercel env add RAG_ENABLED production --value "false" --yes && vercel --prod`. Falls back to the keyword agent in seconds without redeploying code.

---

## 7. What's deferred (honest carry-forward)

The post-merge audit also surfaced high-severity items that I scoped out of Phase 1 rather than pretending they were done. These are tracked, dated, and have a re-audit scheduled.

| ID | Description | Status |
|---|---|---|
| H1 | Vendor timeouts on Pinecone / Cohere / Haiku calls | Open |
| H2 | Sanity webhook signature uses string compare, not timing-safe compare | Open |
| H3 | `getProductDetails` returns 200 with stub on deleted product instead of 404 | Open |
| H4 | `semanticSearch` Pinecone-outage fallback isn't wired (currently throws) | Open |
| H7 | Edge Config namespace pointer (currently env-var; promotes safe-cutover to fully online) | Open |
| H8 | Upstash init failure observability | Open |
| H10 | Input guardrails (length, regex pre-filter for prompt-injection patterns) | Open |
| H9 | Warm-rag cron — **closed**: dropped because Vercel Hobby plan limits cron to daily-only |

A scheduled re-audit fires May 2, 2026 (`trig_01CkCofq1g4uvvPRMPYnzc3B`) to verify the C1–C5 fixes hold under the production eval and to triage the H-tier items.

**Phase 1.5** — sparse-vector hybrid retrieval. `pinecone-text` is Python-only; no JS port exists yet. The store adapter already keeps `sparseValues` optional in its interface so the upgrade is purely additive.

**Phase 2** — visual search via `voyage-multimodal-3.5`. Image-in / products-out tool, dual-index retrieval. Gets the Voyage relationship "for free" once Phase 2 starts.

**Phase 3** — personalisation. Recently-viewed bias in retrieval, cart-aware "complete the look" via triplet embeddings, optional cross-session memory.

---

## 8. Repo map

```
app/                                    Next.js App Router
  (app)/                                Customer-facing routes (~15 pages)
  (admin)/admin/                        Admin dashboard
  api/
    chat/route.ts                       AI chat endpoint (Context Manager + RAG)
    webhooks/
      stripe/route.ts                   Webhook-driven order creation
      sanity-rag/route.ts               Sanity → QStash enqueue
    jobs/reindex-product/route.ts       QStash worker (idempotent, signed)
    admin/insights/route.ts             Claude-generated sales insights
  studio/[[...tool]]/page.tsx           Embedded Sanity Studio at /studio

lib/
  ai/
    rag/
      embed.ts                          Pinecone Inference adapter
      store.ts                          Pinecone vector-store adapter
      rerank.ts                         Cohere Rerank 3.5 adapter (optional)
      context.ts                        Context Manager (compaction, budget)
      format.ts                         formatToolResult (hard token caps)
      tokens.ts                         Lightweight token estimator
      flags.ts                          RAG_ENABLED feature flag
      indexer/
        chunk.ts                        Hierarchical chunker
        synthetic-qa.ts                 Haiku Q&A generation
        index-product.ts                Orchestrator
      query/
        understand.ts                   Haiku rewrite + filter extraction + HyDE
        retrieve.ts                     Hybrid Pinecone query
        rerank.ts                       Cohere wrapper + dedupe
        format.ts                       Final formatting
    tools/
      semantic-search.ts                NEW (full pipeline)
      filter-search.ts                  Renamed from search-products
      get-product-details.ts            NEW (authoritative truth)
      add-to-cart.ts                    Existing
      get-my-orders.ts                  Existing (auth-only)
    shopping-agent.ts                   Agent factory (auth-aware tool surface)
    json-extract.ts                     Balanced-brace JSON parser
    rate-limit.ts                       Sliding-window (in-memory or Upstash)
  actions/                              Server Actions (checkout, search, newsletter)
  analytics/server.ts                   PostHog server capture
  monitoring/index.ts                   Vendor-neutral capture surface
  hooks/useCartStock.ts                 Stock-validation hook (O(1), debounced)
  store/                                Zustand stores (cart, chat, recently-viewed)

sanity/
  schemaTypes/                          Sanity document schemas
  lib/                                  Read + write client config

tests/
  unit/                                 Vitest unit tests
  unit/rag/                             RAG unit tests (19 files, 59 tests)
  rag/                                  Live eval / marathon / adversarial (gated)
  e2e/                                  Playwright e2e
  load/                                 k6 load profile

tools/
  rag-eval.ts                           Eval CLI (recall, MRR, NDCG)
  reindex-rag.ts                        Bulk reindex CLI
  smoke-{agent,rag,filters,understand}.ts   Smoke probes
  list-products.ts                      Catalog dump for golden-set IDs

docs/
  adr/                                  Architecture Decision Records (5)
  superpowers/specs/                    Design specs (production hardening, RAG)
  PORTFOLIO.md                          ← this document
```

---

## 9. How to run it

### Verification commands

```bash
pnpm install
pnpm typecheck                  # strict TypeScript — exit 0
pnpm lint                       # Biome — exit 0 across 262 files
pnpm test                       # Vitest — 127 passing
pnpm build                      # Next.js production build
pnpm test:e2e                   # Playwright (needs real Sanity / Clerk / Stripe creds)
pnpm test:rag                   # RAG_LIVE_TESTS=1 — runs eval / marathon / adversarial
pnpm eval:rag                   # CLI eval against the golden set
pnpm reindex:rag                # Bulk reindex from Sanity
```

### Local dev

```bash
cp .env.example .env.local      # Fill in Sanity / Clerk / Stripe / Pinecone / Cohere / AI Gateway
pnpm dev                        # http://localhost:3000
```

For local Stripe webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

---

## Appendix A — Live deployment

- **Production:** https://ecommerce-ai-platform-rho.vercel.app
- **Preview alias:** https://ecommerce-ai-platform-nevillezeng-4064s-projects.vercel.app

Cutover happened **2026-04-25 via `vercel --prod`** from feature branch `feat/rag-chatbot` (merged commit `597ce5a`). Pre-cutover state tagged `pre-rag` for one-command revert.

## Appendix B — A note on what's mine

The repo started from a Next.js + Sanity + Clerk + Stripe e-commerce reference scaffold. The branding, storefront design system (typography, dark mode, mega menu, product variant grouping, scroll animations), all production hardening (3 audit passes), the entire AI shopping assistant including the RAG layer, the eval / load / adversarial test suites, the architecture decision records, and the post-merge senior-SWE audit-and-fix sweep are my own work.

Roughly: Stages 2–4 (production hardening + RAG + post-audit fixes) are the bulk of the engineering and the part most worth scrutinising for hiring decisions. Stage 1 is a polished but more conventional storefront build on top of a reference scaffold.

## Appendix C — Commit chronology highlights

| Commit | Date | Significance |
|---|---|---|
| `b8c0eb6` | 2026-04-20 | Performance & robustness audit (data layer, API routes, hooks) |
| `7a3dd1f` | 2026-04-20 | Production hardening v1: tests, CI, security headers, ADRs |
| `fa816fc` | 2026-04-22 | Production hardening v2: e2e, Lighthouse, Upstash, PostHog |
| `46dd096` | 2026-04-24 | RAG chatbot design spec (~500 lines, approved before code) |
| `7028b73` | 2026-04-24 | RAG implementation plan |
| `018ef31` | 2026-04-24 | ADR-0005 documenting Pinecone + Voyage + Cohere stack choice |
| `0fab6b2` | 2026-04-24 | Voyage SDK ESM bug — replaced SDK with direct fetch |
| `ab271cf` | 2026-04-25 | Embedding backend swap to Pinecone Inference (one-file change) |
| `597ce5a` | 2026-04-25 | Phase 1 RAG merged to master + tagged `pre-rag` |
| `4472977` | 2026-04-25 | **Post-audit P0–P3 sweep + finalize Phase 1 (the senior moment)** |
