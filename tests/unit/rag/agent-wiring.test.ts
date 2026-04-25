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
  // vi.stubEnv records the prior value; vi.unstubAllEnvs restores it. Avoids
  // the manual save-and-restore pattern and cleans up correctly even if a
  // test throws mid-assertion.
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes only the legacy keyword tool when RAG flag is off", () => {
    vi.stubEnv("RAG_ENABLED", "");
    const agent = createShoppingAgent({ userId: null });
    const toolNames = Object.keys(agent.tools);
    expect(toolNames).toEqual(
      expect.arrayContaining(["searchProducts", "addToCart"]),
    );
    expect(toolNames).not.toContain("semanticSearch");
    expect(toolNames).not.toContain("getProductDetails");
    expect(toolNames).not.toContain("filterSearch");
  });

  it("REMOVES legacy searchProducts and exposes only RAG tools when flag is on (C4)", () => {
    // Regression for C4 (2026-04-25): the legacy `searchProducts` tool used
    // to coexist with the new RAG tools, leaking price/dimensions/stock
    // straight to the LLM and bypassing the getProductDetails-only-truth
    // guardrail. The new contract: when RAG is on, searchProducts is gone.
    vi.stubEnv("RAG_ENABLED", "true");
    const agent = createShoppingAgent({ userId: null });
    const toolNames = Object.keys(agent.tools);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "filterSearch",
        "semanticSearch",
        "getProductDetails",
        "addToCart",
      ]),
    );
    expect(toolNames).not.toContain("searchProducts");
  });

  it("includes getMyOrders only when authenticated", () => {
    vi.stubEnv("RAG_ENABLED", "true");
    const guest = createShoppingAgent({ userId: null });
    const member = createShoppingAgent({ userId: "user_123" });
    expect(Object.keys(guest.tools)).not.toContain("getMyOrders");
    expect(Object.keys(member.tools)).toContain("getMyOrders");
  });
});
