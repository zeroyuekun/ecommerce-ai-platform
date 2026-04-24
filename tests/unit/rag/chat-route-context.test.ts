import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assemble: vi.fn(),
  stream: vi.fn(),
}));

vi.mock("@/lib/ai/rag/context", () => ({ assembleContext: mocks.assemble }));
vi.mock("ai", async (orig) => {
  const actual = await orig<typeof import("ai")>();
  return { ...actual, createAgentUIStreamResponse: mocks.stream };
});
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "u1" }) }));
vi.mock("@/lib/ai/rate-limit", () => ({
  chatRateLimiter: { check: async () => ({ ok: true, retryAfter: 0 }), prune: () => {} },
}));
vi.mock("@/lib/ai/shopping-agent", () => ({
  createShoppingAgent: () => ({ tools: {}, instructions: "" }),
}));

import { POST } from "@/app/api/chat/route";

const baseHeaders = { "content-type": "application/json", "content-length": "100" };

describe("POST /api/chat — Context Manager integration", () => {
  const original = process.env.RAG_ENABLED;
  beforeEach(() => {
    mocks.assemble.mockReset();
    mocks.stream.mockReset().mockReturnValue(new Response("ok", { status: 200 }));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.RAG_ENABLED;
    else process.env.RAG_ENABLED = original;
  });

  it("does NOT call assembleContext when flag is off", async () => {
    delete process.env.RAG_ENABLED;
    await POST(
      new Request("http://x", {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      }),
    );
    expect(mocks.assemble).not.toHaveBeenCalled();
    expect(mocks.stream).toHaveBeenCalled();
  });

  it("DOES call assembleContext when flag is on, and uses its output", async () => {
    process.env.RAG_ENABLED = "true";
    const compacted = [{ role: "user", content: "compacted" }];
    mocks.assemble.mockResolvedValueOnce({ messages: compacted, compacted: true, inputTokens: 1000 });
    await POST(
      new Request("http://x", {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      }),
    );
    expect(mocks.assemble).toHaveBeenCalled();
    expect(mocks.stream).toHaveBeenCalledWith(expect.objectContaining({ messages: compacted }));
  });
});
