/**
 * Node-compatible shim for lib/analytics/server.
 *
 * The real implementation imports `server-only` which throws in plain
 * Node/tsx. The eval harness (and other CLI tools) only need no-op
 * analytics — PostHog events from the eval CLI are noise anyway.
 */

export function getServerAnalytics(): null {
  return null;
}

export async function captureServerEvent(_params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  // no-op in CLI context
}
