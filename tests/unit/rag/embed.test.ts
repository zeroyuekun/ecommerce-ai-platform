import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetEmbedClientForTests, embedTexts } from "@/lib/ai/rag/embed";

const mockFetch = vi.fn();

describe("embedTexts (Pinecone Inference)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    process.env.PINECONE_API_KEY = "test-key";
    __resetEmbedClientForTests();
  });

  afterEach(() => {
    delete process.env.PINECONE_API_KEY;
    vi.unstubAllGlobals();
  });

  it("returns the embeddings for each input string", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ values: [0.1, 0.2, 0.3] }, { values: [0.4, 0.5, 0.6] }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const out = await embedTexts(["a", "b"], { kind: "document" });
    expect(out).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.pinecone.io/embed",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Api-Key": "test-key",
          "X-Pinecone-API-Version": "2024-10",
          "Content-Type": "application/json",
        }),
      }),
    );
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody).toMatchObject({
      model: "multilingual-e5-large",
      parameters: { input_type: "passage", truncate: "END" },
      inputs: [{ text: "a" }, { text: "b" }],
    });
  });

  it("maps kind:'query' to input_type:'query'", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ values: [0.1] }] }), {
        status: 200,
      }),
    );
    await embedTexts(["q"], { kind: "query" });
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.parameters.input_type).toBe("query");
  });

  it("returns [] for an empty input array without calling fetch", async () => {
    const out = await embedTexts([], { kind: "document" });
    expect(out).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws a typed error when fetch returns non-2xx", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("server boom", { status: 503 }),
    );
    await expect(embedTexts(["a"], { kind: "document" })).rejects.toThrow(
      /pinecone embedding failed/i,
    );
  });

  it("throws a typed error when fetch itself rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    await expect(embedTexts(["a"], { kind: "document" })).rejects.toThrow(
      /pinecone embedding failed/i,
    );
  });
});
