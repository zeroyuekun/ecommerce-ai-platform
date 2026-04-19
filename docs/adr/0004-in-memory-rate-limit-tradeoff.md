# ADR-0004: In-memory rate limiter — accepted tradeoff + Upstash swap

- **Status:** Accepted (v1: in-memory). Upstash swap shipped as env-gated default in v2.
- **Date:** 2026-04-20

## Context

The AI chat endpoint at `app/api/chat/route.ts` fans out to Claude (via Vercel AI Gateway) and is therefore a dollar-denominated request path — a malicious or buggy client could trivially run up the bill. Per-user rate limiting is required.

Options considered:

1. **In-memory `Map` per serverless instance** — zero infrastructure, but each container starts with an empty map, so a user can multiply their effective quota by the number of concurrent containers handling their requests.
2. **Durable store (Upstash Redis via `@upstash/ratelimit`)** — accurate global quota, adds a third-party dependency and requires two env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
3. **AI Gateway provider-level rate limit** — Vercel AI Gateway exposes per-key limits, but they're coarser than per-user-scoped.

## Decision

Ship both backends behind a factory (`createRateLimiter` in `lib/ai/rate-limit.ts`). Default to the in-memory backend; if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are both set, swap to the Upstash sliding-window limiter at module init time.

Shape of the limiter is shared: `{ backend, check(key): Promise<RateLimitResult>, prune() }`. Callers always `await` — the in-memory path just wraps the sync call in `Promise.resolve`.

## Consequences

**Positive:**
- Zero required external dependency. Deploys without Upstash credentials keep working on the in-memory backend.
- Opt-in durability: a single env-var addition promotes the app to a distributed limiter with no code change.
- Upstash Redis Rest API is free for low traffic (10k commands/day), so small deployments stay in free tier.
- `RateLimiter` class is still unit-tested against the deterministic time-based semantics (`checkSync(key, now)`).

**Negative:**
- Module init async-resolves the Upstash client. In the tiny window before the promise settles, requests fall back to the in-memory limiter. This is a safe degradation (slightly looser limits, not looser auth).
- Two env vars to manage across environments. Acceptable — same cost as adding any shared infra.

**In-memory limitations (carried from v1, relevant when Upstash is not configured):**
- Under heavy concurrent load, a determined abuser can exceed the nominal 20/min by spraying requests to force cold-start new instances.
- In-memory state is lost on deploy — rate-limit counters reset on every push.

## Alternatives rejected

- *Vercel AI Gateway per-key limit*: good for budget enforcement at the provider tier, poor for per-authenticated-user fairness.
- *Middleware-based limit using Vercel's Edge Config*: Edge Config is read-optimized; our write-heavy per-user counter workload isn't a fit.
