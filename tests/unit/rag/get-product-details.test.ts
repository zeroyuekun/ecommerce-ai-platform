import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("@/sanity/lib/live", () => ({ sanityFetch: mockFetch }));

import { getProductDetailsTool } from "@/lib/ai/tools/get-product-details";

type ToolResult = Awaited<
  ReturnType<
    typeof getProductDetailsTool.execute & ((...a: never[]) => unknown)
  >
>;

describe("getProductDetailsTool", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns structured details when the slug exists", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        _id: "p_001",
        name: "Nordic Grey 3-Seater Sofa",
        slug: { current: "nordic-grey-3-seater-sofa" },
        description: "Scandinavian sofa.",
        price: 1299,
        category: { title: "Living Room", slug: { current: "living-room" } },
        material: "fabric",
        color: "grey",
        dimensions: "220cm x 95cm x 85cm",
        stock: 7,
        featured: false,
        assemblyRequired: false,
        image: { asset: { url: "https://cdn/x.jpg" } },
      },
    });
    const out = (await getProductDetailsTool.execute?.(
      {
        productSlug: "nordic-grey-3-seater-sofa",
      },
      { messages: [], toolCallId: "t1" } as never,
    )) as ToolResult;
    expect((out as { found: boolean }).found).toBe(true);
    expect((out as { product?: { slug?: string } }).product?.slug).toBe(
      "nordic-grey-3-seater-sofa",
    );
    expect(
      (out as { product?: { priceFormatted?: string } }).product
        ?.priceFormatted,
    ).toBeTruthy();
  });

  it("returns found:false when slug is missing", async () => {
    mockFetch.mockResolvedValueOnce({ data: null });
    const out = (await getProductDetailsTool.execute?.(
      { productSlug: "nope" },
      {
        messages: [],
        toolCallId: "t1",
      } as never,
    )) as ToolResult;
    expect((out as { found: boolean }).found).toBe(false);
    expect((out as { product: null }).product).toBeNull();
  });
});
