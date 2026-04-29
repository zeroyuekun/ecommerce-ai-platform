import { describe, expect, it, vi } from "vitest";
import { assembleContext, type Compactor } from "@/lib/ai/rag/context";

const noopCompactor: Compactor = vi.fn(async () => ({
  summary: "User asked about sofas under $500 and walnut tables earlier.",
  tokensSaved: 2000,
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

  it("preserves the actual recent tail, not what the compactor returns", async () => {
    // Regression for C1 (2026-04-25): the chat route's haikuCompactor
    // returned `preserved: head.slice(-6)`, which assembleContext used in
    // place of the real tail. The user's current turn was being silently
    // dropped from every compacted conversation. This test uses unique,
    // position-encoded content so a swap of head/tail would fail loudly.
    const msgs = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      // Pad each message to ~600 chars so we cross the soft cap, but tag it
      // with its index so the assertions can identify position.
      content: `position=${i}|${"x".repeat(600)}`,
    }));
    const out = await assembleContext({
      messages: msgs,
      hardCapTokens: 32_000,
      softCapTokens: 4_000,
      compactor: noopCompactor,
      preserveRecent: 6,
    });
    expect(out.compacted).toBe(true);
    // Output is [summary, ...last-6-of-msgs], so tail content must match
    // positions 24..29 of the original input.
    const tailContent = out.messages.slice(1).map((m) => m.content);
    expect(tailContent).toEqual(msgs.slice(-6).map((m) => m.content));
    // And specifically the user's current turn (msgs[29]) must be present.
    expect(out.messages.at(-1)?.content).toContain("position=29");
  });

  it("reports inputTokens with the same safety multiplier on both branches (Bug B)", async () => {
    // Regression guard: the pre-compaction branch projected with a 1.5×
    // safety multiplier while the post-compaction branch returned the raw
    // estimate. Telemetry was inconsistent and the post-compaction hard-cap
    // check could pass at projection but exceed the provider cap once the
    // real tokenizer ran. Both branches must use the same unit now.
    //
    // We exercise the no-compaction branch and the compaction branch in
    // turn and confirm inputTokens for each has the multiplier baked in
    // (i.e. is > the raw 4-chars-per-token estimate).
    const small = makeMessages(4, 100); // ~104 raw tokens incl. overhead
    const noCompact = await assembleContext({
      messages: small,
      hardCapTokens: 32_000,
      softCapTokens: 16_000,
      compactor: noopCompactor,
    });
    expect(noCompact.compacted).toBe(false);
    // 100 chars × 4 messages / 4 chars-per-token + 4 × overhead = 116 raw.
    // With 1.5×: 174. Pin >= 150 to avoid coupling to the exact constant.
    expect(noCompact.inputTokens).toBeGreaterThanOrEqual(150);

    const big = makeMessages(40, 600);
    const compacted = await assembleContext({
      messages: big,
      hardCapTokens: 32_000,
      softCapTokens: 8_000,
      compactor: noopCompactor,
    });
    expect(compacted.compacted).toBe(true);
    // The compacted result is summary + 6-tail × 600 chars ≈ 924 raw tokens.
    // With 1.5× we should see > 1000; without, < 1000. Pin > 1000 to lock
    // the multiplier in.
    expect(compacted.inputTokens).toBeGreaterThan(1000);
  });

  it("hard-rejects when even compaction cannot fit", async () => {
    const msgs = makeMessages(200, 800);
    const tinyCompactor: Compactor = vi.fn(async () => ({
      summary: "x".repeat(50_000),
      tokensSaved: 0,
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
