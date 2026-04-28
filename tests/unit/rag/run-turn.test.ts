import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock heavy transitive dependencies that require runtime env vars / network.
vi.mock("@/sanity/lib/live", () => ({ sanityFetch: vi.fn() }));
vi.mock("@/lib/ai/rag/query/understand", () => ({
  understandQuery: vi.fn(),
  haikuUnderstandingFn: vi.fn(),
}));
vi.mock("@/lib/ai/rag/query/retrieve", () => ({ retrieve: vi.fn() }));
vi.mock("@/lib/ai/rag/query/rerank", () => ({ rerankAndDedupe: vi.fn() }));
vi.mock("@/lib/ai/tools/semantic-search-hydrate", () => ({
  hydrateProductSummaries: vi.fn(),
}));
vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/rag/flags", () => ({ isRagEnabled: () => true }));

const generateTextMock = vi.fn();
vi.mock("ai", async (orig) => ({
  ...(await orig<typeof import("ai")>()),
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

import { runAgentTurn } from "@/lib/ai/agent/run-turn";
import { startCollecting, stopCollecting } from "@/lib/ai/rag/trace";

describe("runAgentTurn", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });
  afterEach(() => {
    stopCollecting();
  });

  it("returns the assistant text and the candidates from each semanticSearch call", async () => {
    generateTextMock.mockImplementationOnce(async () => {
      // Simulate the AI SDK invoking the semanticSearch tool exactly once
      // by pushing a fake trace into the collector that startCollecting()
      // returns. The real tool would do this via emitTrace; in this contract
      // test we don't exercise the tool body.
      const sink = startCollecting();
      sink.push({
        traceId: "t",
        timestamp: new Date().toISOString(),
        durationMs: 1,
        query: { raw: "oak", historyTurns: 0 },
        understand: {
          rewritten: "oak",
          hyde: null,
          filters: {},
          fellBack: false,
          durationMs: 1,
        },
        retrieve: {
          topK: 30,
          candidateCount: 1,
          candidates: [
            {
              id: "c1",
              productId: "p1",
              score: 0.9,
              chunkType: "parent",
              text: "Blair Bedside Table — solid oak — $399.",
            },
          ],
          durationMs: 1,
        },
        rerank: { backend: "fallback", topN: 0, results: [], durationMs: 0 },
        picked: { productIds: ["p1"] },
      });
      return { text: "Try the Blair Bedside Table.", toolCalls: [] };
    });

    const result = await runAgentTurn({ query: "oak bedside" });
    expect(result.answer).toBe("Try the Blair Bedside Table.");
    expect(result.candidatesByCall).toHaveLength(1);
    expect(result.candidatesByCall[0][0]).toMatchObject({
      id: "c1",
      productId: "p1",
      score: 0.9,
      chunkType: "parent",
      text: expect.stringContaining("Blair"),
    });
  });

  it("returns empty candidatesByCall when no semanticSearch was called", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "I'm not sure what you're looking for.",
      toolCalls: [],
    });
    const result = await runAgentTurn({ query: "treadmill" });
    expect(result.candidatesByCall).toHaveLength(0);
  });
});
