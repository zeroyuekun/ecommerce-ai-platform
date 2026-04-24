import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetEmbedClientForTests, embedTexts } from "@/lib/ai/rag/embed";

const mockFetch = vi.fn();

describe("embedTexts", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    process.env.VOYAGE_API_KEY = "test-key";
    __resetEmbedClientForTests();
  });

  afterEach(() => {
    delete process.env.VOYAGE_API_KEY;
    vi.unstubAllGlobals();
  });

  it("returns the embeddings for each input string", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { embedding: [0.1, 0.2, 0.3] },
            { embedding: [0.4, 0.5, 0.6] },
          ],
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
      "https://api.voyageai.com/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody).toMatchObject({
      input: ["a", "b"],
      model: "voyage-3-large",
      input_type: "document",
      output_dimension: 1024,
      output_dtype: "int8",
    });
  });

  it("uses input_type=query for kind: 'query'", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ embedding: [0.1] }] }), {
        status: 200,
      }),
    );
    await embedTexts(["q"], { kind: "query" });
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.input_type).toBe("query");
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
      /voyage embedding failed/i,
    );
  });

  it("throws a typed error when fetch itself rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    await expect(embedTexts(["a"], { kind: "document" })).rejects.toThrow(
      /voyage embedding failed/i,
    );
  });
});
