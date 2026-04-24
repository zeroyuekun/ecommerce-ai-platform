/**
 * formatToolResult — enforces a hard token cap on every tool result so that
 * the LLM context cannot be polluted by a single tool call. Per spec §7/§8.1.
 *
 * Strategy:
 * 1. If the whole payload fits, return as-is.
 * 2. If an `arrayKey` is given, drop array items from the tail until the
 *    payload fits; replace dropped items with a `notice` string telling the
 *    agent how many were available and to refine.
 */
import { estimateTokens } from "@/lib/ai/rag/tokens";

export interface FormatArgs<T extends Record<string, unknown>> {
  toolName: string;
  payload: T;
  capTokens: number;
  arrayKey?: keyof T & string;
}

export interface FormatResult<T extends Record<string, unknown>> {
  payload: T;
  truncated: boolean;
  notice?: string;
}

function payloadTokens(payload: unknown): number {
  return estimateTokens(JSON.stringify(payload));
}

export function formatToolResult<T extends Record<string, unknown>>(
  args: FormatArgs<T>,
): FormatResult<T> {
  const { toolName, payload, capTokens, arrayKey } = args;

  if (payloadTokens(payload) <= capTokens) {
    return { payload, truncated: false };
  }

  if (!arrayKey) {
    return {
      payload,
      truncated: true,
      notice: `[${toolName}] result exceeds ${capTokens}-token cap; consider refining`,
    };
  }

  const original = payload[arrayKey];
  if (!Array.isArray(original)) {
    return { payload, truncated: false };
  }

  const trimmed = [...original];
  while (trimmed.length > 0) {
    const candidate = { ...payload, [arrayKey]: trimmed } as T;
    if (payloadTokens(candidate) <= capTokens) {
      const droppedCount = original.length - trimmed.length;
      return {
        payload: candidate,
        truncated: droppedCount > 0,
        notice:
          droppedCount > 0
            ? `(${droppedCount} more available — call ${toolName} again with a refined query or tighter filters)`
            : undefined,
      };
    }
    trimmed.pop();
  }

  return {
    payload: { ...payload, [arrayKey]: [] } as T,
    truncated: true,
    notice: `(${original.length} more available but result exceeded cap; refine filters first)`,
  };
}
