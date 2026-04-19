/**
 * Per-key sliding-window rate limiter with two backends:
 *
 * - In-memory (default). One instance per serverless container, so limits
 *   are effectively per-container. Acceptable for low traffic / single-region.
 * - Upstash Redis (optional). Enabled automatically when both
 *   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Gives
 *   a durable, shared limit across all containers and regions.
 *
 * See docs/adr/0004-in-memory-rate-limit-tradeoff.md for the trade-off
 * analysis. Callers always `await` — the in-memory path just wraps the
 * sync call in `Promise.resolve` so the call site stays uniform.
 */

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  evictThreshold?: number;
}

export interface RateLimiterBackend {
  check(key: string): Promise<RateLimitResult>;
  prune(): void;
  readonly backend: "memory" | "upstash";
}

interface Bucket {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter implements RateLimiterBackend {
  readonly backend = "memory" as const;
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs: number;
  private readonly max: number;
  private readonly evictThreshold: number;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.evictThreshold = options.evictThreshold ?? 1024;
  }

  checkSync(key: string, now: number = Date.now()): RateLimitResult {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { ok: true, retryAfter: 0 };
    }
    if (bucket.count >= this.max) {
      return {
        ok: false,
        retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
      };
    }
    bucket.count += 1;
    return { ok: true, retryAfter: 0 };
  }

  async check(key: string): Promise<RateLimitResult> {
    return this.checkSync(key);
  }

  prune(now: number = Date.now()): void {
    if (this.buckets.size < this.evictThreshold) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  get size(): number {
    return this.buckets.size;
  }

  reset(): void {
    this.buckets.clear();
  }
}

/**
 * Legacy export preserved for the unit suite and any direct callers.
 * New code should prefer the async `check` via {@link createRateLimiter}.
 */
export class RateLimiter extends InMemoryRateLimiter {}

/**
 * Upstash-backed limiter. Lazy-imports `@upstash/ratelimit` so the module
 * graph stays clean when the feature is disabled. Uses a sliding-window
 * algorithm to match the in-memory behavior as closely as possible.
 */
async function createUpstashLimiter(
  prefix: string,
  options: RateLimitOptions,
): Promise<RateLimiterBackend> {
  const [{ Ratelimit }, { Redis }] = await Promise.all([
    import("@upstash/ratelimit"),
    import("@upstash/redis"),
  ]);
  const redis = Redis.fromEnv();
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.max, `${options.windowMs} ms`),
    prefix,
    analytics: false,
  });

  return {
    backend: "upstash",
    async check(key: string): Promise<RateLimitResult> {
      const { success, reset } = await limiter.limit(key);
      const retryAfter = success
        ? 0
        : Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return { ok: success, retryAfter };
    },
    prune() {
      // Upstash/Redis handles TTL expiry server-side — no-op here.
    },
  };
}

function hasUpstashEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * Creates a rate limiter appropriate for the current environment.
 *
 * Resolves synchronously to an in-memory limiter; if Upstash env vars are
 * present it kicks off an async swap to the Redis-backed limiter and
 * returns a proxy that uses the durable backend as soon as it's ready.
 * Any requests in the gap use the in-memory fallback, which is a safe
 * degradation.
 */
export function createRateLimiter(
  prefix: string,
  options: RateLimitOptions,
): RateLimiterBackend {
  const fallback = new InMemoryRateLimiter(options);
  if (!hasUpstashEnv()) return fallback;

  let active: RateLimiterBackend = fallback;
  createUpstashLimiter(prefix, options)
    .then((upstash) => {
      active = upstash;
    })
    .catch((err) => {
      console.warn(
        "[rate-limit] Upstash init failed — staying on in-memory backend:",
        err,
      );
    });

  return {
    get backend() {
      return active.backend;
    },
    check: (key) => active.check(key),
    prune: () => active.prune(),
  };
}

/** Shared chat-route limiter: 20 req/min/user. */
export const chatRateLimiter = createRateLimiter("ratelimit:chat", {
  windowMs: 60_000,
  max: 20,
});

/** Search endpoint limiter: 30 req/min per IP. */
export const searchRateLimiter = createRateLimiter("ratelimit:search", {
  windowMs: 60_000,
  max: 30,
});
