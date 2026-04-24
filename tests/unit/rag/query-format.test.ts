import { describe, expect, it } from "vitest";
import { formatPipelineResults } from "@/lib/ai/rag/query/format";

describe("formatPipelineResults", () => {
  it("hydrates each match with the per-product detail row by productId", () => {
    const matches = [
      {
        id: "p1#parent",
        score: 0.9,
        productId: "p1",
        chunkType: "parent" as const,
        metadata: { product_id: "p1", chunk_type: "parent" as const },
      },
    ];
    const products = {
      p1: {
        id: "p1",
        slug: "nordic-grey-3-seater-sofa",
        name: "Nordic Grey 3-Seater Sofa",
        oneLine: "Scandinavian sofa with oak legs.",
        price: 1299,
        priceFormatted: "AUD 1,299",
        keyMaterials: "fabric, oak",
        stockStatus: "in_stock" as const,
        imageUrl: "https://cdn/x.jpg",
        productUrl: "/products/nordic-grey-3-seater-sofa",
      },
    };
    const out = formatPipelineResults({ matches, products });
    expect(out.products[0]).toMatchObject({
      id: "p1",
      slug: "nordic-grey-3-seater-sofa",
      name: "Nordic Grey 3-Seater Sofa",
      relevanceScore: 0.9,
    });
    expect(out.totalResults).toBe(1);
  });

  it("drops matches whose productId is missing from the products map", () => {
    const matches = [
      {
        id: "p1#parent",
        score: 0.9,
        productId: "p1",
        chunkType: "parent" as const,
        metadata: { product_id: "p1", chunk_type: "parent" as const },
      },
      {
        id: "p2#parent",
        score: 0.8,
        productId: "p2",
        chunkType: "parent" as const,
        metadata: { product_id: "p2", chunk_type: "parent" as const },
      },
    ];
    const out = formatPipelineResults({ matches, products: {} });
    expect(out.products).toHaveLength(0);
  });
});
