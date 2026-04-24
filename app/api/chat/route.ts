import { auth } from "@clerk/nextjs/server";
import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { assembleContext, type Compactor, type ContextMessage } from "@/lib/ai/rag/context";
import { isRagEnabled } from "@/lib/ai/rag/flags";
import { chatRateLimiter } from "@/lib/ai/rate-limit";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

const RAG_HARD_CAP = Number(process.env.RAG_HARD_INPUT_TOKEN_CAP ?? 32_000);
const RAG_SOFT_CAP = Number(process.env.RAG_SOFT_INPUT_TOKEN_CAP ?? 16_000);

const haikuCompactor: Compactor = async (toCompact) => {
  const { gateway, generateText } = await import("ai");
  const result = await generateText({
    model: gateway("anthropic/claude-haiku-4.5"),
    prompt: `Summarize the conversation below in 6 sentences or fewer. Preserve user constraints, preferences, and named entities verbatim. Then list the most recent 6 messages unchanged.

Conversation:
${toCompact.map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n")}`,
  });
  return {
    summary: result.text,
    tokensSaved: 0,
    preserved: toCompact.slice(-6),
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
    const assembled = await assembleContext({
      messages: messages as unknown as ContextMessage[],
      hardCapTokens: RAG_HARD_CAP,
      softCapTokens: RAG_SOFT_CAP,
      compactor: haikuCompactor,
    });
    activeMessages = assembled.messages as unknown as typeof messages;
  }

  const agent = createShoppingAgent({ userId });

  return createAgentUIStreamResponse({
    agent,
    messages: activeMessages,
  });
}
