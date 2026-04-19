import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-secret";

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

export { sign, invoke, SECRET };
