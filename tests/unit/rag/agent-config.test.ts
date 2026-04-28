import { describe, expect, it, vi } from "vitest";

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
// semantic-search.ts imports trace.ts which imports analytics/server.ts
// (a Next.js server-only module). Mock it so Vite/Vitest can resolve the graph.
vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/rag/flags", () => ({ isRagEnabled: () => true }));

import { buildAgentConfig } from "@/lib/ai/agent/config";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

describe("buildAgentConfig parity", () => {
  it("createShoppingAgent uses buildAgentConfig output", () => {
    const cfg = buildAgentConfig({ userId: "u1" });
    const agent = createShoppingAgent({ userId: "u1" });

    // ToolLoopAgent exposes tools via a public getter but stores settings
    // (including instructions) privately. We assert tool names match — this
    // is sufficient to verify the factory is wired through createShoppingAgent.
    // The instruction content is covered by the separate instruction-assembly
    // tests on buildAgentConfig itself.
    const agentTools = agent.tools as Record<string, unknown>;
    expect(Object.keys(agentTools).sort()).toEqual(Object.keys(cfg.tools).sort());
  });

  it("anonymous users get no getMyOrders tool", () => {
    const cfg = buildAgentConfig({ userId: null });
    expect(cfg.tools.getMyOrders).toBeUndefined();
  });

  it("authenticated users get getMyOrders tool", () => {
    const cfg = buildAgentConfig({ userId: "u1" });
    expect(cfg.tools.getMyOrders).toBeDefined();
  });

  it("respects modelOverride", () => {
    const cfg = buildAgentConfig({
      userId: "u1",
      modelOverride: "anthropic/claude-haiku-4.5",
    });
    expect(cfg.modelId).toContain("haiku");
  });
});
