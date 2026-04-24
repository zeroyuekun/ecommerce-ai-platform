import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  understand: vi.fn(),
  retrieve: vi.fn(),
  rerank: vi.fn(),
  hydrate: vi.fn(),
}));

vi.mock("@/lib/ai/rag/query/understand", () => ({
  understandQuery: mocks.understand,
  haikuUnderstandingFn: vi.fn(),
}));
vi.mock("@/lib/ai/rag/query/retrieve", () => ({ retrieve: mocks.retrieve }));
vi.mock("@/lib/ai/rag/query/rerank", () => ({ rerankAndDedupe: mocks.rerank }));
vi.mock("@/lib/ai/tools/semantic-search-hydrate", () => ({
  hydrateProductSummaries: mocks.hydrate,
}));

import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";

describe("semanticSearchTool", () => {
  beforeEach(() => {
    mocks.understand.mockReset().mockResolvedValue({
      rewritten: "x",
      filters: { maxPrice: 500 },
      hyde: null,
    });
    mocks.retrieve.mockReset().mockResolvedValue([
      {
        id: "p1#parent",
        score: 0.9,
        productId: "p1",
        chunkType: "parent",
        metadata: { product_id: "p1", chunk_type: "parent" },
      },
    ]);
    mocks.rerank.mockReset().mockResolvedValue([
      {
        id: "p1#parent",
        score: 0.95,
        productId: "p1",
        chunkType: "parent",
        metadata: { product_id: "p1", chunk_type: "parent" },
      },
    ]);
    mocks.hydrate.mockReset().mockResolvedValue({
      p1: {
        id: "p1",
        slug: "x",
        name: "X",
        oneLine: "x.",
        price: 100,
        priceFormatted: "$100",
        keyMaterials: "oak",
        stockStatus: "in_stock",
        imageUrl: null,
        productUrl: "/products/x",
      },
    });
  });

  it("runs the pipeline and returns formatted products", async () => {
    const out = await semanticSearchTool.execute(
      { query: "cozy reading chair" },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect(out.found).toBe(true);
    expect(out.products[0].id).toBe("p1");
    expect(out.products[0].relevanceScore).toBe(0.95);
  });

  it("respects user-supplied filters by merging with extracted ones", async () => {
    await semanticSearchTool.execute(
      { query: "x", filters: { material: "oak" } },
      { messages: [], toolCallId: "t1" } as never,
    );
    const retrieveArgs = mocks.retrieve.mock.calls[0][0];
    expect(retrieveArgs.filters.material).toBe("oak");
    expect(retrieveArgs.filters.maxPrice).toBe(500);
  });

  it("returns an empty result with a friendly message when retrieval is empty", async () => {
    mocks.retrieve.mockResolvedValueOnce([]);
    const out = await semanticSearchTool.execute({ query: "anything" }, {
      messages: [],
      toolCallId: "t1",
    } as never);
    expect(out.found).toBe(false);
    expect(out.products).toEqual([]);
  });
});
