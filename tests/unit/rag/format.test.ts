import { describe, expect, it } from "vitest";
import { formatToolResult } from "@/lib/ai/rag/format";

const longText = "x".repeat(2000);

describe("formatToolResult", () => {
  it("passes through when payload fits the cap", () => {
    const out = formatToolResult({
      toolName: "semanticSearch",
      payload: { products: [{ id: "1", name: "A" }] },
      capTokens: 1200,
    });
    expect(out.truncated).toBe(false);
    expect(out.payload.products).toHaveLength(1);
  });

  it("appends a sentinel when an array payload is truncated", () => {
    const products = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      name: longText,
    }));
    const out = formatToolResult({
      toolName: "semanticSearch",
      payload: { products },
      capTokens: 600,
      arrayKey: "products",
    });
    expect(out.truncated).toBe(true);
    expect(out.payload.products.length).toBeLessThan(8);
    expect(out.notice).toMatch(/more available/i);
  });

  it("never returns more than the cap (or zero items if the first one already overflows)", () => {
    const products = [
      { id: "0", name: longText },
      { id: "1", name: "small" },
    ];
    const out = formatToolResult({
      toolName: "semanticSearch",
      payload: { products },
      capTokens: 100,
      arrayKey: "products",
    });
    expect(out.truncated).toBe(true);
    expect(out.payload.products.length).toBe(0);
  });

  it("preserves non-array fields verbatim", () => {
    const out = formatToolResult({
      toolName: "semanticSearch",
      payload: { products: [], filters: { maxPrice: 500 }, totalResults: 0 },
      capTokens: 1200,
      arrayKey: "products",
    });
    expect(out.payload.filters).toEqual({ maxPrice: 500 });
    expect(out.payload.totalResults).toBe(0);
  });
});
