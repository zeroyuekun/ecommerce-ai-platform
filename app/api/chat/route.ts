import { auth } from "@clerk/nextjs/server";
import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { chatRateLimiter } from "@/lib/ai/rate-limit";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

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

  const { ok, retryAfter } = chatRateLimiter.check(userId);
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

  const agent = createShoppingAgent({ userId });

  return createAgentUIStreamResponse({
    agent,
    messages,
  });
}
