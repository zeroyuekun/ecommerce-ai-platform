import { auth } from "@clerk/nextjs/server";
import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(userId);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

// Opportunistically evict expired buckets when map grows.
function pruneRateLimitBuckets() {
  if (rateLimitBuckets.size < 1024) return;
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

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

  const { ok, retryAfter } = checkRateLimit(userId);
  if (!ok) {
    return errorResponse(429, "Rate limit exceeded. Try again shortly.", {
      "Retry-After": String(retryAfter),
    });
  }
  pruneRateLimitBuckets();

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
