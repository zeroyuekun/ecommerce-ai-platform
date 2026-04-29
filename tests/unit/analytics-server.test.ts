/**
 * Pins the cache behavior of captureServerEvent. Bug D regression guard:
 * the prior implementation called shutdown() on the PostHog client and
 * cleared the singleton on every event, which forced every event to pay
 * the cost of constructing a brand-new client. The fix uses flush() and
 * keeps the cached client alive for the lifetime of the container.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctorSpy = vi.fn();
const captureSpy = vi.fn();
const flushSpy = vi.fn(() => Promise.resolve());
const shutdownSpy = vi.fn(() => Promise.resolve());

vi.mock("posthog-node", () => ({
  PostHog: class {
    constructor(...args: unknown[]) {
      ctorSpy(...args);
    }
    capture(props: unknown) {
      captureSpy(props);
    }
    flush() {
      return flushSpy();
    }
    shutdown() {
      return shutdownSpy();
    }
  },
}));

describe("captureServerEvent", () => {
  beforeEach(() => {
    ctorSpy.mockClear();
    captureSpy.mockClear();
    flushSpy.mockClear();
    shutdownSpy.mockClear();
    vi.resetModules();
    process.env.POSTHOG_API_KEY = "phc_test";
  });

  afterEach(() => {
    delete process.env.POSTHOG_API_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  });

  it("reuses the cached PostHog client across events (no per-event re-init)", async () => {
    const { captureServerEvent } = await import("@/lib/analytics/server");
    await captureServerEvent({ distinctId: "u1", event: "e1" });
    await captureServerEvent({ distinctId: "u1", event: "e2" });
    await captureServerEvent({ distinctId: "u1", event: "e3" });

    expect(ctorSpy).toHaveBeenCalledTimes(1);
    expect(captureSpy).toHaveBeenCalledTimes(3);
    expect(flushSpy).toHaveBeenCalledTimes(3);
    expect(shutdownSpy).not.toHaveBeenCalled();
  });

  it("returns a no-op when no PostHog key is configured", async () => {
    delete process.env.POSTHOG_API_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const { captureServerEvent } = await import("@/lib/analytics/server");
    await captureServerEvent({ distinctId: "u1", event: "e1" });
    expect(ctorSpy).not.toHaveBeenCalled();
    expect(captureSpy).not.toHaveBeenCalled();
    expect(flushSpy).not.toHaveBeenCalled();
  });
});
