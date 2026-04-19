# Semantic Product Search — Design

**Date:** 2026-04-20
**Status:** Approved (pending user spec review)
**Related:** ADR-0001 (webhook ordering), ADR-0004 (in-memory rate limits)

## Goal

Replace vibes-based furniture discovery ("cozy nook for a studio apartment") with embeddings-backed semantic search, backed by a published **recall@5** benchmark and a **k6 stress-test report**. Existing keyword/filter search on category pages stays — it solves a different problem (hard filters by material/color/price).

Bundled: the polish pass from the 2026-04-20 portfolio review.

## Architecture

```
Sanity publish webhook ─▶ /api/sanity/reindex ─▶ AI Gateway embed ─▶ Upstash Vector upsert
                                                                        │
User query ─▶ /api/search ─▶ AI Gateway embed ─▶ Upstash Vector topK ───┤
                                                     │                  │
                                                     └─▶ Sanity hydrate ─▶ UI
```

**Why this stack:** `AI_GATEWAY_API_KEY` and `UPSTASH_REDIS_REST_*` are already wired. No new infra, no new secrets. Vercel-idiomatic.

**Why not Sanity's built-in Embeddings Index:** rolling our own pipeline demonstrates embedding choice, batching, eval, and stress testing — a stronger portfolio signal. Sanity's option is fine but hides the interesting decisions.

## Components

### 1. Embedding pipeline — `lib/search/embed.ts`
- `embedText(text: string): Promise<number[]>` — AI Gateway with `openai/text-embedding-3-small` (1536 dims).
- Product document text = `${name}\n${description}\n${category}\n${material}\n${color}`.
- Batch helper `embedBatch(texts: string[])` for backfill (max 50 per call).

### 2. Index management — `lib/search/index.ts`
- Backed by `@upstash/vector` (new dependency).
- API: `upsertProduct(product)`, `deleteProduct(id)`, `query(vec, topK, filter?)`.
- Namespace: `products`.
- Metadata on each vector: `{ _id, slug, category, price, stock, name }` — supports filter-by-metadata and avoids an extra Sanity roundtrip for display.

### 3. Backfill script — `tools/scripts/backfill-search-index.ts`
- Fetches all products from Sanity.
- Embeds + upserts in batches of 50.
- Idempotent: re-running is safe.
- Prints summary: `N products indexed in Ts, cost $X`.

### 4. Reindex webhook — `app/api/sanity/reindex/route.ts`
- Sanity webhook with HMAC signature verification (pattern from Stripe webhook).
- Events: `create`, `update` → re-embed + upsert. `delete` → remove from index.
- Idempotent; safe against replays.

### 5. Search endpoint — `app/api/search/route.ts`
- `GET /api/search?q=...&category=...&minPrice=...&maxPrice=...`
- Embeds query, calls `query(vec, topK=20, filter)`, hydrates full Sanity docs preserving vector order.
- Rate-limited via existing Upstash Ratelimit: **10 req/min/IP**.
- Returns `{ results: Product[], latencyMs, method: "semantic" }`.

### 6. Search UI — `app/(app)/search/page.tsx`
- Standalone `/search?q=...` page.
- Results grid reusing existing `ProductCard`.
- Each card shows a "Why this match" hint (top-matching facet: name/description/category match).
- Empty state: 3 suggested qualitative queries ("for a small apartment", "kids' room that'll last", "mid-century feel").

### 7. Agent integration — `lib/ai/tools/semantic-search.ts`
- New `semanticSearchTool` alongside existing `searchProductsTool`.
- Agent system prompt updated with guidance: semantic for qualitative queries, filter-based for hard constraints. Both can be called in the same turn.

### 8. Eval harness — `tests/search-eval/`
- `queries.json` — 30 hand-labeled queries: `{ query, relevantIds: string[] }`.
- `eval.ts` — runs queries, computes **recall@5** and **MRR**, writes `results-<timestamp>.json`.
- `npm run eval:search` — local run. `npm run eval:search:promote` overwrites `baseline.json` with the latest result (separate, explicit command).
- README publishes numbers: *"semantic recall@5: 0.82; keyword baseline: 0.47."*
- **CI job** — runs eval on PR. Fails if recall@5 drops > 5% from `baseline.json`.

### 9. Stress testing — `tests/load/` (NEW — added per user)
- **Tool:** k6 (standalone binary, JS-scripted, industry standard).
- **Scripts:**
  - `search.k6.js` — `/api/search` under load
  - `chat.k6.js` — `/api/chat` (ensure no regression)
  - `catalog.k6.js` — `/products` SSR/ISR path
- **Scenarios per script:**
  1. **Baseline** — 10 VUs × 60s steady. Assert no 5xx, P95 target met.
  2. **Ramp** — 0 → 100 VUs over 2 min, hold 2 min. Finds the knee.
  3. **Spike** — sudden 200 VUs for 30s. Verifies rate limiter returns clean 429s (no 5xx) and the app recovers within 10s after spike ends.
- **Assertions (thresholds in k6):**
  - `/api/search`: P95 < 500ms at sustained 50 RPS, error rate < 1%
  - `/api/chat`: P95 < 3s (LLM-bound), error rate < 2%
  - `/products`: P95 < 200ms (ISR cached), error rate < 0.5%
  - Under spike: 429 rate between 20%–80% (proves rate limiter engaged), 5xx rate < 0.1%
- **Backfill stress:** separate test — index 1000 synthetic products, assert completes < 90s and AI Gateway embed cost stays < $0.05.
- **Deliverables:**
  - Scripts committed under `tests/load/`
  - `tests/load/README.md` — how to run, what the targets mean
  - `tests/load/results/2026-04-XX.json` — committed k6 JSON summary from the canonical run
  - README section: perf report table (RPS / P50 / P95 / P99 / error rate for each scenario)
- **CI:** runs baseline scenario only on PRs touching `app/api/**` or `lib/search/**`. Full suite is `npm run load:full`, gated behind env flag for cost/time.

### 10. Polish pass (bundled)
- Replace `LICENSE.md` with MIT text
- Add `sanity.types.ts` to `.gitignore`, regenerate in CI, commit removal
- Delete `package-lock.json` (pnpm is sole lockfile)
- Remove unused PostHog scaffolding (until there's real need — easier to re-add than maintain dead code)
- Fix the 6 `any` types in `lib/ai/shopping-agent.ts` and related
- Add `SECURITY.md` covering auth boundaries, rate limits, webhook verification, reporting

## Data flow

**Write path (product publish → searchable):**
1. Editor publishes product in Sanity Studio.
2. Sanity webhook fires → `/api/sanity/reindex`.
3. Handler verifies HMAC, fetches full doc, builds embed text, calls AI Gateway.
4. Upserts vector + metadata to Upstash Vector namespace `products`.
5. ACKs webhook; failures trigger Sanity's exponential retry.

**Read path (user search → results):**
1. User submits `/search?q=cozy dorm desk`.
2. Server embeds query via AI Gateway.
3. Upstash Vector returns top 20 vector IDs + metadata.
4. Server hydrates full Sanity docs via `_id in $ids` GROQ query, then reorders the result array client-side to match the vector ranking (Sanity returns docs in document order, not query order).
5. Renders results with "why this match" hints.

## Error handling

- **Embedding API failure:** 503 to client with retry-after header; logs include request ID.
- **Upstash Vector unavailable:** fall back to existing keyword search (`AI_SEARCH_PRODUCTS_QUERY`) with a `method: "keyword_fallback"` flag in response so UI can hint at degraded quality.
- **Partial backfill failure:** script logs which IDs failed, exits non-zero; idempotent re-run fixes.
- **Webhook replay:** idempotent upsert — same product re-indexed is a no-op for correctness.
- **Stock changes only:** don't re-embed (metadata-only patch via `upsertProductMetadata`).

## Testing

| Layer | Approach |
|---|---|
| Unit | `lib/search/embed.ts`, `lib/search/index.ts` with mocked SDKs |
| Contract | Webhook handler with HMAC fixture (valid + tampered) |
| Integration | `npm run eval:search` against real Upstash (sandbox namespace) in CI |
| E2E | Playwright: search page renders results for a known query |
| Load | k6 baseline/ramp/spike — see §9 |
| Regression | Eval recall@5 can't drop > 5% from baseline |

## Out of scope (YAGNI)

- Cross-encoder re-ranking (overkill at this catalog size)
- Personalized/user-scoped search (adds auth complexity, no portfolio story)
- Typeahead/autocomplete (nice, but not worth the JS weight here)
- Image-based search (separate upgrade option)
- Multi-language embeddings

## Success criteria

- `/search?q=...` returns semantically ranked results; P95 < 500ms at 50 RPS (proven by k6)
- Published eval numbers in README with methodology
- Published perf report in README with k6 output
- Agent picks semantic tool for qualitative queries (verified in eval)
- All 6 polish items landed
- Two new env vars: `UPSTASH_VECTOR_REST_URL` + `UPSTASH_VECTOR_REST_TOKEN` (Upstash Vector is a separate product from the Redis we already use; free tier covers this project). Added to `.env.example` with comment.

## Estimated effort

- Feature + eval: 8–12 hrs
- Stress testing: 3–4 hrs
- Polish pass: 2 hrs
- **Total: ~1 long weekend**

## Follow-ups (out of this spec)

- OpenTelemetry tracing across embed → search → hydrate
- Hybrid search (weighted combination of semantic + keyword scores)
- User-personalized ranking based on browse history
- Background re-embed job when the embedding model is upgraded
