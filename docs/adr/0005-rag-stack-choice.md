# ADR-0005: RAG Stack Choice (Pinecone + Voyage + Cohere)

## Status
Accepted — 2026-04-24

## Context
The existing chatbot's `searchProducts` tool uses keyword-only GROQ matching against product
name + description. It cannot resolve semantic queries ("cozy reading nook", "Japandi for a
small bedroom") that customers actually use. We need a retrieval-augmented generation (RAG)
layer that handles semantic intent, grounds spec/price answers in tool-call truth, and
respects existing latency, cost, and reliability budgets.

## Decision
Adopt the following stack for Phase 1 (text-only RAG):

- **Vector store:** Pinecone Serverless via Vercel Marketplace integration. Native sparse-dense
  hybrid in one query, single-stage metadata filtering, sub-10 ms p50, ~5 yrs production
  maturity, env vars auto-injected by Vercel Marketplace.
- **Text embeddings:** Voyage `voyage-3-large` @ 1024d int8. Anthropic-recommended embedding
  partner; tops MTEB; Matryoshka support means future downsizing is free.
- **Reranker:** Cohere Rerank 3.5 — ~600 ms p50, ~30 % precision lift, longest production
  track record.
- **Re-indexing pipeline:** Sanity webhook → Vercel route → Upstash QStash → background worker
  → Pinecone upsert. Idempotency key = `${_id}:${_rev}`.
- **Caching:** Reuse existing Upstash Redis for semantic cache (cosine ≥ 0.97, 1 h TTL).
- **Generation LLM:** Claude Sonnet 4.5 via Vercel AI Gateway (unchanged).
- **Query understanding LLM:** Claude Haiku 4.5 via Vercel AI Gateway.

## Alternatives considered
- **Turbopuffer** — technically excellent (used by Cursor / Notion / Anthropic) and ~5×
  cheaper, but lacks the Vercel Marketplace integration and is younger in production. Cost
  is irrelevant at low-thousands of vectors. Pinecone wins on operational simplicity.
- **Sanity native `text::semanticSimilarity()`** — opaque embedding model, no version pinning,
  10-chunk-per-document cap. Disqualifying for a high-quality A/B-able pipeline.
- **pgvector via Neon** — would force adopting a new primary OLTP store. Too invasive.
- **OpenAI text-embedding-3-large** — fine, but no advantage over Voyage given the Claude
  generation stack and Voyage's Matryoshka support.
- **Cohere `embed-v4`** — ~tied with Voyage on MTEB; multilingual edge isn't needed yet.
- **Voyage Rerank 2.5** — tempting for single-vendor consolidation but Cohere has more
  battle-testing.

## Consequences
- Three new external vendors enter the dependency graph: Pinecone, Voyage, Cohere. Each is
  isolated behind a single adapter file (`lib/ai/rag/{embed,store,rerank}.ts`) so a swap is
  one-file + one env var.
- Phase 2 (visual search via `voyage-multimodal-3.5`) gets the same vendor relationship for
  free — already paying Voyage.
- Cost per query target: ≤ $0.02 (per spec §1).
- Failure modes and rollback covered in spec §12.

## Migration path away
- **From Pinecone:** rewrite `lib/ai/rag/store.ts` against another vector DB with hybrid +
  metadata filtering (Turbopuffer, Qdrant, pgvector). Re-index from Sanity. ~1 day.
- **From Voyage:** swap `lib/ai/rag/embed.ts` to Cohere `embed-v4` (1024d). Full re-index
  required (~$0.50, ~30 min for low-thousands of products). ~2 hours.
- **From Cohere Rerank:** rewrite `lib/ai/rag/rerank.ts` against Voyage Rerank or Jina
  Reranker. Pure read-path change, no re-index. ~1 hour.
