import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryIndex } from "@/lib/search/index";

describe("createInMemoryIndex", () => {
  let index: ReturnType<typeof createInMemoryIndex>;

  beforeEach(() => {
    index = createInMemoryIndex();
  });

  it("upserts and queries by cosine similarity", async () => {
    await index.upsert([
      {
        id: "p1",
        vector: [1, 0, 0],
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: "x",
          price: 10,
          stock: 1,
        },
      },
      {
        id: "p2",
        vector: [0, 1, 0],
        metadata: {
          _id: "p2",
          slug: "b",
          name: "B",
          category: "y",
          price: 20,
          stock: 1,
        },
      },
    ]);
    const results = await index.query([1, 0, 0], { topK: 2 });
    expect(results[0].id).toBe("p1");
    expect(results[1].id).toBe("p2");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("deletes a vector by id", async () => {
    await index.upsert([
      {
        id: "p1",
        vector: [1, 0, 0],
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: "x",
          price: 10,
          stock: 1,
        },
      },
    ]);
    await index.delete("p1");
    const results = await index.query([1, 0, 0], { topK: 5 });
    expect(results).toHaveLength(0);
  });

  it("filters by metadata category", async () => {
    await index.upsert([
      {
        id: "p1",
        vector: [1, 0, 0],
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: "dining",
          price: 10,
          stock: 1,
        },
      },
      {
        id: "p2",
        vector: [1, 0, 0],
        metadata: {
          _id: "p2",
          slug: "b",
          name: "B",
          category: "living",
          price: 20,
          stock: 1,
        },
      },
    ]);
    const results = await index.query([1, 0, 0], {
      topK: 5,
      filter: { category: "dining" },
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("p1");
  });

  it("filters by price range", async () => {
    await index.upsert([
      {
        id: "p1",
        vector: [1, 0, 0],
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: "x",
          price: 50,
          stock: 1,
        },
      },
      {
        id: "p2",
        vector: [1, 0, 0],
        metadata: {
          _id: "p2",
          slug: "b",
          name: "B",
          category: "x",
          price: 200,
          stock: 1,
        },
      },
    ]);
    const results = await index.query([1, 0, 0], {
      topK: 5,
      filter: { minPrice: 100, maxPrice: 300 },
    });
    expect(results.map((r) => r.id)).toEqual(["p2"]);
  });
});

describe("getSearchIndex", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("falls back to in-memory index when UPSTASH_VECTOR env vars are unset", async () => {
    vi.stubEnv("UPSTASH_VECTOR_REST_URL", "");
    vi.stubEnv("UPSTASH_VECTOR_REST_TOKEN", "");
    const { getSearchIndex } = await import("@/lib/search/index");
    const index = getSearchIndex();
    expect(index.backend).toBe("memory");
  });
});
