/**
 * Cheap token estimator. Uses the standard ~4-chars-per-token heuristic.
 * Good enough for budgeting decisions; precise counting is the LLM
 * provider's job at request time.
 */
const CHARS_PER_TOKEN = 4;
const PER_MESSAGE_OVERHEAD = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

interface MessageLike {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

export function estimateMessageTokens(messages: MessageLike[]): number {
  let total = 0;
  for (const msg of messages) {
    total += PER_MESSAGE_OVERHEAD;
    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          total += estimateTokens(part.text);
        }
      }
    }
  }
  return total;
}
