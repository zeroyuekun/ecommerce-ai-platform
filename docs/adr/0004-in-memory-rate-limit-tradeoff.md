# ADR-0004: In-memory rate limiter — accepted tradeoff + migration path

- **Status:** Accepted
- **Date:** 2026-04-20

## Context

The AI chat endpoint at `app/api/chat/route.ts` fans out to Claude (via Vercel AI Gateway) and is therefore a dollar-denominated request path — a malicious or buggy client could trivially run up the bill. Per-user rate limiting is required.

Options considered:

1. **In-memory `Map` per serverless instance** — zero infrastructure, but each container starts with an empty map, so a user can multiply their effective quota by the number of concurrent containers handling their requests.
2. **Durable store (Vercel KV / Upstash Redis)** — accurate global quota, adds a third-party dependency and requires an API key in CI/deploy environments.
3. **AI Gateway provider-level rate limit** — Vercel AI Gateway exposes per-key limits, but they're coarser than per-user-scoped.

## Decision

Use an in-memory `RateLimiter` (`lib/ai/rate-limit.ts`) with a per-user bucket, 20 req/min, opportunistic eviction when the map exceeds 1024 buckets.

Explicitly accept the fan-out inaccuracy: on Vercel Fluid Compute, function instances are reused across concurrent requests in the same region, so in practice a single user's traffic tends to hit the same instance *most* of the time. The bucket may be reset on cold start, and the effective quota may be 20 × N where N is the number of instances handling them — but the order of magnitude stays correct, and the purpose of the limiter is *cost protection from abuse*, not precise fairness.

## Consequences

**Positive:**
- Zero external dependency for v1. No KV provisioning, no Redis URL in CI secrets, no extra network hop in the request path.
- Bucket check is O(1) and adds < 1ms to every request.
- The `RateLimiter` class is unit-tested (`tests/unit/rate-limit.test.ts`) against the exact semantics we ship.

**Negative:**
- Under heavy concurrent load, a determined abuser can exceed the nominal 20/min by spraying requests to force cold-start new instances. For *this* portfolio workload, not a concern; for a real product, not acceptable long-term.
- In-memory state is lost on deploy, which also means rate-limit counters reset on every push. Benign, but noted.

**Migration path (explicit, so this isn't an unbounded footgun):**

Swap the `RateLimiter` class for an Upstash Redis-backed limiter:

```ts
// lib/ai/rate-limit.ts — drop-in replacement
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const chatRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "60 s"),
});
```

Call sites in `app/api/chat/route.ts` use the `RateLimiter` interface (`.check(key)` returns `{ ok, retryAfter }`), which matches Upstash's return shape closely — the migration is < 20 lines.

**Alternatives rejected:**
- *Vercel AI Gateway per-key limit*: good for budget enforcement at the provider tier, poor for per-authenticated-user fairness.
- *Middleware-based limit using Vercel's Edge Config*: Edge Config is read-optimized; our write-heavy per-user counter workload isn't a fit.
