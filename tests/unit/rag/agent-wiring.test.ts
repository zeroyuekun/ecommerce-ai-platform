import { afterEach, describe, expect, it, vi } from "vitest";

// Mock heavy transitive dependencies that require runtime env vars / network.
vi.mock("@/sanity/lib/live", () => ({ sanityFetch: vi.fn() }));
vi.mock("@/lib/ai/rag/query/understand", () => ({
  understandQuery: vi.fn(),
  haikuUnderstandingFn: vi.fn(),
}));
vi.mock("@/lib/ai/rag/query/retrieve", () => ({ retrieve: vi.fn() }));
vi.mock("@/lib/ai/rag/query/rerank", () => ({ rerankAndDedupe: vi.fn() }));
vi.mock("@/lib/ai/tools/semantic-search-hydrate", () => ({
  hydrateProductSummaries: vi.fn(),
}));

import { createShoppingAgent } from "@/lib/ai/shopping-agent";

describe("createShoppingAgent — RAG flag wiring", () => {
  const original = process.env.RAG_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.RAG_ENABLED;
    else process.env.RAG_ENABLED = original;
  });

  it("does NOT expose RAG tools when flag is off", () => {
    delete process.env.RAG_ENABLED;
    const agent = createShoppingAgent({ userId: null });
    const toolNames = Object.keys(agent.tools);
    expect(toolNames).toEqual(expect.arrayContaining(["searchProducts", "addToCart"]));
    expect(toolNames).not.toContain("semanticSearch");
    expect(toolNames).not.toContain("getProductDetails");
    expect(toolNames).not.toContain("filterSearch");
  });

  it("DOES expose RAG tools when flag is on", () => {
    process.env.RAG_ENABLED = "true";
    const agent = createShoppingAgent({ userId: null });
    const toolNames = Object.keys(agent.tools);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "searchProducts",
        "addToCart",
        "semanticSearch",
        "getProductDetails",
        "filterSearch",
      ]),
    );
  });

  it("includes getMyOrders only when authenticated", () => {
    process.env.RAG_ENABLED = "true";
    const guest = createShoppingAgent({ userId: null });
    const member = createShoppingAgent({ userId: "user_123" });
    expect(Object.keys(guest.tools)).not.toContain("getMyOrders");
    expect(Object.keys(member.tools)).toContain("getMyOrders");
  });
});
