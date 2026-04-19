import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureException,
  captureMessage,
  withMonitoring,
} from "@/lib/monitoring";

describe("monitoring", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    errorSpy.mockClear();
    logSpy.mockClear();
  });

  afterEach(() => {
    errorSpy.mockClear();
    logSpy.mockClear();
  });

  it("captureException logs an Error with stack", () => {
    captureException(new Error("boom"));
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(errorSpy.mock.calls[0][1] as string);
    expect(payload.severity).toBe("error");
    expect(payload.error.name).toBe("Error");
    expect(payload.error.message).toBe("boom");
    expect(payload.error.stack).toContain("Error: boom");
  });

  it("captureException preserves non-Error values as-is", () => {
    captureException({ weird: "shape" });
    const payload = JSON.parse(errorSpy.mock.calls[0][1] as string);
    expect(payload.error).toEqual({ weird: "shape" });
  });

  it("captureException redacts credential-like keys in extra", () => {
    captureException(new Error("boom"), {
      extra: {
        token: "super-secret",
        password: "hunter2",
        safe: "ok",
      },
    });
    const payload = JSON.parse(errorSpy.mock.calls[0][1] as string);
    expect(payload.extra.token).toBe("[REDACTED]");
    expect(payload.extra.password).toBe("[REDACTED]");
    expect(payload.extra.safe).toBe("ok");
  });

  it("captureMessage logs at info by default", () => {
    captureMessage("hello");
    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][1] as string);
    expect(payload.severity).toBe("info");
    expect(payload.message).toBe("hello");
  });

  it("withMonitoring captures thrown exceptions and rethrows", async () => {
    const failing = withMonitoring(
      async () => {
        throw new Error("route failed");
      },
      { route: "/api/x" },
    );
    await expect(failing()).rejects.toThrow("route failed");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(errorSpy.mock.calls[0][1] as string);
    expect(payload.tags.route).toBe("/api/x");
  });

  it("withMonitoring passes through successful returns without logging", async () => {
    const ok = withMonitoring(async (n: number) => n * 2);
    await expect(ok(21)).resolves.toBe(42);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
