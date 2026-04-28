import { generateText, stepCountIs, type ModelMessage } from "ai";
import { buildAgentConfig } from "@/lib/ai/agent/config";
import {
  startCollecting,
  stopCollecting,
  type RetrievalTrace,
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
      answer: typeof result.text === "string" ? result.text : "",
      candidatesByCall: stopCollecting().map((t) => t.retrieve.candidates),
    };
  } catch (err) {
    stopCollecting();
    throw err;
  }
}
