/**
 * RAG feature flag. Read at module boundary so tests can monkey-patch
 * process.env. Strict equality on the string "true" — anything else,
 * including unset, "1", "yes", or empty, is treated as off.
 *
 * Default off until cutover (see docs/superpowers/specs/2026-04-24-rag-chatbot-design.md §12).
 */
export function isRagEnabled(): boolean {
  return process.env.RAG_ENABLED === "true";
}
