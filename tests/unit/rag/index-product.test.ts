import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockEmbed, mockUpsert, mockDelete } = vi.hoisted(() => ({
  mockEmbed: vi.fn(),
  mockUpsert: vi.fn(),
  mockDelete: vi.fn(),
}));

const mockGenerator = vi.fn();

vi.mock("@/lib/ai/rag/embed", () => ({ embedTexts: mockEmbed }));
vi.mock("@/lib/ai/rag/store", () => ({
  upsertChunks: mockUpsert,
  deleteByProductId: mockDelete,
}));

import { indexProduct } from "@/lib/ai/rag/indexer/index-product";

const product = {
  id: "p_001",
  name: "Nordic Grey 3-Seater Sofa",
  description: "A stunning Scandinavian-inspired sofa.",
  category: { title: "Living Room", slug: "living-room" },
  productType: "sofas",
  material: "fabric",
  color: "grey",
  dimensions: "220cm x 95cm x 85cm",
  price: 1299,
  stock: 7,
  assemblyRequired: false,
  isNew: false,
  inStock: true,
  shipsToAu: true,
};

describe("indexProduct", () => {
  beforeEach(() => {
    mockEmbed.mockReset().mockResolvedValue(
      Array.from({ length: 9 }, () => Array(1024).fill(0.01)),
    );
    mockUpsert.mockReset().mockResolvedValue(undefined);
    mockDelete.mockReset().mockResolvedValue(undefined);
    mockGenerator.mockReset().mockResolvedValue([
      { question: "Q1?", answer: "A1." },
      { question: "Q2?", answer: "A2." },
      { question: "Q3?", answer: "A3." },
      { question: "Q4?", answer: "A4." },
      { question: "Q5?", answer: "A5." },
    ]);
  });

  it("deletes prior chunks before re-upserting (idempotent re-index)", async () => {
    await indexProduct(product, { qaGenerator: mockGenerator });
    expect(mockDelete).toHaveBeenCalledWith("p_001");
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpsert.mock.invocationCallOrder[0],
    );
  });

  it("emits one upsert with all chunks (parent + description + specs + care + 5 qa = 9)", async () => {
    await indexProduct(product, { qaGenerator: mockGenerator });
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const records = mockUpsert.mock.calls[0][0];
    expect(records).toHaveLength(9);
    expect(records.every((r: { id: string }) => r.id.startsWith("p_001#"))).toBe(true);
  });

  it("returns the count of chunks indexed", async () => {
    const result = await indexProduct(product, { qaGenerator: mockGenerator });
    expect(result).toEqual({ productId: "p_001", chunksIndexed: 9 });
  });

  it("survives QA generator failure with 0 qa chunks (just 4 base)", async () => {
    mockEmbed.mockResolvedValueOnce(
      Array.from({ length: 4 }, () => Array(1024).fill(0.01)),
    );
    const failingGen = vi.fn(async () => { throw new Error("haiku down"); });
    const result = await indexProduct(product, { qaGenerator: failingGen });
    expect(result.chunksIndexed).toBe(4);
  });
});
