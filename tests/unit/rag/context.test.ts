import { describe, expect, it, vi } from "vitest";
import { assembleContext, type Compactor } from "@/lib/ai/rag/context";

const noopCompactor: Compactor = vi.fn(async (msgs) => ({
  summary: "User asked about sofas under $500 and walnut tables earlier.",
  tokensSaved: 2000,
  preserved: msgs.slice(-6),
}));

function makeMessages(n: number, sizePerMessage = 200) {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: "x".repeat(sizePerMessage),
  }));
}

describe("assembleContext", () => {
  it("passes through small conversations untouched", async () => {
    const msgs = makeMessages(4, 100);
    const out = await assembleContext({
      messages: msgs,
      hardCapTokens: 32_000,
      softCapTokens: 16_000,
      compactor: noopCompactor,
    });
    expect(out.compacted).toBe(false);
    expect(out.messages).toEqual(msgs);
  });

  it("invokes compactor when projected tokens exceed soft cap", async () => {
    const msgs = makeMessages(40, 600);
    const out = await assembleContext({
      messages: msgs,
      hardCapTokens: 32_000,
      softCapTokens: 8_000,
      compactor: noopCompactor,
    });
    expect(out.compacted).toBe(true);
    expect(noopCompactor).toHaveBeenCalled();
    expect(out.messages.length).toBeLessThan(msgs.length);
    expect(out.messages.at(-1)).toEqual(msgs.at(-1));
  });

  it("hard-rejects when even compaction cannot fit", async () => {
    const msgs = makeMessages(200, 800);
    const tinyCompactor: Compactor = vi.fn(async (m) => ({
      summary: "x".repeat(50_000),
      tokensSaved: 0,
      preserved: m.slice(-6),
    }));
    await expect(
      assembleContext({
        messages: msgs,
        hardCapTokens: 1_000,
        softCapTokens: 500,
        compactor: tinyCompactor,
      }),
    ).rejects.toThrow(/exceeds hard cap/i);
  });
});
