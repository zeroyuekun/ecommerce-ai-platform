import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setTestIndex, createInMemoryIndex } from "@/lib/search/index";

const SECRET = "test-secret";

const fetchMock = vi.fn();
vi.mock("@/sanity/lib/client", () => ({
  client: { fetch: (...args: unknown[]) => fetchMock(...args) },
}));

vi.mock("@/lib/search/embed", () => ({
  embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
  embedBatch: vi.fn(async (xs: string[]) => xs.map(() => [0.1, 0.2, 0.3])),
  EMBEDDING_MODEL: "openai/text-embedding-3-small",
  EMBEDDING_DIM: 1536,
}));

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

async function invoke(body: string, headers: Record<string, string>) {
  vi.stubEnv("SANITY_REVALIDATE_SECRET", SECRET);
  const { POST } = await import("@/app/api/sanity/reindex/route");
  const req = new Request("http://localhost/api/sanity/reindex", {
    method: "POST",
    headers,
    body,
  });
  return POST(req);
}

describe("POST /api/sanity/reindex — signature verification", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects requests without a signature header", async () => {
    const res = await invoke("{}", { "content-type": "application/json" });
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid signature", async () => {
    const res = await invoke("{}", {
      "content-type": "application/json",
      "sanity-webhook-signature": "badsig",
    });
    expect(res.status).toBe(401);
  });

  it("accepts requests with a valid signature", async () => {
    fetchMock.mockResolvedValueOnce(null);
    const body = JSON.stringify({
      _id: "prod-1",
      _type: "product",
      operation: "update",
    });
    const res = await invoke(body, {
      "content-type": "application/json",
      "sanity-webhook-signature": sign(body, SECRET),
    });
    expect(res.status).toBeLessThan(500);
    expect(res.status).not.toBe(401);
  });
});

describe("POST /api/sanity/reindex — dispatch", () => {
  beforeEach(() => {
    vi.resetModules();
    __setTestIndex(createInMemoryIndex());
    fetchMock.mockReset();
  });

  it("upserts the product on update operation", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "p1",
      slug: "oak",
      name: "Oak Desk",
      description: "Solid oak",
      price: 500,
      stock: 3,
      material: "wood",
      color: "oak",
      category: "office",
    });
    const body = JSON.stringify({
      _id: "p1",
      _type: "product",
      operation: "update",
    });
    const res = await invoke(body, {
      "content-type": "application/json",
      "sanity-webhook-signature": sign(body, SECRET),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { action?: string };
    expect(json.action).toBe("upserted");
  });

  it("deletes from index on delete operation", async () => {
    const body = JSON.stringify({
      _id: "p1",
      _type: "product",
      operation: "delete",
    });
    const res = await invoke(body, {
      "content-type": "application/json",
      "sanity-webhook-signature": sign(body, SECRET),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { action?: string };
    expect(json.action).toBe("deleted");
  });
});
