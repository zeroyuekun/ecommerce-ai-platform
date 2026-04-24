import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpsert = vi.fn().mockResolvedValue(undefined);
const mockQuery = vi.fn();
const mockDeleteMany = vi.fn().mockResolvedValue(undefined);
const mockNamespace = vi.fn(() => ({
  upsert: mockUpsert,
  query: mockQuery,
  deleteMany: mockDeleteMany,
}));
const mockIndex = vi.fn(() => ({ namespace: mockNamespace }));

vi.mock("@pinecone-database/pinecone", () => ({
  Pinecone: vi.fn().mockImplementation(() => ({ index: mockIndex })),
}));

import {
  __resetStoreForTests,
  deleteByProductId,
  hybridQuery,
  upsertChunks,
} from "@/lib/ai/rag/store";

describe("Pinecone store adapter", () => {
  beforeEach(() => {
    mockUpsert.mockClear();
    mockQuery.mockReset();
    mockDeleteMany.mockClear();
    mockIndex.mockClear();
    mockNamespace.mockClear();
    process.env.PINECONE_API_KEY = "k";
    process.env.PINECONE_INDEX_NAME = "i";
    process.env.PINECONE_NAMESPACE = "products-v1";
    __resetStoreForTests();
  });

  it("upserts records with id, values, sparseValues, and metadata", async () => {
    await upsertChunks([
      {
        id: "p1#description",
        values: [0.1, 0.2],
        sparseValues: { indices: [3, 7], values: [0.5, 0.4] },
        metadata: {
          product_id: "p1",
          chunk_type: "description",
          price: 100,
          in_stock: true,
        },
      },
    ]);
    expect(mockNamespace).toHaveBeenCalledWith("products-v1");
    expect(mockUpsert).toHaveBeenCalledWith([
      {
        id: "p1#description",
        values: [0.1, 0.2],
        sparseValues: { indices: [3, 7], values: [0.5, 0.4] },
        metadata: {
          product_id: "p1",
          chunk_type: "description",
          price: 100,
          in_stock: true,
        },
      },
    ]);
  });

  it("hybridQuery returns matches with normalized score and metadata", async () => {
    mockQuery.mockResolvedValueOnce({
      matches: [
        {
          id: "p1#description",
          score: 0.9,
          metadata: { product_id: "p1", chunk_type: "description" },
        },
        {
          id: "p2#parent",
          score: 0.8,
          metadata: { product_id: "p2", chunk_type: "parent" },
        },
      ],
    });
    const out = await hybridQuery({
      vector: [0.1, 0.2],
      sparseVector: { indices: [1], values: [1] },
      topK: 30,
      filter: { in_stock: { $eq: true } },
    });
    expect(out).toEqual([
      {
        id: "p1#description",
        score: 0.9,
        productId: "p1",
        chunkType: "description",
        metadata: { product_id: "p1", chunk_type: "description" },
      },
      {
        id: "p2#parent",
        score: 0.8,
        productId: "p2",
        chunkType: "parent",
        metadata: { product_id: "p2", chunk_type: "parent" },
      },
    ]);
    expect(mockQuery).toHaveBeenCalledWith({
      vector: [0.1, 0.2],
      sparseVector: { indices: [1], values: [1] },
      topK: 30,
      filter: { in_stock: { $eq: true } },
      includeMetadata: true,
    });
  });

  it("deleteByProductId calls deleteMany with a product_id filter", async () => {
    await deleteByProductId("p1");
    expect(mockDeleteMany).toHaveBeenCalledWith({ product_id: { $eq: "p1" } });
  });

  it("upsert is a no-op for an empty array", async () => {
    await upsertChunks([]);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
