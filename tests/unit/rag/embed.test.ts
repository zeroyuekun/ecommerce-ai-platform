import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEmbed = vi.fn();
vi.mock("voyageai", () => ({
  VoyageAIClient: vi.fn().mockImplementation(() => ({ embed: mockEmbed })),
}));

import { __resetEmbedClientForTests, embedTexts } from "@/lib/ai/rag/embed";

describe("embedTexts", () => {
  beforeEach(() => {
    mockEmbed.mockReset();
    __resetEmbedClientForTests();
    process.env.VOYAGE_API_KEY = "test-key";
  });
  afterEach(() => {
    delete process.env.VOYAGE_API_KEY;
  });

  it("returns the embeddings for each input string", async () => {
    mockEmbed.mockResolvedValueOnce({
      data: [{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
    });
    const out = await embedTexts(["a", "b"], { kind: "document" });
    expect(out).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    expect(mockEmbed).toHaveBeenCalledWith({
      input: ["a", "b"],
      model: "voyage-3-large",
      inputType: "document",
      outputDimension: 1024,
      outputDtype: "int8",
    });
  });

  it("uses the query-kind input type when kind is 'query'", async () => {
    mockEmbed.mockResolvedValueOnce({ data: [{ embedding: [0.1] }] });
    await embedTexts(["q"], { kind: "query" });
    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ inputType: "query" }),
    );
  });

  it("returns [] for an empty input array without calling the API", async () => {
    const out = await embedTexts([], { kind: "document" });
    expect(out).toEqual([]);
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("throws a typed error when the API call fails", async () => {
    mockEmbed.mockRejectedValueOnce(new Error("voyage 503"));
    await expect(embedTexts(["a"], { kind: "document" })).rejects.toThrow(
      /voyage embedding failed/i,
    );
  });
});
