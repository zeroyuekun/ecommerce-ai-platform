# Production Hardening v1 — Design

**Date:** 2026-04-20
**Goal:** Bring `ecommerce-ai-platform` to a mid-level software-engineer portfolio bar with senior-level polish, so it reads as "this person builds production-grade systems" to a technical hiring manager.
**Non-goal:** Enterprise-scale concerns (multi-region failover, SOC2 audit trails, custom SLO dashboards). This is a portfolio, not a revenue-bearing system.

## Context

An April 2026 performance & robustness audit already landed (see `README.md` → "Performance & Robustness Hardening"). That pass fixed hot-path issues: CDN reads, zod validation on the chat API, a rate limiter, an O(n²) cart-stock bug, balanced-brace JSON parsing for the insights route, and Stripe webhook ordering independence.

What's still missing — the things a hiring manager greps for in the first 30 seconds — is the scaffolding *around* the code: tests, CI, observability, security headers, and written decisions.

## Scope — v1 Checklist

Ranked by ROI-to-effort. Everything above the line ships in v1. Below the line is queued for v2 or skippable.

### Shipping in v1

1. **Security headers** (`next.config.ts` → `async headers()`) — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. 30 min. High visibility on any security-curious reviewer.
2. **Test infrastructure** — Vitest + `@testing-library/react`. Not chasing coverage %; instead writing tests on the *tricky* code paths that the audit touched, which doubles as a talking point in interviews:
   - `lib/ai/rate-limit.test.ts` — per-user bucket expiry, eviction, retry-after
   - `lib/ai/json-extract.test.ts` — balanced-brace parser against preamble/trailing prose/nested objects
   - `lib/store/cart-store.test.ts` — add, increment, remove, hydration
   - `lib/hooks/useCartStock.test.ts` — debounce, abort cancellation, stock map shape
3. **GitHub Actions CI** — `.github/workflows/ci.yml` running `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` on `push` and `pull_request`. Matrix on Node 20 only (Vercel default).
4. **Error tracking (Sentry)** — `@sentry/nextjs`, wrapped around API routes and client-side errors. Uses `SENTRY_DSN` env var; falls back to no-op when unset so local dev doesn't noise up.
5. **ADRs** (`docs/adr/`) — 4 decisions documented as ADR-0001 through ADR-0004:
   - ADR-0001: Webhook-driven order creation (vs. optimistic)
   - ADR-0002: Sanity CDN for reads, bypass for writes
   - ADR-0003: Zustand + localStorage cart (vs. server-owned cart)
   - ADR-0004: In-memory rate limiter tradeoff + migration path to Vercel KV / Upstash
6. **Accessibility pass** — fix the top ~20 Biome a11y findings: SVG `<title>`, `label`/control associations, `noButtonTypeAttribute`, and `useKeyWithClickEvents` on interactive divs. Not all 53; focus on user-visible surfaces.
7. **Bundle analyzer** — `@next/bundle-analyzer` wrapper on `next.config.ts` + `pnpm build:analyze` script. One-command "how big is the ship?" answer for any interviewer who asks.

### Queued for v2 (explicitly *not* shipping now)

- Playwright e2e (checkout flow, add-to-cart, AI chat happy path) — valuable but 3-4 hrs and overlaps Vitest enough for v1.
- Lighthouse CI on PRs — needs a hosted preview URL; deferred until Vercel preview deploys are wired through CI.
- Durable rate limiter (Vercel KV / Upstash) — the ADR will acknowledge the in-memory limitation so it reads as "I know this needs to change at scale" instead of oversight.
- Product analytics (PostHog) — nice-to-have but adds a third-party SDK to the client bundle for zero hiring signal.

## Architecture Decisions

**Testing — why Vitest over Jest:** Vitest has native TS/ESM, first-class Vite-pipeline config, and is the de facto default in the Next.js 16 ecosystem. Jest requires `next/jest` shims and has slower cold start. For a reviewer skimming `package.json`, Vitest signals "current".

**Testing — why no e2e in v1:** Playwright browsers are ~400MB in CI and the checkout flow requires Stripe test-mode keys in GitHub secrets, which means the test is flaky against Stripe's sandbox. The ROI in v1 is the *existence* of tests (the red CI badge → green CI badge signal on the README), not end-to-end coverage.

**Security headers — CSP policy:** Use a report-only CSP to start. A blocking CSP on a Next.js app with Sanity Studio, Clerk, and Stripe embedded iframes is a guaranteed-to-break-something footgun for v1. Report-only signals the decision was considered.

**Sentry — why DSN-optional:** Gate the init behind `process.env.SENTRY_DSN`. This keeps the repo runnable for a reviewer cloning it without signing up for Sentry, while still showing the integration is present.

**ADRs — why Michael Nygard format:** Shortest industry-standard ADR template (Context / Decision / Consequences). Four ADRs × ~300 words each reads as "this person thinks before they commit" without becoming a doc-authoring project.

## Build Sequence

Each step is independent; failures don't cascade:

1. Add Vitest + testing-library to `devDependencies`, write `vitest.config.ts`, update `package.json` scripts.
2. Write the four baseline test files against existing modules.
3. Add security headers to `next.config.ts`.
4. Scaffold `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` with DSN-gated init.
5. Write the four ADRs.
6. Add bundle-analyzer wrapper (env-gated: only active when `ANALYZE=true`).
7. Fix the chosen a11y findings.
8. Add `.github/workflows/ci.yml`.
9. Update `README.md` with a "Production Practices" section linking to ADRs, CI badge, test status.

## Verification

After each step: `pnpm typecheck && pnpm lint` must remain clean.
Final gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all exit 0 locally.
Post-push: GitHub Actions run completes green on the first try.

## Rollback

Working on top of commit `b8c0eb6` (post-audit). Rollback tag `pre-audit-2026-04-20` already exists for the prior safety net. If v1 breaks anything, `git revert` the v1 commit — it's intentionally shaped as a single atomic addition of scaffolding, not a rewrite.
