import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  understand: vi.fn(),
  retrieve: vi.fn(),
  rerank: vi.fn(),
  hydrate: vi.fn(),
  emitTrace: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/rag/query/understand", () => ({
  understandQuery: mocks.understand,
  haikuUnderstandingFn: vi.fn(),
}));
vi.mock("@/lib/ai/rag/query/retrieve", () => ({ retrieve: mocks.retrieve }));
vi.mock("@/lib/ai/rag/query/rerank", () => ({ rerankAndDedupe: mocks.rerank }));
vi.mock("@/lib/ai/tools/semantic-search-hydrate", () => ({
  hydrateProductSummaries: mocks.hydrate,
}));
vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/ai/rag/trace", async (orig) => {
  const actual = await orig<typeof import("@/lib/ai/rag/trace")>();
  return { ...actual, emitTrace: mocks.emitTrace };
});

import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";

describe("semanticSearchTool", () => {
  beforeEach(() => {
    mocks.understand.mockReset().mockResolvedValue({
      rewritten: "x",
      filters: { maxPrice: 500 },
      hyde: null,
      fellBack: false,
    });
    mocks.retrieve.mockReset().mockResolvedValue([
      {
        id: "p1#parent",
        score: 0.9,
        productId: "p1",
        chunkType: "parent",
        metadata: {
          product_id: "p1",
          chunk_type: "parent",
          text: "Walnut coffee table · Material: walnut · Price: AUD 100",
        },
      },
    ]);
    mocks.rerank.mockReset().mockResolvedValue([
      {
        id: "p1#parent",
        score: 0.95,
        productId: "p1",
        chunkType: "parent",
        metadata: {
          product_id: "p1",
          chunk_type: "parent",
          text: "Walnut coffee table · Material: walnut · Price: AUD 100",
        },
      },
    ]);
    mocks.hydrate.mockReset().mockResolvedValue({
      p1: {
        id: "p1",
        slug: "x",
        name: "X",
        oneLine: "x.",
        price: 100,
        priceFormatted: "$100",
        keyMaterials: "oak",
        stockStatus: "in_stock",
        imageUrl: null,
        productUrl: "/products/x",
      },
    });
  });

  it("runs the pipeline and returns formatted products", async () => {
    const out = await semanticSearchTool.execute(
      { query: "cozy reading chair" },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect(out.found).toBe(true);
    expect(out.products[0].id).toBe("p1");
    expect(out.products[0].relevanceScore).toBe(0.95);
  });

  it("respects user-supplied filters by merging with extracted ones", async () => {
    await semanticSearchTool.execute(
      { query: "x", filters: { material: "oak" } },
      { messages: [], toolCallId: "t1" } as never,
    );
    const retrieveArgs = mocks.retrieve.mock.calls[0][0];
    expect(retrieveArgs.filters.material).toBe("oak");
    expect(retrieveArgs.filters.maxPrice).toBe(500);
  });

  it("returns an empty result with a friendly message when retrieval is empty", async () => {
    mocks.retrieve.mockResolvedValueOnce([]);
    const out = await semanticSearchTool.execute({ query: "anything" }, {
      messages: [],
      toolCallId: "t1",
    } as never);
    expect(out.found).toBe(false);
    expect(out.products).toEqual([]);
  });

  it("hands the reranker the chunk text from metadata, not the chunk id (C3)", async () => {
    await semanticSearchTool.execute({ query: "cozy reading chair" }, {
      messages: [],
      toolCallId: "t1",
    } as never);
    const rerankArgs = mocks.rerank.mock.calls[0][0];
    // candidateTexts must come from metadata.text — the pre-fix bug used
    // `${chunk_type}:${id}` which destroyed Cohere's signal entirely.
    expect(rerankArgs.candidateTexts["p1#parent"]).toContain("walnut");
    expect(rerankArgs.candidateTexts["p1#parent"]).not.toMatch(/^parent:/);
  });

  it("threads conversation history into understandQuery for anaphora resolution", async () => {
    // Spec §4 step [2]: query understanding needs the last few turns to
    // resolve "the blue one"-style references. Regression for the
    // history=[] hardcode that lived in this tool before 2026-04-26.
    await semanticSearchTool.execute({ query: "show me more like that" }, {
      messages: [
        { role: "user", content: "I want a walnut sofa" },
        { role: "assistant", content: "Here are walnut sofas under $1500." },
      ],
      toolCallId: "t1",
    } as never);
    const args = mocks.understand.mock.calls.at(-1)?.[0];
    expect(args.history).toHaveLength(2);
    expect(args.history[0]).toEqual({
      role: "user",
      content: "I want a walnut sofa",
    });
    expect(args.history[1].role).toBe("assistant");
  });

  it("ignores non-string content parts and clamps history to the recent window", async () => {
    const longHistory = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `turn-${i}`,
    }));
    await semanticSearchTool.execute({ query: "anything" }, {
      messages: longHistory,
      toolCallId: "t1",
    } as never);
    const args = mocks.understand.mock.calls.at(-1)?.[0];
    // HISTORY_TURNS_FOR_REWRITE = 6; only the last 6 turns enter the rewrite.
    expect(args.history.length).toBeLessThanOrEqual(6);
    expect(args.history.at(-1).content).toBe("turn-19");
  });

  it("falls back to chunk-id stub when metadata.text is missing (pre-reindex safety)", async () => {
    mocks.retrieve.mockResolvedValueOnce([
      {
        id: "p9#description",
        score: 0.7,
        productId: "p9",
        chunkType: "description",
        metadata: { product_id: "p9", chunk_type: "description" }, // no text
      },
    ]);
    mocks.rerank.mockResolvedValueOnce([
      {
        id: "p9#description",
        score: 0.8,
        productId: "p9",
        chunkType: "description",
        metadata: { product_id: "p9", chunk_type: "description" },
      },
    ]);
    mocks.hydrate.mockResolvedValueOnce({
      p9: {
        id: "p9",
        slug: "x",
        name: "X",
        oneLine: "x.",
        price: 100,
        priceFormatted: "$100",
        keyMaterials: "oak",
        stockStatus: "in_stock",
        imageUrl: null,
        productUrl: "/products/x",
      },
    });
    const out = await semanticSearchTool.execute({ query: "x" }, {
      messages: [],
      toolCallId: "t1",
    } as never);
    expect(out.found).toBe(true);
    const rerankArgs = mocks.rerank.mock.calls.at(-1)?.[0];
    expect(rerankArgs.candidateTexts["p9#description"]).toMatch(
      /^description:p9#description$/,
    );
  });
});

describe("semanticSearch trace emission", () => {
  beforeEach(() => {
    mocks.emitTrace.mockClear();
  });

  it("emits exactly one trace per execute call, with full pipeline fields", async () => {
    await semanticSearchTool.execute({ query: "oak bedside table" }, {
      toolCallId: "t1",
      messages: [],
    } as never);
    expect(mocks.emitTrace).toHaveBeenCalledTimes(1);
    const [trace] = mocks.emitTrace.mock.calls[0];
    expect(trace).toMatchObject({
      query: { raw: "oak bedside table" },
      understand: expect.objectContaining({ rewritten: expect.any(String) }),
      retrieve: expect.objectContaining({ topK: 30 }),
      rerank: expect.objectContaining({
        backend: expect.stringMatching(/cohere|fallback/),
      }),
      picked: expect.objectContaining({ productIds: expect.any(Array) }),
    });
  });

  it("emits a trace with error.stage='retrieve' when retrieve throws", async () => {
    mocks.retrieve.mockRejectedValueOnce(new Error("Pinecone timeout"));
    await expect(
      semanticSearchTool.execute({ query: "x" }, {
        toolCallId: "t2",
        messages: [],
      } as never),
    ).rejects.toThrow();
    const last = mocks.emitTrace.mock.calls.at(-1);
    expect(last?.[0]).toMatchObject({
      error: { stage: "retrieve", message: "Pinecone timeout" },
    });
  });
});
