import { afterEach, describe, expect, it } from "vitest";
import { isRagEnabled } from "@/lib/ai/rag/flags";

describe("isRagEnabled", () => {
  const originalEnv = process.env.RAG_ENABLED;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.RAG_ENABLED;
    else process.env.RAG_ENABLED = originalEnv;
  });

  it("returns false when RAG_ENABLED is unset", () => {
    delete process.env.RAG_ENABLED;
    expect(isRagEnabled()).toBe(false);
  });

  it("returns false when RAG_ENABLED is 'false'", () => {
    process.env.RAG_ENABLED = "false";
    expect(isRagEnabled()).toBe(false);
  });

  it("returns false for any non-'true' value", () => {
    process.env.RAG_ENABLED = "1";
    expect(isRagEnabled()).toBe(false);
    process.env.RAG_ENABLED = "yes";
    expect(isRagEnabled()).toBe(false);
  });

  it("returns true only when RAG_ENABLED is exactly 'true'", () => {
    process.env.RAG_ENABLED = "true";
    expect(isRagEnabled()).toBe(true);
  });
});
