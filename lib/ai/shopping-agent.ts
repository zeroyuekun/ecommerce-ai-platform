import { ToolLoopAgent } from "ai";
import { buildAgentConfig } from "@/lib/ai/agent/config";

interface ShoppingAgentOptions {
  userId: string | null;
}

/**
 * Creates a streaming shopping agent. Tool list and instructions are
 * computed by buildAgentConfig (see lib/ai/agent/config.ts) — the eval
 * harness uses the same factory to ensure parity between prod and eval.
 */
export function createShoppingAgent({ userId }: ShoppingAgentOptions) {
  const { model, instructions, tools } = buildAgentConfig({ userId });
  return new ToolLoopAgent({ model, instructions, tools });
}
