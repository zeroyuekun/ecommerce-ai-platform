# ADR-0002: Sanity CDN for published reads

- **Status:** Accepted
- **Date:** 2026-04-20

## Context

Every storefront page hits Sanity: product lists, category pages, homepage rails, product detail, even the admin insights route pulls from the same store. Two clients are available from `next-sanity`:

- `useCdn: true` — served from Sanity's global CDN, stale-while-revalidate, no token required for public data.
- `useCdn: false` — served from the origin API, freshest possible read, required for any mutation or token-authenticated request.

Early in the project both `client` and `writeClient` used `useCdn: false`, meaning every read paid origin latency (150-400ms) on top of Next.js cache + ISR. This was fine at seed scale but would compound with real traffic.

## Decision

Split into two clients in `sanity/lib/client.ts`:

- `client` — `useCdn: true`, `perspective: "published"`. Used for all storefront reads and for admin insights aggregation. Freshness is bounded by Sanity CDN TTL (~1s) plus Next.js cache tags invalidated on content webhook.
- `writeClient` — `useCdn: false`, token-attached. Used exclusively by the Stripe webhook and server actions that mutate documents. Never reads.

Preview/draft mode (when we wire it) will explicitly opt into `useCdn: false` via a separate draft-mode-aware client, not by flipping the shared `client`.

## Consequences

**Positive:**
- Storefront reads served from the global edge, typical 20-60ms origin-hit latency.
- Published content is immutable from the CDN's perspective, so we can aggressively revalidate-on-webhook rather than time-based TTLs.
- Admin insights pull from the CDN too — the analytics endpoint doesn't need second-by-second freshness, and the saving is noticeable when the AI generation step already adds 3-5s.

**Negative:**
- Up to ~1s staleness window on fresh publishes from the Studio. For an e-commerce store this is acceptable; the business only notices "my edit didn't appear instantly" and not revenue-critical.
- Two clients to remember: code reviews need to catch anyone importing `writeClient` for a read.

**Alternatives rejected:**
- *Single client with `useCdn: false`* — simpler, but wastes origin quota and adds latency on every request.
- *Sanity Live (subscribe over websocket)* — great for the Studio itself; overkill for a storefront where cache invalidation on mutation is sufficient.
- *Toggle `useCdn` via env var* — indirection with no benefit; the read/write boundary is already the clearest place to decide.
