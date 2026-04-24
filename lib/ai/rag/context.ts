/**
 * Context Manager — token-budget assembly + sliding-window compaction.
 *
 * Per spec §8: keep the last 6 turns verbatim, replace older tool results
 * with one-line traces, and run a Haiku compaction call when projected
 * input tokens exceed the soft cap. The Haiku call is injected as a
 * `Compactor` so tests stay deterministic and the agent layer can swap
 * implementations.
 */
import { estimateMessageTokens } from "@/lib/ai/rag/tokens";

export interface ContextMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<{ type: string; text?: string }>;
}

export interface CompactionResult {
  /** A summary describing the compacted earlier turns. */
  summary: string;
  /** Estimated tokens removed (informational, used by callers for logging). */
  tokensSaved: number;
  /** The messages to keep verbatim (typically the last 6 turns). */
  preserved: ContextMessage[];
}

export type Compactor = (
  messagesToCompact: ContextMessage[],
) => Promise<CompactionResult>;

export interface AssembleArgs {
  messages: ContextMessage[];
  hardCapTokens: number;
  softCapTokens: number;
  /** Default 6 (3 user + 3 assistant) per spec §8.3. */
  preserveRecent?: number;
  compactor: Compactor;
}

export interface AssembleResult {
  messages: ContextMessage[];
  compacted: boolean;
  inputTokens: number;
  summary?: string;
}

const DEFAULT_PRESERVE_RECENT = 6;

export async function assembleContext(
  args: AssembleArgs,
): Promise<AssembleResult> {
  const {
    messages,
    hardCapTokens,
    softCapTokens,
    preserveRecent = DEFAULT_PRESERVE_RECENT,
    compactor,
  } = args;

  // Apply a 1.5× safety multiplier: real tokenizers diverge from the
  // 4-chars-per-token heuristic, especially for multi-turn conversations
  // with formatting overhead. This conservative budget avoids hitting the
  // provider hard cap mid-request.
  const projected = Math.ceil(estimateMessageTokens(messages) * 1.5);
  if (projected <= softCapTokens) {
    return { messages, compacted: false, inputTokens: projected };
  }

  const head = messages.slice(0, Math.max(0, messages.length - preserveRecent));
  const tail = messages.slice(-preserveRecent);

  if (head.length === 0) {
    if (projected > hardCapTokens) {
      throw new Error(
        `Context exceeds hard cap (${projected} > ${hardCapTokens}) and nothing is compactible`,
      );
    }
    return { messages, compacted: false, inputTokens: projected };
  }

  const compaction = await compactor(head);
  const summaryMessage: ContextMessage = {
    role: "system",
    content: `Conversation so far (compacted from ${head.length} earlier turns): ${compaction.summary}`,
  };
  const preserved =
    compaction.preserved.length > 0 ? compaction.preserved : tail;
  const next = [summaryMessage, ...preserved];
  const nextTokens = estimateMessageTokens(next);

  if (nextTokens > hardCapTokens) {
    throw new Error(
      `Context exceeds hard cap (${nextTokens} > ${hardCapTokens}) even after compaction`,
    );
  }

  return {
    messages: next,
    compacted: true,
    inputTokens: nextTokens,
    summary: compaction.summary,
  };
}
