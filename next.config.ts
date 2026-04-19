import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Content-Security-Policy in report-only mode for v1. A blocking CSP would
// break the Sanity Studio, Clerk, and Stripe iframes; report-only lets us see
// violations in the browser console first and tighten the policy incrementally.
const reportOnlyCsp = [
  "default-src 'self'",
  // Next.js runtime needs 'unsafe-inline' + 'unsafe-eval' in dev; locking both
  // down in prod is a separate exercise (requires nonces via middleware).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.*.dev https://us-assets.i.posthog.com https://eu-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://cdn.sanity.io https://images.unsplash.com https://images.listonce.com.au https://content.api.news https://cdn.decorilla.com https://www.decorilla.com https://cdn-bnokp.nitrocdn.com https://img.clerk.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.sanity.io https://api.stripe.com https://*.clerk.accounts.dev https://clerk.*.dev https://api.openai.com https://api.anthropic.com https://ai-gateway.vercel.sh https://us.i.posthog.com https://eu.i.posthog.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
  "media-src 'self' https://cdn.sanity.io",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  // `upgrade-insecure-requests` is ignored by browsers when delivered in a
  // report-only policy; it is re-added when the policy is promoted to the
  // enforcing `Content-Security-Policy` header.
].join("; ");

const securityHeaders = [
  {
    // Long-lived HSTS once deployed over HTTPS; harmless on localhost.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // Permissions-Policy is a Structured Fields header: origin strings must
    // use double quotes. Single quotes parse-fail silently, so the header
    // has no effect — see `Permissions-Policy` header tests for the guard.
    key: "Permissions-Policy",
    value:
      'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://js.stripe.com")',
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.listonce.com.au" },
      { protocol: "https", hostname: "content.api.news" },
      { protocol: "https", hostname: "cdn.decorilla.com" },
      { protocol: "https", hostname: "www.decorilla.com" },
      { protocol: "https", hostname: "cdn-bnokp.nitrocdn.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
