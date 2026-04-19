/**
 * Balanced-brace JSON extraction for LLM outputs.
 * Models often wrap JSON in prose ("Here's the result: { ... }. Let me know...")
 * — a greedy regex like /\{[\s\S]*\}/ over-matches when there are multiple
 * objects. This state-machine parser walks the string once, tracks string
 * escapes, and returns the first top-level balanced object.
 */

export function extractBalancedJson(text: string): string | null {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parses JSON, falling back to balanced-brace extraction if the raw text
 * isn't valid JSON on its own (e.g., wrapped in model preamble).
 */
export function safeParseJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const candidate = extractBalancedJson(trimmed);
    if (!candidate) throw new Error("No JSON object found in response");
    return JSON.parse(candidate) as T;
  }
}
