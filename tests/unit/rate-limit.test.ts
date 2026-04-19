import { beforeEach, describe, expect, it } from "vitest";
import { RateLimiter } from "@/lib/ai/rate-limit";

describe("RateLimiter", () => {
  let limiter: RateLimiter;
  const WINDOW = 60_000;
  const MAX = 3;

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: WINDOW,
      max: MAX,
      evictThreshold: 4,
    });
  });

  it("allows first request and opens a new bucket", () => {
    const result = limiter.check("user-a", 1000);
    expect(result).toEqual({ ok: true, retryAfter: 0 });
    expect(limiter.size).toBe(1);
  });

  it("allows up to max requests in the window", () => {
    expect(limiter.check("user-a", 1000).ok).toBe(true);
    expect(limiter.check("user-a", 1001).ok).toBe(true);
    expect(limiter.check("user-a", 1002).ok).toBe(true);
  });

  it("blocks the max+1 request and returns retry-after in seconds", () => {
    limiter.check("user-a", 1000);
    limiter.check("user-a", 1001);
    limiter.check("user-a", 1002);
    const blocked = limiter.check("user-a", 1003);
    expect(blocked.ok).toBe(false);
    // resetAt = 1000 + 60000 = 61000; now = 1003; ceil((61000-1003)/1000) = 60
    expect(blocked.retryAfter).toBe(60);
  });

  it("isolates buckets by key", () => {
    for (let i = 0; i < MAX; i += 1) limiter.check("user-a", 1000 + i);
    expect(limiter.check("user-b", 1000).ok).toBe(true);
  });

  it("rolls over after the window expires", () => {
    for (let i = 0; i < MAX; i += 1) limiter.check("user-a", 1000 + i);
    expect(limiter.check("user-a", 1003).ok).toBe(false);
    // Past the window: new bucket opens.
    expect(limiter.check("user-a", 1000 + WINDOW + 1).ok).toBe(true);
  });

  it("prune() is a no-op below the eviction threshold", () => {
    limiter.check("user-a", 1000);
    limiter.prune(1000 + WINDOW + 1);
    // Below threshold of 4, nothing is evicted even though bucket is expired.
    expect(limiter.size).toBe(1);
  });

  it("prune() evicts expired buckets once threshold is crossed", () => {
    limiter.check("user-a", 1000);
    limiter.check("user-b", 1000);
    limiter.check("user-c", 1000);
    limiter.check("user-d", 1000);
    expect(limiter.size).toBe(4);
    // All four buckets are expired at this time.
    limiter.prune(1000 + WINDOW + 1);
    expect(limiter.size).toBe(0);
  });

  it("prune() preserves active buckets", () => {
    limiter.check("user-a", 1000);
    limiter.check("user-b", 1000);
    limiter.check("user-c", 1000);
    limiter.check("user-d", 1000 + WINDOW - 100); // Still active.
    limiter.prune(1000 + WINDOW + 1);
    expect(limiter.size).toBe(1);
  });
});
