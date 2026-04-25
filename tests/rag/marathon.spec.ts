import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleContext, type ContextMessage } from "@/lib/ai/rag/context";

const LIVE = process.env.RAG_LIVE_TESTS === "1";

interface Dialogue {
  id: string;
  turns: { role: "user" | "assistant"; content: string }[];
  assertions: Array<
    | { atTurn: number; type: "needle"; value: string }
    | { atTurn: number; type: "input_tokens_below"; value: number }
  >;
}

const dialogues: Dialogue[] = JSON.parse(
  readFileSync(path.resolve("tests/rag/multi-turn.json"), "utf8"),
);

describe.runIf(LIVE)("Marathon multi-turn dialogues", () => {
  for (const d of dialogues) {
    it(`${d.id}: load-bearing details survive compaction`, async () => {
      // Use a deterministic mock compactor that preserves the *exact text*
      // of the user's earliest constraints — proves the prompt design
      // works once Haiku is swapped in for real.
      const stub = async (msgs: ContextMessage[]) => ({
        summary: msgs
          .map(
            (m) =>
              `${m.role}: ${typeof m.content === "string" ? m.content : ""}`,
          )
          .join(" | ")
          .slice(0, 4000),
        tokensSaved: 0,
      });

      let history: ContextMessage[] = [];
      for (let i = 0; i < d.turns.length; i += 1) {
        const turn = d.turns[i];
        history.push({ role: turn.role, content: turn.content });
        const assembled = await assembleContext({
          messages: history,
          hardCapTokens: 32_000,
          softCapTokens: 4_000,
          compactor: stub,
        });
        history = assembled.messages;

        const checks = d.assertions.filter((a) => a.atTurn === i + 1);
        for (const c of checks) {
          if (c.type === "needle") {
            const flat = assembled.messages
              .map((m) => (typeof m.content === "string" ? m.content : ""))
              .join(" ");
            expect(flat).toContain(c.value);
          }
          if (c.type === "input_tokens_below") {
            expect(assembled.inputTokens).toBeLessThan(c.value);
          }
        }
      }
    });
  }
});
