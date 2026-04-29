import { generateText, type ModelMessage, stepCountIs } from "ai";
import { buildAgentConfig } from "@/lib/ai/agent/config";
import {
  type RetrievalTrace,
  startCollecting,
  stopCollecting,
} from "@/lib/ai/rag/trace";

export interface RunTurnInput {
  query: string;
  history?: ModelMessage[];
  /**
   * Optional model override forwarded to buildAgentConfig. Used by the
   * eval CLI's cheaper-still mode.
   */
  modelOverride?: string;
}

export interface RunTurnResult {
  answer: string;
  /**
   * Candidates from each semanticSearch invocation in this turn, in call
   * order. The faithfulness checker uses element [0] for grading.
   */
  candidatesByCall: RetrievalTrace["retrieve"]["candidates"][];
}

/**
 * Non-streaming agent turn used by the eval harness (Task 10) and any
 * future test suite that needs to grade an agent's full response.
 *
 * NOT concurrent-safe: the in-process trace collector at `lib/ai/rag/trace.ts`
 * is module-global and sequential-only. A parallel eval harness must
 * serialize calls to this function — calling it twice in parallel will
 * conflate or drop traces. AsyncLocalStorage is the rigorous fix and is
 * deferred to §8 of the Phase 1.6 spec.
 */
export async function runAgentTurn({
  query,
  history = [],
  modelOverride,
}: RunTurnInput): Promise<RunTurnResult> {
  const { model, instructions, tools } = buildAgentConfig({
    userId: null,
    modelOverride,
  });

  startCollecting();
  try {
    const result = await generateText({
      model,
      system: instructions,
      tools,
      messages: [
        ...history,
        { role: "user", content: [{ type: "text", text: query }] },
      ],
      // Allow up to 4 tool-loop steps, matching the chat route's behavior.
      stopWhen: stepCountIs(4),
    });

    return {
      answer: result.text,
      candidatesByCall: stopCollecting().map((t) => t.retrieve.candidates),
    };
  } catch (err) {
    stopCollecting();
    throw err;
  }
}
