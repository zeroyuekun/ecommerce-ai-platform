import { beforeEach, describe, expect, it } from "vitest";
import { createRateLimiter, RateLimiter } from "@/lib/ai/rate-limit";

describe("RateLimiter (in-memory sync)", () => {
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
    const result = limiter.checkSync("user-a", 1000);
    expect(result).toEqual({ ok: true, retryAfter: 0 });
    expect(limiter.size).toBe(1);
  });

  it("allows up to max requests in the window", () => {
    expect(limiter.checkSync("user-a", 1000).ok).toBe(true);
    expect(limiter.checkSync("user-a", 1001).ok).toBe(true);
    expect(limiter.checkSync("user-a", 1002).ok).toBe(true);
  });

  it("blocks the max+1 request and returns retry-after in seconds", () => {
    limiter.checkSync("user-a", 1000);
    limiter.checkSync("user-a", 1001);
    limiter.checkSync("user-a", 1002);
    const blocked = limiter.checkSync("user-a", 1003);
    expect(blocked.ok).toBe(false);
    // resetAt = 1000 + 60000 = 61000; now = 1003; ceil((61000-1003)/1000) = 60
    expect(blocked.retryAfter).toBe(60);
  });

  it("isolates buckets by key", () => {
    for (let i = 0; i < MAX; i += 1) limiter.checkSync("user-a", 1000 + i);
    expect(limiter.checkSync("user-b", 1000).ok).toBe(true);
  });

  it("rolls over after the window expires", () => {
    for (let i = 0; i < MAX; i += 1) limiter.checkSync("user-a", 1000 + i);
    expect(limiter.checkSync("user-a", 1003).ok).toBe(false);
    // Past the window: new bucket opens.
    expect(limiter.checkSync("user-a", 1000 + WINDOW + 1).ok).toBe(true);
  });

  it("prune() is a no-op below the eviction threshold", () => {
    limiter.checkSync("user-a", 1000);
    limiter.prune(1000 + WINDOW + 1);
    // Below threshold of 4, nothing is evicted even though bucket is expired.
    expect(limiter.size).toBe(1);
  });

  it("prune() evicts expired buckets once threshold is crossed", () => {
    limiter.checkSync("user-a", 1000);
    limiter.checkSync("user-b", 1000);
    limiter.checkSync("user-c", 1000);
    limiter.checkSync("user-d", 1000);
    expect(limiter.size).toBe(4);
    // All four buckets are expired at this time.
    limiter.prune(1000 + WINDOW + 1);
    expect(limiter.size).toBe(0);
  });

  it("prune() preserves active buckets", () => {
    limiter.checkSync("user-a", 1000);
    limiter.checkSync("user-b", 1000);
    limiter.checkSync("user-c", 1000);
    limiter.checkSync("user-d", 1000 + WINDOW - 100); // Still active.
    limiter.prune(1000 + WINDOW + 1);
    expect(limiter.size).toBe(1);
  });
});

describe("createRateLimiter (factory)", () => {
  it("returns the in-memory backend when Upstash env vars are missing", () => {
    const limiter = createRateLimiter("ratelimit:test", {
      windowMs: 60_000,
      max: 3,
    });
    expect(limiter.backend).toBe("memory");
  });

  it("exposes an async check that resolves to a RateLimitResult", async () => {
    const limiter = createRateLimiter("ratelimit:test-async", {
      windowMs: 60_000,
      max: 2,
    });
    await expect(limiter.check("user-x")).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(limiter.check("user-x")).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    await expect(limiter.check("user-x")).resolves.toEqual(
      expect.objectContaining({ ok: false }),
    );
  });
});
