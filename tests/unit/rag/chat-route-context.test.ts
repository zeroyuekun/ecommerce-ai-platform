import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assemble: vi.fn(),
  stream: vi.fn(),
  captureEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/ai/rag/context", () => ({ assembleContext: mocks.assemble }));
vi.mock("ai", async (orig) => {
  const actual = await orig<typeof import("ai")>();
  return { ...actual, createAgentUIStreamResponse: mocks.stream };
});
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: "u1" }),
}));
vi.mock("@/lib/ai/rate-limit", () => ({
  chatRateLimiter: {
    check: async () => ({ ok: true, retryAfter: 0 }),
    prune: () => {},
  },
}));
vi.mock("@/lib/ai/shopping-agent", () => ({
  createShoppingAgent: () => ({ tools: {}, instructions: "" }),
}));
// `lib/analytics/server.ts` does `import "server-only"` which throws under
// happy-dom. Mock so the chat route can import the telemetry helper without
// pulling in the server-only marker.
vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: mocks.captureEvent,
}));
vi.mock("@/lib/monitoring", () => ({
  captureException: vi.fn(),
}));

import { POST } from "@/app/api/chat/route";

const baseHeaders = {
  "content-type": "application/json",
  "content-length": "100",
};

describe("POST /api/chat — Context Manager integration", () => {
  const original = process.env.RAG_ENABLED;
  beforeEach(() => {
    mocks.assemble.mockReset();
    mocks.stream
      .mockReset()
      .mockReturnValue(new Response("ok", { status: 200 }));
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
    mocks.assemble.mockResolvedValueOnce({
      messages: compacted,
      compacted: true,
      inputTokens: 1000,
    });
    await POST(
      new Request("http://x", {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      }),
    );
    expect(mocks.assemble).toHaveBeenCalled();
    expect(mocks.stream).toHaveBeenCalledWith(
      expect.objectContaining({ messages: compacted }),
    );
  });

  it("emits rag.turn.input_tokens and rag.compaction.triggered (H6)", async () => {
    process.env.RAG_ENABLED = "true";
    mocks.captureEvent.mockClear();
    mocks.assemble.mockResolvedValueOnce({
      messages: [{ role: "user", content: "x" }],
      compacted: true,
      inputTokens: 17_500,
      summary: "summary text",
    });
    await POST(
      new Request("http://x", {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      }),
    );
    const events = mocks.captureEvent.mock.calls.map(
      (call: unknown[]) => (call[0] as { event: string }).event,
    );
    expect(events).toContain("rag.turn.input_tokens");
    expect(events).toContain("rag.compaction.triggered");
  });

  it("falls back to the recent tail and does not 500 if assembleContext throws (H5)", async () => {
    process.env.RAG_ENABLED = "true";
    mocks.assemble.mockRejectedValueOnce(new Error("compaction blew up"));
    const longHistory = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `m${i}`,
    }));
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({ messages: longHistory }),
      }),
    );
    expect(res.status).toBe(200);
    // Stream handler still ran — degraded path keeps the user alive.
    expect(mocks.stream).toHaveBeenCalled();
    const passed = mocks.stream.mock.calls[0][0] as {
      messages: Array<{ content: string }>;
    };
    // Tail-truncated to 12 by route (TAIL constant) — should be the LAST 12.
    expect(passed.messages.length).toBe(12);
    expect(passed.messages.at(-1)?.content).toBe("m19");
  });
});
