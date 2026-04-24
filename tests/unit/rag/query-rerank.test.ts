import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRerank } = vi.hoisted(() => ({ mockRerank: vi.fn() }));
vi.mock("@/lib/ai/rag/rerank", () => ({ rerankCandidates: mockRerank }));

import { rerankAndDedupe } from "@/lib/ai/rag/query/rerank";
import type { QueryMatch } from "@/lib/ai/rag/store";

const makeMatch = (
  id: string,
  productId: string,
  chunkType: "parent" | "description" | "qa" | "specs" | "care" = "parent",
): QueryMatch => ({
  id,
  score: 0.5,
  productId,
  chunkType,
  metadata: { product_id: productId, chunk_type: chunkType },
});

describe("rerankAndDedupe", () => {
  beforeEach(() => {
    mockRerank.mockReset();
  });

  it("dedupes by productId after rerank, keeping the highest-scoring chunk per product", async () => {
    const candidates: QueryMatch[] = [
      makeMatch("p1#parent", "p1", "parent"),
      makeMatch("p1#description", "p1", "description"),
      makeMatch("p2#parent", "p2", "parent"),
      makeMatch("p3#qa_0", "p3", "qa"),
    ];
    mockRerank.mockResolvedValueOnce([
      { id: "p1#description", text: "...", score: 0.95 },
      { id: "p2#parent", text: "...", score: 0.9 },
      { id: "p1#parent", text: "...", score: 0.85 },
      { id: "p3#qa_0", text: "...", score: 0.8 },
    ]);
    const out = await rerankAndDedupe({
      query: "q",
      candidates,
      candidateTexts: {
        "p1#parent": "a",
        "p1#description": "b",
        "p2#parent": "c",
        "p3#qa_0": "d",
      },
      topNAfterRerank: 10,
      topProducts: 5,
    });
    expect(out.map((m) => m.productId)).toEqual(["p1", "p2", "p3"]);
    expect(out[0].id).toBe("p1#description");
  });

  it("respects topProducts cap", async () => {
    const candidates: QueryMatch[] = Array.from({ length: 8 }, (_, i) =>
      makeMatch(`p${i}#parent`, `p${i}`),
    );
    mockRerank.mockResolvedValueOnce(
      candidates.map((c, i) => ({ id: c.id, text: "x", score: 1 - i * 0.01 })),
    );
    const out = await rerankAndDedupe({
      query: "q",
      candidates,
      candidateTexts: Object.fromEntries(candidates.map((c) => [c.id, "x"])),
      topNAfterRerank: 8,
      topProducts: 3,
    });
    expect(out).toHaveLength(3);
  });
});
