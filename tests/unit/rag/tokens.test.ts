import { describe, expect, it } from "vitest";
import { estimateMessageTokens, estimateTokens } from "@/lib/ai/rag/tokens";

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates roughly 1 token per 4 characters (rounded up)", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

describe("estimateMessageTokens", () => {
  it("sums string and content-array messages", () => {
    expect(
      estimateMessageTokens([
        { role: "user", content: "hello world here" },
        { role: "assistant", content: [{ type: "text", text: "hi back" }] },
      ]),
    ).toBeGreaterThan(0);
  });

  it("includes a small per-message overhead", () => {
    const oneShort = estimateMessageTokens([{ role: "user", content: "hi" }]);
    expect(oneShort).toBeGreaterThanOrEqual(4);
  });
});
