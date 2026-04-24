import { describe, expect, it, vi } from "vitest";
import { understandQuery, type UnderstandingFn } from "@/lib/ai/rag/query/understand";

const goodFn: UnderstandingFn = vi.fn(async (args) => ({
  rewritten: `${args.query} (rewritten)`,
  filters: { maxPrice: 400, color: "oak" },
  hyde: args.query.length < 30 ? "Hypothetical product description" : null,
}));

describe("understandQuery", () => {
  it("returns the LLM-derived understanding when the call succeeds", async () => {
    const out = await understandQuery({
      query: "cozy reading nook",
      history: [],
      understandingFn: goodFn,
    });
    expect(out.rewritten).toMatch(/rewritten/);
    expect(out.filters.maxPrice).toBe(400);
    expect(out.hyde).toBeTruthy();
  });

  it("falls back to identity rewrite + empty filters on failure", async () => {
    const failing: UnderstandingFn = vi.fn(async () => {
      throw new Error("haiku 503");
    });
    const out = await understandQuery({
      query: "anything",
      history: [],
      understandingFn: failing,
    });
    expect(out.rewritten).toBe("anything");
    expect(out.filters).toEqual({});
    expect(out.hyde).toBeNull();
  });

  it("clamps invalid filter values (e.g. negative price)", async () => {
    const evil: UnderstandingFn = vi.fn(async () => ({
      rewritten: "x",
      filters: { maxPrice: -1, minPrice: -10 },
      hyde: null,
    }));
    const out = await understandQuery({
      query: "x",
      history: [],
      understandingFn: evil,
    });
    expect(out.filters.maxPrice).toBeUndefined();
    expect(out.filters.minPrice).toBeUndefined();
  });
});
