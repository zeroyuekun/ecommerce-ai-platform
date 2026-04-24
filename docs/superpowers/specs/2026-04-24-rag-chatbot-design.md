# RAG Chatbot — Design

**Status:** Approved 2026-04-24
**Author:** Claude (Opus 4.7), in collaboration with Neville Zeng
**Scope:** Phase 1 — text-only retrieval-augmented generation layer for the existing AI shopping assistant
**Successor specs:** Phase 2 (visual search), Phase 3 (personalisation) — out of scope here

---

## 1. Goal & success criteria

Replace the existing chatbot's keyword-only `searchProducts` tool with a production-grade retrieval-augmented generation (RAG) layer. The new layer must understand semantic intent ("cozy reading nook", "minimalist Japandi for a 12 m² bedroom"), respect hard constraints (in-stock, price, dimensions, ships-to-AU), ground every spec/price/stock answer in tool-call truth (not in retrieved marketing prose), and degrade gracefully under adversarial input and long conversations.

The existing storefront keyword search is unchanged. The chat UI shell, image upload flow, and tool-result widgets are unchanged. The RAG layer is additive at the agent level.

### Bar to ship

| Metric | Target | Measured by |
|---|---|---|
| recall@5 on golden set | ≥ 0.85 | `pnpm test:rag` (CI nightly + on PR) |
| Faithfulness (LLM-judge) | ≥ 0.90 | same |
| p95 first-token latency | < 2.0 s | k6 load test + AI Gateway logs |
| p95 end-to-end response | < 3.5 s | same |
| Cost per query | ≤ $0.02 | nightly budget assertion |
| Per-turn input tokens | ≤ 32,000 (hard cap) | Context Manager + PostHog dashboard |
| Faithfulness degradation across 15-turn dialogue | ≤ 5% (turn 1 vs turn 15) | multi-turn eval bucket |
| Net-new prompt-injection / PII vectors | 0 | adversarial suite |

### Non-goals

- No image / visual retrieval (Phase 2)
- No personalisation, recently-viewed bias, or cross-session memory (Phase 3)
- No fine-tuned embedding model (off-the-shelf only until ≥ 3 months of click data)
- No replacement of the storefront search bar
- No UI redesign

---

## 2. Architecture

Six isolated units. Each has one purpose, a typed interface, and is independently testable. No unit knows the implementation details of another.

```
                    ┌─────────────────────────┐
 Sanity publish ──→  │ Catalog Indexer        │ ──→ Pinecone (sparse + dense)
                    │ (chunk · embed · upsert)│  ←── Voyage embeddings
                    └─────────────────────────┘
                              ▲ webhook (debounced via QStash)
                              │
 ┌──────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
 │ Chat UI  │  →   │ ToolLoopAgent           │  →   │ Query Pipeline       │
 │(existing)│      │ (Sonnet 4.5, AI Gateway)│      │ understand → retrieve│
 └──────────┘      │  ├── semanticSearch     │      │   → rerank → format  │
       │           │  ├── filterSearch       │      └──────────────────────┘
       │           │  ├── getProductDetails  │              │
       │           │  ├── addToCart          │              ▼
       │           │  └── getMyOrders        │      Upstash semantic cache
       │           └─────────────────────────┘      (cosine ≥ 0.97, 1 h TTL)
       │                     ▲
       │                     │
       └─────────────────────┴──→ Context Manager (token budget, compaction, fresh-start)
                                  Existing: rate-limit, auth, monitoring
```

| Unit | Path | Owns |
|---|---|---|
| **Catalog Indexer** | `lib/ai/rag/indexer/` | Pull product → chunk → embed → upsert. Webhook handler + manual reindex CLI. |
| **Embedding Adapter** | `lib/ai/rag/embed.ts` | Wraps Voyage; switchable via env. Single function `embed(texts: string[]) => number[][]`. |
| **Vector Store Adapter** | `lib/ai/rag/store.ts` | Wraps Pinecone; switchable via env. Hybrid query, upsert, delete, namespace pointer swap. |
| **Query Pipeline** | `lib/ai/rag/query/` | Pure functions: `understand(query, history) → understood`, `retrieve(understood) → candidates`, `rerank(candidates) → top5`, `format(top5) → toolResult`. |
| **Context Manager** | `lib/ai/rag/context.ts` | Token estimation, sliding-window + summary compaction, fresh-start heuristic, cache-aware message assembly. |
| **Tools** | `lib/ai/tools/` | New `semanticSearch`, `filterSearch` (renamed from `searchProducts`), `getProductDetails`. Existing `addToCart`, `getMyOrders` unchanged. |
| **Eval & Stress** | `tests/rag/`, `tools/rag-eval.ts`, `tests/load/` | Golden set, Vitest metrics harness, adversarial suite, k6 load profile. |

### Boundaries

- **Indexer ↔ Vector Store**: Indexer never embeds Pinecone-specific knowledge (namespace conventions live in the store adapter).
- **Query Pipeline ↔ Tools**: Pipeline returns structured candidates; the tool layer formats for the agent. Pipeline knows nothing about the LLM.
- **Context Manager ↔ Agent**: Pure function over `(messages[], budget) → messages[]`. Agent calls it once per turn; Context Manager has no I/O of its own except an optional Haiku call for compaction.
- **All external services accessed via single-file adapters** (`embed.ts`, `store.ts`, `rerank.ts`) so swapping vendors means editing one file plus an env var.

---

## 3. Stack — final picks

| Layer | Pick | Rationale (and what we rejected) |
|---|---|---|
| **Vector store** | **Pinecone Serverless** via Vercel Marketplace (`vercel integration add pinecone`) | Auto-injected env vars, native sparse-dense hybrid, single-stage filtering, sub-10 ms p50, ~5 yrs production maturity. Rejected Turbopuffer (newer, no Marketplace integration; ~5× cheaper but cost is irrelevant at this scale). Rejected pgvector via Neon (would force a new primary DB). Rejected Sanity native embeddings (10-chunk cap, opaque model, no version pinning, can't A/B). Rejected Upstash Vector (no production reranker story for ecommerce). |
| **Text embeddings** | **Voyage `voyage-3-large` @ 1024d, int8 quantization** | Anthropic's officially recommended embedding partner; tops MTEB; Matryoshka support means we can downsize without re-embedding; ~$0.18/1M tokens (full re-index of 5,000 products ≈ $0.45). Rejected OpenAI text-embedding-3-large (lazy default, no advantage given Claude stack). Rejected Cohere embed-v4 (slightly worse on MTEB; multilingual edge isn't needed yet). |
| **Reranker** | **Cohere Rerank 3.5** via direct API | ~600 ms p50, ~30% precision lift, longest production track record, available via Bedrock as fallback. Rejected Voyage Rerank 2.5 (single-vendor benefit is small; Cohere has more battle-testing). Rejected LLM-as-reranker (3-5× cost, 2-3× latency, no measurable quality win). |
| **Generation LLM** | **Claude Sonnet 4.5** via Vercel AI Gateway | No change from existing chatbot. |
| **Query understanding LLM** | **Claude Haiku 4.5** via AI Gateway | Cheap (~$0.001/call), 200-400 ms, structured outputs via AI SDK 6 `generateObject`. |
| **Adaptive routing** | **Rule-based heuristic** (regex/keyword) → semantic search vs filter search vs direct lookup | Transparent, debuggable, ~1 ms. Upgrade to learned classifier (TF-IDF/SVM) once we have ≥ 10k logged queries. |
| **Re-indexing pipeline** | Sanity webhook → Vercel route → **Upstash QStash** → background worker → Pinecone upsert. Idempotency key = `${_id}:${_rev}` | At-least-once delivery, exponential backoff retries, dedup. Already have Upstash. Debounce on `_rev` change only. |
| **Caching** | **Upstash Redis**: (a) semantic cache keyed on embedded rewritten query (cosine ≥ 0.97 = hit, 1 h TTL); (b) product-detail cache keyed on `productId` (5 min TTL, busted on Sanity webhook) | Already wired. 5-15% hit rate is realistic free latency. |
| **Eval framework** | **Custom Vitest harness** in `tests/rag/` over a 200-query golden set; Ragas-style metrics computed in-process | ~150 LOC. Avoids premature SaaS dependency. Braintrust/LangFuse deferred to v2 once eval volume justifies a platform. |
| **Stress testing** | **k6** in GitHub Actions + adversarial query suite in `tests/rag/adversarial.json` | Memory-efficient, JS-native, free Grafana Cloud tier. Gates release on p95 < 2 s and error rate < 0.5%. |
| **Observability** | **AI Gateway logs + PostHog (existing) + extended `lib/monitoring/`** to emit RAG trace events. Optional v2: LangFuse self-hosted. | Use what's already paid for. |
| **Guardrails** | 3-layer: **input** regex prompt-injection + Haiku abuse classifier; **retrieval** isolation (never embed user-provided text into the index); **output** zod-validated tool schemas + LLM only emits SKUs/prices/dimensions/stock that came from a tool call this turn | Defence-in-depth. No single layer is load-bearing. |

---

## 4. Read path (one query, end-to-end)

Example query: *"something cozy for a small reading corner under $400, in oak tones"* — turn 5 of an existing conversation.

```
[0] Context Manager
    ├── estimate input tokens for this turn
    ├── if projected > 32K → invoke compaction (Haiku, ~150 ms)
    └── assemble messages: cached prefix + compacted history + current turn
                                                                            (~5 ms in pure case)

[1] Heuristic router
    ├── price token detected → semantic + filter (not pure semantic)
    └── route: semanticSearch tool                                            (~1 ms)

[2] Haiku query understanding (parallel internal steps)
    ├── conversational rewrite (resolve "the blue one" using last 3 turns)
    ├── filter extraction → { maxPrice: 400, color: "oak", inStock: true }
    └── conditional HyDE: query is short → generate hypothetical product blurb
                                                                            (~300 ms)

[3] Cache check
    └── embed rewritten query → cosine vs last hour of cached queries
        if max ≥ 0.97 → return cached top-5, skip [4]–[6]                  (~80 ms when miss)

[4] Pre-filter + Pinecone hybrid query
    ├── metadata filter applied first: in_stock=true AND price<=400 AND ships_to=AU
    ├── hybrid: dense (Voyage embedding) + sparse (BM25)
    ├── RRF fusion (k=60), top 30 returned                                  (~30 ms)

[5] Cohere Rerank 3.5
    ├── input: original query + top-30 candidates (chunk text + product title)
    ├── output: scored top-10                                               (~600 ms)

[6] Format
    ├── deduplicate by product_id (a product may appear via multiple chunk types)
    ├── take top-5 product_ids
    ├── fetch authoritative product details (stock, price, image) from product cache
    └── emit structured tool result (JSON, ≤ 1200 tokens total)             (~20 ms)

[7] ToolLoopAgent emits result back to Sonnet 4.5
    └── streams response with inline ProductCardWidgets                    (TTFT ~400 ms)
```

**Latency budget (read path, cache miss, first token)**: 5 + 1 + 300 + 80 + 30 + 600 + 20 + 400 ≈ **1.44 s**. Comfortably under the 2.0 s target.

**Latency budget (cache hit, first token)**: 5 + 1 + 80 + 20 + 400 ≈ **0.51 s**.

---

## 5. Write path (catalog updates)

```
Editor publishes a Product in Sanity Studio
        │
        ▼
Sanity webhook → POST /api/webhooks/sanity-rag
        │  (HMAC-verified; signed by Sanity webhook secret)
        ▼
Enqueue to Upstash QStash with idempotency key = `${_id}:${_rev}`
        │  (dedupes if multiple rapid edits within QStash retry window)
        ▼
QStash delivers → POST /api/jobs/reindex-product
        │
        ▼
[1] Fetch full product from Sanity (writeClient — bypass CDN for freshness)
[2] Build chunks (see §6):
        ├── parent
        ├── description
        ├── specs
        ├── care
        └── 5 × qa_* (synthetic Q&A via Haiku, ~$0.001 per product)
[3] Embed all chunks via Voyage in a single batch call
[4] Upsert to Pinecone with full metadata payload
[5] Bump per-product version in Redis → invalidates product-detail cache
[6] Emit reindex-success event to monitoring
```

**Bulk re-index command**: `pnpm tsx tools/reindex-rag.ts [--all | --since=<iso-date> | --product=<slug>]` — used for the initial seed, model swaps, and disaster recovery.

**Double-buffer pattern** (for safe re-embeds across model versions): write to `products-v{N+1}` namespace; verify health (parity check against `products-vN` on a sample query set); flip the active-namespace pointer in Edge Config; keep `products-vN` for 24 h before cleanup.

---

## 6. Chunking — concrete spec

| Chunk type | Source | Approx. tokens | Embedded? | Purpose |
|---|---|---|---|---|
| `parent` | name + 1-line summary + category + price + key materials | 50-80 | yes (returned for retrieval ID) | Single anchor per product |
| `description` | full narrative description | 200-400 | yes | Aesthetic / use-case match |
| `specs` | materials + dimensions + assembly | 80-150 | yes | Spatial / material match |
| `care` | care instructions + warranty + shipping | 60-120 | yes | Policy / lifecycle queries |
| `qa_*` | 5 synthetic Q&A pairs generated by Haiku at index time | 40-100 each | yes | Document expansion — biggest single recall lever |

All chunk vectors carry these metadata fields (filterable in Pinecone): `product_id`, `chunk_type`, `category_slug`, `material`, `color`, `price`, `in_stock`, `ships_to_au`, `is_new`, `assembly_required`.

Rerank deduplicates by `product_id` so a product never appears twice in the LLM context, even if multiple of its chunks scored well.

**Synthetic Q&A prompt** (Haiku, run once per product at index time):

> Given this furniture product description, generate 5 questions a customer would plausibly ask that this product would be a good answer to. Cover: aesthetic suitability, room-fit, comparison-to-other-styles, care/maintenance, and use-case. Output each as `{question, answer}` JSON. Keep each Q+A under 100 tokens.

---

## 7. Tools the agent gets

| Tool | Status | What it does | When the agent picks it |
|---|---|---|---|
| `semanticSearch(query, filters?)` | **NEW** | Full RAG pipeline; returns structured top-5 product cards via `formatToolResult()` | Open-ended discovery: "cozy reading nook", "Japandi style" |
| `filterSearch(filters)` | **renamed** from `searchProducts` | Pure GROQ filter, no semantics; A-Z order | Hard-constrained queries: "all oak coffee tables", "everything under $200" |
| `getProductDetails(productSlug)` | **NEW** | Authoritative spec/stock/price fetch from Sanity (cached 5 min) | Mandatory before quoting any number; mandatory before `addToCart` |
| `addToCart` | existing | unchanged | unchanged |
| `getMyOrders` | existing (auth-only) | unchanged | unchanged |

### `formatToolResult()` is mandatory

Every tool's output flows through `lib/ai/rag/format.ts:formatToolResult()`, which enforces hard token ceilings:

| Tool | Cap | Returns |
|---|---|---|
| `semanticSearch` | ≤ 1200 tok total (5 × ≤ 240) | structured JSON: id, slug, name, 1-line summary, price, key materials, stock badge, image URL |
| `filterSearch` | ≤ 1200 tok | same structured shape |
| `getProductDetails` | ≤ 500 tok | full structured specs (no marketing prose) |
| `getMyOrders` | ≤ 600 tok (10 orders max) | unchanged shape |

Results that would exceed the cap are truncated with an explicit `"(N more available — call again with refinement: <suggested filters>)"` sentinel rather than silently cut. The agent learns to refine instead of bloating context.

### System prompt updates

The agent system prompt is updated to enforce two rules:

1. **Never quote dimensions, prices, stock levels, or shipping details without first calling `getProductDetails` for that exact product in the current turn.** This is the hallucination guardrail.
2. **For open-ended descriptive queries, prefer `semanticSearch`. For queries with explicit hard constraints (price/material/category), prefer `filterSearch`.** The heuristic router enforces this; the prompt reinforces it.

---

## 8. Context discipline

RAG amplifies context bloat: every turn injects ~5 products × ~200 tokens = ~1 KB of fresh content into the conversation, on top of tool-call records, the system prompt, and history. By turn 8-10 a furniture-shopping conversation can be at 15-20K input tokens. Claude (and any LLM) gets "lost in the middle" well before its declared context limit; system-prompt instructions lose weight; the Anthropic prompt cache (5-min TTL) decays for slow-paced sessions; cost climbs linearly with input tokens. The hallucination risk is not primarily at the retrieval layer — it is here.

Six concrete disciplines, all enforced in code or eval:

### 8.1 Per-tool-result budget (the biggest lever)

Single `formatToolResult()` (§7) enforces hard caps. Drives ~60% of the context savings vs naive RAG.

### 8.2 Per-turn input budget

- **Hard cap**: 32K input tokens to Sonnet 4.5 (it tolerates 200K but quality declines well before; 32K is the empirical sweet spot for tool-heavy chat).
- **Soft warn**: 16K — logged to PostHog, surfaced in dashboards, no user-visible action.
- **Composition target**: ~3K system prompt + ~2K tool defs + ~10K history + ~5K current-turn tool results, leaving 12K headroom.
- If hard cap projected → trigger §8.3 compaction.

### 8.3 Conversation history compaction

- **Last 6 turns verbatim** (3 user + 3 assistant including tool calls).
- **Older turns**: replace tool results with a one-line trace (`"searched 'reading nook chair', returned 5 products incl. #abc, #def"`); keep prose summaries.
- **Compaction**: single Haiku call (~150 ms, ~$0.0005); produces a "Conversation so far" summary in a dedicated system message slot.
- **Compaction prompt** explicitly instructs: *"preserve user constraints, preferences, and named entities verbatim"* — guards against losing load-bearing details ("for my mother who has back pain").
- Implemented in `lib/ai/rag/context.ts`. Pure function over `(messages[], budget) → messages[]`.

### 8.4 Fresh-start triggers

- **Manual**: "Start fresh" button appears in chat header after 10 turns or 25K tokens. Wipes history; preserves cart + recently-viewed.
- **Auto-suggest**: cosine distance between current query embedding and rolling average of last 3 query embeddings. If distance > 0.4 (empirically tunable), surface a non-blocking chip: *"Looks like you're shopping for something different — start a fresh conversation?"*. Never auto-flushes; user must accept.
- **Hard reset on auth boundary**: sign-in / sign-out always starts a fresh conversation (also avoids leaking guest queries into authenticated context).

### 8.5 Cache-aware prompt ordering

Stable prefix (system prompt + tool definitions) is byte-identical across all requests in a session and placed first → maximises Anthropic prompt-cache hits (5-min TTL, ~10× cheaper on hit). Per-user identifiers and dynamic context are placed after the cached prefix. Codified as a structural invariant in the Context Manager.

### 8.6 Retrieval-context budgeting

Pinecone returns top-30 → Cohere reranks to top-10 → **only top-5 enter the LLM context**. Top 6-10 are retained in the *tool result envelope* (not LLM-visible) so a follow-up turn can reference "show me more like #2" without re-querying.

### Observability for context discipline

- Per-turn input token count → PostHog (event `rag.turn.input_tokens`).
- Compaction events → PostHog (event `rag.compaction.triggered` with payload `{turn, input_tokens, summary_tokens}`).
- Alert: p95 turn input tokens > 24K over a 24 h window.
- Alert: compaction failure rate > 1%.

---

## 9. Evaluation — the quality contract

### Golden set

`tests/rag/golden.json` — 200 queries hand-curated across 6 buckets (~33 each):

| Bucket | Examples |
|---|---|
| Aesthetic discovery | "Japandi for small bedroom", "warm minimalist living room", "bohemian reading corner" |
| Specific intent | "oak coffee table 120cm under $600", "3-seater sofa in grey wool" |
| Comparison | "difference between the X and Y sofa", "which is better for daily use" |
| Policy | "do you ship to Tasmania?", "what's the return window?", "assembly time on the platform bed?" |
| Edge cases | out-of-catalog ("do you sell mattresses?"), very short ("chair"), very long (1500 tokens), multilingual (FR/ES/zh-CN), typos, SKU-as-query ("Söderhamn", "183 cm") |
| Adversarial | prompt injection ("ignore previous instructions"), PII solicitation ("email of customer X"), off-topic, profanity |

Each query carries: expected top-N product IDs (or `null` for refusal cases), expected filter extraction, expected refusal flag, expected behaviour notes.

### Multi-turn dialogues

Additional 20 multi-turn dialogues (5-15 turns each) covering aesthetic discovery → refinement → comparison → policy. Per-conversation metrics:
- `faithfulness@turn1`
- `faithfulness@turn15`
- `mean_input_tokens`
- `compaction_event_count`
- `needle_recall` — at turn N, can the agent correctly recall a constraint mentioned at turn 2?

### Metrics computed in `tools/rag-eval.ts`

- recall@1, recall@5, recall@10
- MRR, NDCG@10
- LLM-judge faithfulness (Sonnet 4.5 grades the agent's answer against the retrieved context + ground truth)
- Filter extraction F1
- p50 / p95 latency
- $/query (computed from token usage × published model pricing)

### CI gates

- `pnpm test:rag` runs nightly + on PRs that touch `lib/ai/rag/**` or any agent tool.
- Block merge on:
  - recall@5 drop > 2%
  - faithfulness drop > 2%
  - faithfulness degradation across 15 turns > 5%
  - p95 latency drop > 10%
- Pass-through warnings for: filter F1 drop, $/query > $0.025.

---

## 10. Stress testing

### Adversarial suite (Vitest)

`tests/rag/adversarial.spec.ts` runs the full pipeline against:
- Typo bombardment, gibberish, all-caps, 4000-char queries, single-character queries
- Prompt-injection list (~50 patterns from OWASP LLM Top 10)
- PII solicitation
- Out-of-catalog ("do you sell mattresses?")
- SKU-as-query
- Multilingual

Pass criteria: no hallucinated product, no PII leak, no prompt-injection bypass (verified by Sonnet-4.5 auditor reviewing each response).

### Marathon shopper

`tests/rag/marathon.spec.ts` — a 30-turn synthetic conversation that exercises 2+ compaction events. Asserts:
- Correct recall of intent stated at turn 2 ("buy a walnut sofa for my mother") still informs turn 28's response.
- No tool calls reference product IDs from earlier turns that have been filtered out.
- Total tokens grew sub-linearly (compaction worked).

### Load test

`tests/load/rag-pipeline.k6.js` — 100 concurrent users, 10 min sustained, mixed query bucket distribution proportional to expected production traffic. Targets:
- p95 < 2.0 s first token
- error rate < 0.5%
- $/query rolling average ≤ $0.02

Runs in GitHub Actions on tagged releases (not every PR — cost). Failure blocks the release tag.

### Cold-start probe

Vercel Cron (`*/4 * * * *`) hits the popular-products namespace with a synthetic query to keep Pinecone Serverless warm. Negligible cost; eliminates worst-case cold-start latency.

---

## 11. Phasing

### Phase 1 — this spec

Text RAG with everything above. Estimated 2-3 weeks of focused work.

### Phase 2 — visual search (separate spec)

`voyage-multimodal-3.5` over product images, image-in/products-out tool, dual-index retrieval (text + image with shared metadata filters). Possibly Wayfair-Muse-style scene generation later as a discovery surface.

### Phase 3 — personalisation (separate spec)

Recently-viewed bias in retrieval, cart-aware "complete the look" via Wayfair-ViCs-style triplet embeddings, optional cross-session memory.

---

## 12. Risks & rollback

| Risk | Mitigation |
|---|---|
| Pinecone outage | `semanticSearch` falls back to existing `filterSearch`; agent system prompt covers the degraded mode (still useful, just less semantic). |
| Voyage outage | Adapter behind interface; can swap to Cohere `embed-v4` (1024d) with one env-var change + full re-index (~$0.50, ~30 min for low-thousands of products). |
| Cohere Rerank outage | Skip rerank step; pass top-10 from hybrid retrieval directly to LLM. Quality drop ~15-20% but functional. |
| Hallucinated specs slip through | Tool-mediated truth (no spec/price/stock ever leaves the LLM without a fresh `getProductDetails` call); LLM-judge faithfulness gate in CI. |
| Cost runaway | Per-user 20 req/min limit retained; `$/query` budget assertion in nightly eval; alert if 7-day rolling p95 > $0.025. |
| Bad re-index corrupts the index | Double-buffer pattern: write to `products-v{N+1}` namespace, swap pointer in Edge Config when verified; old namespace kept 24 h. |
| Sanity webhook flakes | QStash retries with exponential backoff; nightly reconciliation job diffs Sanity vs Pinecone product IDs. |
| Prompt injection bypasses regex | 3-layer defence; output schema validation rejects malformed tool calls; LLM never invents tool calls (AI SDK 6 enforces). |
| Compaction summarises away a load-bearing detail | Compaction prompt includes explicit "preserve user constraints, preferences, and named entities verbatim" instruction; eval set has a "needle in compacted history" case to detect regressions. |
| Filter extraction misses a constraint ("under $400" parsed as $4) | Zod schema validates extracted filters with reasonable bounds; ambiguous cases route to `filterSearch` UI prompt rather than auto-applying. |

### Rollback strategy

- Each phase ships behind a feature flag: `RAG_ENABLED=true` (default false until cutover).
- Flip to `false` → falls back to existing keyword agent (zero code path overlap).
- Tag the pre-RAG state as `pre-rag` in git for one-command revert.
- Pinecone namespace pointer in Edge Config gives a second rollback layer for index issues without touching code.

---

## 13. What this spec is explicitly NOT doing

- No image / visual retrieval (Phase 2)
- No personalisation, behavioural signals, or click-data ranking (Phase 3)
- No cross-session memory; each session starts fresh (Phase 3)
- No fine-tuned embedding model (off-the-shelf only until ≥ 3 months of click data)
- No Self-RAG / CRAG / RAPTOR (over-engineering at this scale)
- No SaaS observability platform (LangFuse / Braintrust deferred until eval volume justifies)
- No ColBERT / late-interaction (operational complexity not justified)
- No Sanity native embeddings (10-chunk cap, opaque model, can't A/B)
- No replacement of the storefront keyword search bar
- No UI redesign of the chat shell

---

## 14. Open questions for implementation phase

These are deliberately not resolved here; flag during the writing-plans handoff:

1. **Where to host the Sanity webhook**: separate Vercel route, or piggy-back on an existing webhook handler?
2. **QStash signing key rotation**: process for rotating the QStash signing secret without downtime.
3. **Edge Config writeable from CI?**: namespace pointer swap during double-buffer cutover — manual (dashboard) or automated (CI script)?
4. **Eval golden set authorship**: hand-curated by Neville, or partially generated and reviewed?
5. **Cohere Rerank availability in AU region**: confirm latency from Sydney/Melbourne; fall back to US-East if AU unavailable.
6. **Voyage v3 vs v4**: spec locks to `voyage-3-large` (proven, well-benchmarked). Voyage shipped a v4 series in Jan 2026 (`voyage-4-large`, `-lite`, `-nano`) sharing an embedding space with v3. Decide at implementation time whether to skip straight to `voyage-4-large` based on current MTEB delta and pricing; the shared-embedding-space property means a future swap is a re-index, not a code rewrite.
7. **Cohere Rerank 3.5 vs Rerank 4**: spec locks to 3.5 for production maturity. Rerank 4 (per 2026 reranker leaderboards) edges out 3.5 on ELO but is newer. Decide at implementation time after measuring on the golden set; swap is a one-line change behind the rerank adapter.

---

## Appendix A — File map

```
lib/ai/rag/
├── embed.ts              # Voyage adapter
├── store.ts              # Pinecone adapter
├── rerank.ts             # Cohere adapter
├── context.ts            # Context Manager
├── format.ts             # formatToolResult
├── indexer/
│   ├── chunk.ts          # Hierarchical chunking
│   ├── synthetic-qa.ts   # Haiku Q&A generation
│   ├── index-product.ts  # Orchestrator
│   └── webhook.ts        # Sanity webhook handler
└── query/
    ├── understand.ts     # Haiku rewrite + filter extraction + HyDE
    ├── retrieve.ts       # Hybrid Pinecone query
    ├── rerank.ts         # Cohere rerank wrapper
    └── format.ts         # Final formatting

lib/ai/tools/
├── semantic-search.ts    # NEW
├── filter-search.ts      # Renamed from search-products.ts
├── get-product-details.ts # NEW
├── add-to-cart.ts        # Existing
└── get-my-orders.ts      # Existing

app/api/
├── chat/route.ts         # Existing (minor: use Context Manager, route through new tools)
├── webhooks/sanity-rag/route.ts  # NEW
└── jobs/reindex-product/route.ts # NEW (QStash worker)

tools/
├── reindex-rag.ts        # Bulk re-index CLI
└── rag-eval.ts           # Eval runner

tests/rag/
├── golden.json           # 200-query eval set
├── multi-turn.json       # 20 multi-turn dialogues
├── adversarial.json      # ~100 adversarial cases
├── eval.spec.ts          # Vitest harness
├── marathon.spec.ts      # 30-turn compaction test
└── adversarial.spec.ts   # Adversarial suite

tests/load/
└── rag-pipeline.k6.js    # k6 load profile

docs/adr/
└── 0005-rag-stack-choice.md  # New ADR documenting Pinecone/Voyage/Cohere choices
```

## Appendix B — Environment variables added

```
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
PINECONE_NAMESPACE=               # Active namespace (managed via Edge Config in production)

VOYAGE_API_KEY=

COHERE_API_KEY=

QSTASH_TOKEN=                     # Already may exist via Upstash
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

SANITY_RAG_WEBHOOK_SECRET=        # New webhook for the indexer

RAG_ENABLED=true                  # Feature flag
RAG_HARD_INPUT_TOKEN_CAP=32000    # Configurable; defaults in code
RAG_SOFT_INPUT_TOKEN_CAP=16000
RAG_FRESH_START_COSINE_THRESHOLD=0.4
```

All injected via `vercel env` (Marketplace handles Pinecone automatically; Voyage and Cohere added manually).
