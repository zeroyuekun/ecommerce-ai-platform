/**
 * Per-key sliding-window rate limiter. In-memory only — one instance per
 * serverless container. See docs/adr/0004-in-memory-rate-limit.md for why
 * this is acceptable for v1 and the migration path to a durable store.
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

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs: number;
  private readonly max: number;
  private readonly evictThreshold: number;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.evictThreshold = options.evictThreshold ?? 1024;
  }

  check(key: string, now: number = Date.now()): RateLimitResult {
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

  /** Opportunistic eviction. Safe to call on every request. */
  prune(now: number = Date.now()): void {
    if (this.buckets.size < this.evictThreshold) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  /** Test-only helpers — not used in production code paths. */
  get size(): number {
    return this.buckets.size;
  }

  reset(): void {
    this.buckets.clear();
  }
}

/** Shared chat-route limiter: 20 req/min/user. */
export const chatRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 20,
});
