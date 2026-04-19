import { beforeEach, describe, expect, it, vi } from "vitest";

const embedTextMock = vi.fn();
const queryMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/search/embed", () => ({
  embedText: (t: string) => embedTextMock(t),
}));

vi.mock("@/lib/search/index", () => ({
  getSearchIndex: () => ({
    backend: "memory" as const,
    query: (...args: unknown[]) => queryMock(...args),
    upsert: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/sanity/lib/client", () => ({
  client: { fetch: (...args: unknown[]) => fetchMock(...args) },
}));

async function invoke(url: string, init?: RequestInit) {
  const { GET } = await import("@/app/api/search/route");
  return GET(new Request(url, init));
}

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.resetModules();
    embedTextMock.mockReset();
    queryMock.mockReset();
    fetchMock.mockReset();
  });

  it("rejects empty query with 400", async () => {
    const res = await invoke("http://localhost/api/search");
    expect(res.status).toBe(400);
  });

  it("returns semantically ranked hydrated results", async () => {
    embedTextMock.mockResolvedValueOnce([0.1, 0.2, 0.3]);
    queryMock.mockResolvedValueOnce([
      {
        id: "p2",
        score: 0.9,
        metadata: {
          _id: "p2",
          slug: "b",
          name: "B",
          category: null,
          price: 20,
          stock: 1,
        },
      },
      {
        id: "p1",
        score: 0.8,
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: null,
          price: 10,
          stock: 1,
        },
      },
    ]);
    fetchMock.mockResolvedValueOnce([
      { _id: "p1", slug: "a", name: "A", price: 10 },
      { _id: "p2", slug: "b", name: "B", price: 20 },
    ]);

    const res = await invoke("http://localhost/api/search?q=cozy+desk");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: { _id: string }[] };
    expect(json.results.map((r) => r._id)).toEqual(["p2", "p1"]);
  });

  it("applies category filter", async () => {
    embedTextMock.mockResolvedValueOnce([0.1, 0.2]);
    queryMock.mockResolvedValueOnce([]);
    fetchMock.mockResolvedValueOnce([]);
    await invoke("http://localhost/api/search?q=table&category=dining");
    expect(queryMock).toHaveBeenCalledWith(
      [0.1, 0.2],
      expect.objectContaining({
        filter: expect.objectContaining({ category: "dining" }),
      }),
    );
  });
});
