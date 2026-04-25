import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock("@/sanity/lib/live", () => ({ sanityFetch: mockFetch }));

import { filterSearchTool } from "@/lib/ai/tools/filter-search";

const sampleProducts = [
  {
    _id: "p_001",
    name: "Osaka Buffet",
    slug: "osaka-buffet",
    description: "A walnut buffet with three drawers.",
    price: 1299,
    image: { asset: { url: "https://cdn.example/osaka.jpg" } },
    category: { _id: "c1", title: "Living Room", slug: "living-room" },
    material: "wood",
    color: "walnut",
    dimensions: "150cm x 45cm x 80cm",
    stock: 3,
    featured: false,
    assemblyRequired: true,
  },
  {
    _id: "p_002",
    name: "Blair Bedside",
    slug: "blair-bedside",
    description: "A compact oak bedside.",
    price: 189,
    image: { asset: { url: "https://cdn.example/blair.jpg" } },
    category: { _id: "c2", title: "Bedroom", slug: "bedroom" },
    material: "wood",
    color: "oak",
    dimensions: "45cm x 35cm x 50cm",
    stock: 12,
    featured: false,
    assemblyRequired: false,
  },
];

describe("filterSearchTool", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns SUMMARY-ONLY product cards (no price, dimensions, stockCount, stockMessage) — C4 contract", async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleProducts });
    const out = await filterSearchTool.execute(
      {
        query: "buffet",
        category: "",
        material: "",
        color: "",
        minPrice: 0,
        maxPrice: 0,
      },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect(out.found).toBe(true);
    expect(out.products).toHaveLength(2);
    const p = out.products[0];
    // Required summary fields:
    expect(p).toMatchObject({
      id: "p_001",
      slug: "osaka-buffet",
      name: "Osaka Buffet",
      category: "Living Room",
      material: "wood",
      color: "walnut",
      productUrl: "/products/osaka-buffet",
      imageUrl: "https://cdn.example/osaka.jpg",
    });
    // Coarse stock badge (no count):
    expect(["in_stock", "low_stock", "out_of_stock", "unknown"]).toContain(
      p.stockStatus,
    );
    // The numeric/sensitive fields MUST NOT appear:
    const banned = [
      "price",
      "priceFormatted",
      "dimensions",
      "stockCount",
      "stockMessage",
      "description",
      "salePrice",
    ];
    for (const k of banned) {
      expect(p).not.toHaveProperty(k);
    }
  });

  it("includes a hint pointing the LLM at getProductDetails for numbers", async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleProducts });
    const out = await filterSearchTool.execute(
      {
        query: "",
        category: "bedroom",
        material: "",
        color: "oak",
        minPrice: 0,
        maxPrice: 0,
      },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect((out as { hint?: string }).hint).toMatch(/getProductDetails/);
  });

  it("returns an empty result with a friendly message when no products match", async () => {
    mockFetch.mockResolvedValueOnce({ data: [] });
    const out = await filterSearchTool.execute(
      {
        query: "kettle",
        category: "",
        material: "",
        color: "",
        minPrice: 0,
        maxPrice: 0,
      },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect(out.found).toBe(false);
    expect(out.products).toEqual([]);
  });

  it("survives Sanity errors with a graceful fallback", async () => {
    mockFetch.mockRejectedValueOnce(new Error("sanity 503"));
    const out = await filterSearchTool.execute(
      {
        query: "x",
        category: "",
        material: "",
        color: "",
        minPrice: 0,
        maxPrice: 0,
      },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect(out.found).toBe(false);
    expect(out.products).toEqual([]);
  });
});
