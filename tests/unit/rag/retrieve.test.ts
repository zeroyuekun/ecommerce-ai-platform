import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEmbed, mockHybridQuery } = vi.hoisted(() => ({
  mockEmbed: vi.fn(),
  mockHybridQuery: vi.fn(),
}));

vi.mock("@/lib/ai/rag/embed", () => ({ embedTexts: mockEmbed }));
vi.mock("@/lib/ai/rag/store", () => ({ hybridQuery: mockHybridQuery }));

import { retrieve } from "@/lib/ai/rag/query/retrieve";

describe("retrieve", () => {
  beforeEach(() => {
    mockEmbed.mockReset().mockResolvedValue([Array(1024).fill(0.01)]);
    mockHybridQuery.mockReset().mockResolvedValue([
      {
        id: "p1#parent",
        score: 0.9,
        productId: "p1",
        chunkType: "parent",
        metadata: { product_id: "p1", chunk_type: "parent" },
      },
    ]);
  });

  it("embeds the rewritten query and queries Pinecone with topK", async () => {
    const out = await retrieve({
      rewritten: "oak coffee table",
      hyde: null,
      filters: { maxPrice: 500 },
      topK: 30,
    });
    expect(mockEmbed).toHaveBeenCalledWith(["oak coffee table"], {
      kind: "query",
    });
    expect(mockHybridQuery).toHaveBeenCalledWith(
      expect.objectContaining({ topK: 30, vector: expect.any(Array) }),
    );
    expect(out).toHaveLength(1);
  });

  it("uses HyDE text for embedding when provided", async () => {
    await retrieve({
      rewritten: "x",
      hyde: "A small oak coffee table for a Scandinavian living room.",
      filters: {},
      topK: 30,
    });
    expect(mockEmbed).toHaveBeenCalledWith(
      ["A small oak coffee table for a Scandinavian living room."],
      { kind: "query" },
    );
  });

  it("translates filters into Pinecone metadata expressions", async () => {
    await retrieve({
      rewritten: "x",
      hyde: null,
      filters: {
        maxPrice: 500,
        minPrice: 100,
        material: "oak",
        inStockOnly: true,
      },
      topK: 30,
    });
    expect(mockHybridQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          price: { $gte: 100, $lte: 500 },
          material: { $eq: "oak" },
          in_stock: { $eq: true },
          ships_to_au: { $eq: true },
        },
      }),
    );
  });
});
