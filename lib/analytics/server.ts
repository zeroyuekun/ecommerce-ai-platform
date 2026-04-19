import "server-only";
import { PostHog } from "posthog-node";

/**
 * Server-side PostHog client. Returns `null` when not configured so
 * call sites can skip instrumentation without branching.
 *
 * Usage from a route / server action:
 * ```ts
 * const ph = getServerAnalytics();
 * ph?.capture({ distinctId: userId, event: "order.completed", properties });
 * await ph?.shutdown();
 * ```
 *
 * `shutdown()` flushes any pending events — call it at the end of any
 * short-lived request handler, otherwise events can be dropped when the
 * serverless container exits.
 */
let cached: PostHog | null | undefined;

export function getServerAnalytics(): PostHog | null {
  if (cached !== undefined) return cached;

  const key =
    process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    cached = null;
    return null;
  }

  cached = new PostHog(key, {
    host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Keep flushes snappy in serverless — we rely on explicit `shutdown()`
    // at the end of request handlers to ship remaining events.
    flushAt: 1,
    flushInterval: 0,
  });
  return cached;
}

/**
 * Helper that captures an event and immediately flushes. Safe to call
 * when analytics is disabled (returns a resolved promise).
 */
export async function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const client = getServerAnalytics();
  if (!client) return;
  client.capture(params);
  await client.shutdown();
  cached = undefined;
}
