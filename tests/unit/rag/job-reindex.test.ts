import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockIndex, mockFetch } = vi.hoisted(() => ({
  mockIndex: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@/lib/ai/rag/indexer/index-product", () => ({ indexProduct: mockIndex }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: mockFetch } }));
vi.mock("@upstash/qstash/nextjs", () => ({
  verifySignatureAppRouter: (handler: unknown) => handler,
}));

import { POST } from "@/app/api/jobs/reindex-product/route";

function makeRequest(body: object) {
  return new Request("http://localhost/api/jobs/reindex-product", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/jobs/reindex-product", () => {
  beforeEach(() => {
    mockIndex.mockReset().mockResolvedValue({ productId: "p_001", chunksIndexed: 9 });
    mockFetch.mockReset().mockResolvedValue({
      _id: "p_001",
      name: "X",
      slug: { current: "x" },
      description: "y",
      category: null,
      productType: null,
      material: null,
      color: null,
      dimensions: null,
      price: 100,
      stock: 1,
      assemblyRequired: false,
      isNew: false,
    });
  });

  it("calls indexProduct for the requested productId", async () => {
    const res = await POST(makeRequest({ productId: "p_001" }));
    expect(res.status).toBe(200);
    expect(mockIndex).toHaveBeenCalled();
    expect(mockIndex.mock.calls[0][0].id).toBe("p_001");
  });

  it("returns 404 when the product no longer exists in Sanity", async () => {
    mockFetch.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ productId: "missing" }));
    expect(res.status).toBe(404);
    expect(mockIndex).not.toHaveBeenCalled();
  });
});
