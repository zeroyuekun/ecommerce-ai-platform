"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

/**
 * Client-side PostHog wiring. No-ops entirely when
 * `NEXT_PUBLIC_POSTHOG_KEY` is not set, so deployments without analytics
 * configured incur zero bundle-size cost beyond the `posthog-js` import
 * (which Next.js tree-shakes aggressively).
 *
 * Reads `NEXT_PUBLIC_POSTHOG_HOST` when pointing at a self-hosted
 * instance; defaults to the US cloud otherwise.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  useEffect(() => {
    if (!key) return;
    if (typeof window === "undefined") return;
    if (posthog.__loaded) return;

    posthog.init(key, {
      api_host: host,
      capture_pageview: "history_change",
      capture_pageleave: true,
      // Disable in dev unless explicitly opted-in via NEXT_PUBLIC_POSTHOG_DEBUG.
      loaded: (ph) => {
        if (
          process.env.NODE_ENV === "development" &&
          !process.env.NEXT_PUBLIC_POSTHOG_DEBUG
        ) {
          ph.opt_out_capturing();
        }
      },
    });
  }, [key, host]);

  if (!key) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
