import { beforeEach, describe, expect, it, vi } from "vitest";

const embedTextMock = vi.fn();
const queryMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/search/embed", () => ({
  embedText: (t: string) => embedTextMock(t),
}));

vi.mock("@/lib/search/index", () => ({
  getSearchIndex: () => ({
    backend: "memory",
    query: (...args: unknown[]) => queryMock(...args),
    upsert: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/sanity/lib/live", () => ({
  sanityFetch: (...args: unknown[]) => Promise.resolve({ data: fetchMock(...args) }),
}));

describe("semanticSearchTool", () => {
  beforeEach(() => {
    vi.resetModules();
    embedTextMock.mockReset();
    queryMock.mockReset();
    fetchMock.mockReset();
  });

  it("returns ranked products for a qualitative query", async () => {
    embedTextMock.mockResolvedValueOnce([0.1, 0.2]);
    queryMock.mockResolvedValueOnce([
      {
        id: "p1",
        score: 0.9,
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: null,
          price: 100,
          stock: 1,
        },
      },
    ]);
    fetchMock.mockReturnValueOnce([
      { _id: "p1", slug: "a", name: "A", price: 100, stock: 1 },
    ]);

    const { semanticSearchTool } = await import("@/lib/ai/tools/semantic-search");
    const result = await semanticSearchTool.execute(
      { query: "cozy apartment desk", topK: 8 },
      { toolCallId: "t1", messages: [] },
    );
    expect(result.found).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].id).toBe("p1");
  });

  it("returns found=false when no matches", async () => {
    embedTextMock.mockResolvedValueOnce([0.1, 0.2]);
    queryMock.mockResolvedValueOnce([]);
    const { semanticSearchTool } = await import("@/lib/ai/tools/semantic-search");
    const result = await semanticSearchTool.execute(
      { query: "xyz nonsense", topK: 8 },
      { toolCallId: "t2", messages: [] },
    );
    expect(result.found).toBe(false);
  });
});
