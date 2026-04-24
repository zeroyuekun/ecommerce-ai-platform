import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnqueue = vi.fn();
vi.mock("@upstash/qstash", () => ({
  Client: vi.fn().mockImplementation(() => ({ publishJSON: mockEnqueue })),
}));

import { POST } from "@/app/api/webhooks/sanity-rag/route";

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/webhooks/sanity-rag", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("POST /api/webhooks/sanity-rag", () => {
  beforeEach(() => {
    mockEnqueue.mockReset().mockResolvedValue({ messageId: "qm_1" });
    process.env.SANITY_RAG_WEBHOOK_SECRET = "secret";
    process.env.QSTASH_TOKEN = "qtok";
  });

  it("rejects without a matching shared secret header", async () => {
    const res = await POST(makeRequest({ _id: "x", _rev: "1", _type: "product" }));
    expect(res.status).toBe(401);
  });

  it("enqueues product reindex jobs with idempotency key {_id}:{_rev}", async () => {
    const res = await POST(
      makeRequest(
        { _id: "p_001", _rev: "rev_a", _type: "product" },
        { "x-sanity-rag-secret": "secret" },
      ),
    );
    expect(res.status).toBe(202);
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { productId: "p_001" },
        deduplicationId: "p_001:rev_a",
      }),
    );
  });

  it("ignores non-product document types with a 200", async () => {
    const res = await POST(
      makeRequest(
        { _id: "x", _rev: "1", _type: "category" },
        { "x-sanity-rag-secret": "secret" },
      ),
    );
    expect(res.status).toBe(200);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
