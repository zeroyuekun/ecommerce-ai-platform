import { describe, it } from "vitest";

const LIVE = process.env.RAG_LIVE_TESTS === "1";

describe.runIf(LIVE)("RAG live eval (RAG_LIVE_TESTS=1)", () => {
  it("recall@5 ≥ 0.85 on the golden set", async () => {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("pnpm", ["eval:rag"], {
      stdio: "inherit",
      shell: true,
    });
    if (result.status !== 0) {
      throw new Error(`eval:rag exited with status ${result.status}`);
    }
  }, 600_000);
});
