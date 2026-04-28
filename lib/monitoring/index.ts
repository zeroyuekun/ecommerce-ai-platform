/**
 * Thin monitoring abstraction. Currently logs to stderr; designed to be
 * swapped for a real APM (Sentry, Datadog, Axiom, PostHog, etc.) by
 * replacing the bodies of `captureException` and `captureMessage` — the
 * rest of the app only sees this interface.
 *
 * The abstraction exists for two reasons:
 *   1. Vendor choice is deferred — hiring managers reading the repo shouldn't
 *      need credentials for a specific SaaS to run it.
 *   2. Call-site ergonomics stay stable across a vendor swap; no codemod
 *      required when production observability lands.
 */

export type Severity = "info" | "warning" | "error" | "fatal";

export interface CaptureContext {
  severity?: Severity;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  userId?: string;
}

function redact(value: unknown): unknown {
  // Shallow redaction for obvious credential keys. Real APMs have richer PII
  // scrubbers; this is the floor, not the ceiling.
  if (!value || typeof value !== "object") return value;
  const banned = /token|secret|password|apikey|authorization/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = banned.test(k) ? "[REDACTED]" : v;
  }
  return out;
}

export function captureException(
  error: unknown,
  context: CaptureContext = {},
): void {
  const severity = context.severity ?? "error";
  const payload = {
    severity,
    tags: context.tags,
    extra: redact(context.extra),
    userId: context.userId,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  };
  // eslint-disable-next-line no-console
  console.error("[monitoring]", JSON.stringify(payload));
}

export function captureMessage(
  message: string,
  context: CaptureContext = {},
): void {
  const severity = context.severity ?? "info";
  const payload = {
    severity,
    tags: context.tags,
    extra: redact(context.extra),
    userId: context.userId,
    message,
  };
  // eslint-disable-next-line no-console
  console.log("[monitoring]", JSON.stringify(payload));
}

/**
 * Wraps an async route handler so thrown exceptions are captured and
 * re-thrown with the original stack. Useful for API routes:
 *
 *   export const POST = withMonitoring(async (req) => { ... });
 */
export function withMonitoring<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  tags: Record<string, string> = {},
): (...args: Args) => Promise<R> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, { tags, severity: "error" });
      throw error;
    }
  };
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Phone: optional +, then a digit, then 6+ digit/space/parens/dot/dash chars,
// then a final digit. Anchored on word boundaries so prices like $399.00
// don't match (no leading digit-context).
const PHONE_RE = /(?<!\$)(?<![\d.])\+?\d[\d\s().-]{6,}\d/g;

/**
 * Conservative PII scrubber for trace `query.raw` and similar free-text
 * fields. Masks email and phone-like patterns. Addresses and names are
 * out of scope (see Phase 1.6 spec §3 PII scrub).
 */
export function redactPII(text: string): string {
  return text.replace(EMAIL_RE, "[EMAIL]").replace(PHONE_RE, "[PHONE]");
}
