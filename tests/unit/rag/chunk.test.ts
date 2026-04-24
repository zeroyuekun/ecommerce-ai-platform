import { describe, expect, it } from "vitest";
import {
  type ChunkableProduct,
  chunkProduct,
} from "@/lib/ai/rag/indexer/chunk";

const sample: ChunkableProduct = {
  id: "p_001",
  name: "Nordic Grey 3-Seater Sofa",
  description:
    "A stunning Scandinavian-inspired sofa with plush cushioning, solid oak legs, and a tightly-woven grey upholstery that softens any modern living room.",
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

describe("chunkProduct", () => {
  it("emits a parent chunk plus description, specs, and care chunks", () => {
    const chunks = chunkProduct(sample, { syntheticQa: [] });
    const types = chunks.map((c) => c.type);
    expect(types).toContain("parent");
    expect(types).toContain("description");
    expect(types).toContain("specs");
    expect(types).toContain("care");
  });

  it("each chunk text is non-empty and prefixed with the product name", () => {
    const chunks = chunkProduct(sample, { syntheticQa: [] });
    for (const c of chunks) {
      expect(c.text.length).toBeGreaterThan(0);
      expect(c.text).toContain(sample.name);
    }
  });

  it("each chunk has product_id and chunk_type metadata", () => {
    const chunks = chunkProduct(sample, { syntheticQa: [] });
    for (const c of chunks) {
      expect(c.metadata.product_id).toBe("p_001");
      expect(c.metadata.chunk_type).toBe(c.type);
    }
  });

  it("appends one qa chunk per provided synthetic Q&A pair", () => {
    const chunks = chunkProduct(sample, {
      syntheticQa: [
        {
          question: "Will this fit a 4 x 3 metre living room?",
          answer: "Yes — at 220 cm wide it leaves walking space on both sides.",
        },
        {
          question: "Is it pet-friendly?",
          answer:
            "The tight weave resists pet hair; spot-clean with mild soap.",
        },
      ],
    });
    const qaChunks = chunks.filter((c) => c.type === "qa");
    expect(qaChunks).toHaveLength(2);
    expect(qaChunks[0].text).toContain("Will this fit");
    expect(qaChunks[0].id).toBe("p_001#qa_0");
  });

  it("chunk ids follow the {productId}#{type}[index] pattern", () => {
    const chunks = chunkProduct(sample, {
      syntheticQa: [{ question: "q", answer: "a" }],
    });
    const ids = chunks.map((c) => c.id);
    expect(ids).toContain("p_001#parent");
    expect(ids).toContain("p_001#description");
    expect(ids).toContain("p_001#specs");
    expect(ids).toContain("p_001#care");
    expect(ids).toContain("p_001#qa_0");
  });
});
