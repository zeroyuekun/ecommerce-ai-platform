import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRerank = vi.fn();
vi.mock("cohere-ai", () => ({
  CohereClient: vi
    .fn()
    .mockImplementation(() => ({ v2: { rerank: mockRerank } })),
}));

import { __resetRerankerForTests, rerankCandidates } from "@/lib/ai/rag/rerank";

describe("rerankCandidates", () => {
  beforeEach(() => {
    mockRerank.mockReset();
    process.env.COHERE_API_KEY = "test";
    __resetRerankerForTests();
  });

  it("returns input order unchanged when candidates is empty", async () => {
    const out = await rerankCandidates({ query: "q", candidates: [], topN: 5 });
    expect(out).toEqual([]);
    expect(mockRerank).not.toHaveBeenCalled();
  });

  it("calls Cohere rerank with the right payload and returns reordered slice", async () => {
    mockRerank.mockResolvedValueOnce({
      results: [
        { index: 2, relevanceScore: 0.95 },
        { index: 0, relevanceScore: 0.71 },
      ],
    });
    const candidates = [
      { id: "a", text: "alpha" },
      { id: "b", text: "beta" },
      { id: "c", text: "gamma" },
    ];
    const out = await rerankCandidates({ query: "q", candidates, topN: 2 });
    expect(out).toEqual([
      { id: "c", text: "gamma", score: 0.95 },
      { id: "a", text: "alpha", score: 0.71 },
    ]);
    expect(mockRerank).toHaveBeenCalled();
  });

  it("falls back to input order if Cohere throws", async () => {
    mockRerank.mockRejectedValueOnce(new Error("cohere 503"));
    const candidates = [
      { id: "a", text: "alpha" },
      { id: "b", text: "beta" },
    ];
    const out = await rerankCandidates({ query: "q", candidates, topN: 1 });
    expect(out).toEqual([{ id: "a", text: "alpha", score: 0 }]);
  });
});
