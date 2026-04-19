# ADR-0005: Semantic search with Upstash Vector + AI Gateway

**Date:** 2026-04-20
**Status:** Accepted

## Context

The keyword-only product search misses qualitative queries ("cozy nook for a studio apartment"). We want embeddings-based semantic search without introducing heavy infrastructure.

## Decision

- **Vector store:** Upstash Vector. We already use Upstash Redis for rate limiting; the account/billing surface is the same. 1536-dim vectors, dotproduct metric.
- **Embedding model:** `openai/text-embedding-3-small` via Vercel AI Gateway. Strong baseline quality at low cost, and routes through the gateway key we already have.
- **Index backend swap:** same "prefer Upstash, fall back to in-memory" pattern used by `lib/ai/rate-limit.ts`. The in-memory fallback makes tests and no-config dev ergonomic.
- **Keep keyword search:** `/api/search` is new; existing filter-based search on category pages stays. Different tool for different job.

## Considered alternatives

- **Sanity Embeddings Index** — first-party, zero new infra. Rejected because rolling the pipeline is a stronger portfolio signal and keeps embedding-model choice in our hands.
- **pgvector on Neon** — adds a new database plus connection pooling. Rejected on complexity.
- **Pinecone / Weaviate** — mature but adds a third account. Rejected on complexity + cost.

## Consequences

- Two new env vars (`UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`). Free tier fits this catalog size.
- Cost is roughly linear in catalog size for embeddings (~$0.02 per million tokens). Full backfill of 1000 products ≈ $0.004.
- Upstash Vector free tier has query rate limits; our rate limiter caps `/api/search` at 30 req/min/IP, well below the account limit.
- If Upstash Vector becomes a bottleneck, the same interface can be backed by pgvector — the swap is contained to `lib/search/index.ts`.
- Webhook signature verification uses a new secret (`SANITY_REVALIDATE_SECRET`). Missing this secret means the webhook rejects all requests, which is safer than silent success.
