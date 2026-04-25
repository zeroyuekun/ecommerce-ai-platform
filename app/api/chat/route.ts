import { auth } from "@clerk/nextjs/server";
import {
  createAgentUIStreamResponse,
  gateway,
  generateText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  assembleContext,
  type Compactor,
  type ContextMessage,
} from "@/lib/ai/rag/context";
import { isRagEnabled } from "@/lib/ai/rag/flags";
import { chatRateLimiter } from "@/lib/ai/rate-limit";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";
import { captureServerEvent } from "@/lib/analytics/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

// `??` only catches null/undefined — empty-string env values fall through to
// `Number("") === 0`, which would zero the caps and 500 every request. Use
// `||` so any falsy env (unset, empty, "0") falls back to the default.
const RAG_HARD_CAP = Number(process.env.RAG_HARD_INPUT_TOKEN_CAP) || 32_000;
const RAG_SOFT_CAP = Number(process.env.RAG_SOFT_INPUT_TOKEN_CAP) || 16_000;

const haikuCompactor: Compactor = async (toCompact) => {
  const result = await generateText({
    model: gateway("anthropic/claude-haiku-4.5"),
    prompt: `Summarize the conversation below in 6 sentences or fewer. Preserve user constraints, preferences, and named entities verbatim.

Conversation:
${toCompact.map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n")}`,
  });
  return {
    summary: result.text,
    tokensSaved: 0,
  };
};

const chatRequestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          id: z.string().optional(),
          role: z.enum(["user", "assistant", "system"]),
        })
        .passthrough(),
    )
    .min(1)
    .max(40),
});

function errorResponse(
  status: number,
  message: string,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse(401, "Authentication required");

  const { ok, retryAfter } = await chatRateLimiter.check(userId);
  if (!ok) {
    return errorResponse(429, "Rate limit exceeded. Try again shortly.", {
      "Retry-After": String(retryAfter),
    });
  }
  chatRateLimiter.prune();

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return errorResponse(413, "Request body too large");
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(400, "Invalid chat payload");
  }

  const messages = parsed.data.messages as unknown as UIMessage[];

  let activeMessages = messages;
  if (isRagEnabled()) {
    try {
      const assembled = await assembleContext({
        messages: messages as unknown as ContextMessage[],
        hardCapTokens: RAG_HARD_CAP,
        softCapTokens: RAG_SOFT_CAP,
        compactor: haikuCompactor,
      });
      activeMessages = assembled.messages as unknown as typeof messages;

      // Spec §8 observability — fire-and-forget so telemetry latency never
      // blocks the user response.
      void captureServerEvent({
        distinctId: userId,
        event: "rag.turn.input_tokens",
        properties: {
          inputTokens: assembled.inputTokens,
          compacted: assembled.compacted,
        },
      });
      if (assembled.compacted) {
        void captureServerEvent({
          distinctId: userId,
          event: "rag.compaction.triggered",
          properties: {
            inputTokens: assembled.inputTokens,
            summaryPresent: typeof assembled.summary === "string",
          },
        });
      }
    } catch (err) {
      // Compaction failure must not 500 the user mid-conversation. Fall back
      // to the raw recent tail and log so we can triage.
      const { captureException } = await import("@/lib/monitoring");
      captureException(err, {
        extra: { context: "rag.assembleContext", userId },
      });
      const TAIL = 12;
      activeMessages = messages.slice(-TAIL);
    }
  }

  const agent = createShoppingAgent({ userId });

  return createAgentUIStreamResponse({
    agent,
    messages: activeMessages,
  });
}
