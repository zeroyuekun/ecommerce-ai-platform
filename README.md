# Kozy — AI-Powered Furniture E-commerce Platform

A full-stack e-commerce platform for a premium Australian furniture brand, built with Next.js 16, Sanity CMS, and an AI shopping assistant. Customers browse products with real-time inventory, chat with an AI agent that searches the catalog and takes actions, and check out through Stripe. Store owners manage everything from an admin dashboard with AI-generated sales insights.

## Design

The storefront design is inspired by luxury and modern furniture brands like Van Cleef & Arpels, Crate & Barrel, West Elm, and Mocka.com.au — clean layouts, generous whitespace, and letting product photography do the talking. The UI uses a grayscale palette with Cormorant Garamond for headings and DM Sans for body text, giving it an editorial feel. Full dark mode is supported across the entire site with a toggle in the header.

## Why I Built It This Way

**Sanity App SDK over REST APIs** — The admin dashboard uses Sanity's App SDK for direct document mutations instead of going through API routes. This gives the admin UI real-time reactivity without building a separate WebSocket layer. Product edits, order status changes, and inventory updates appear instantly across all connected clients.

**Clerk AgentKit for authenticated AI tools** — The AI shopping assistant adapts its capabilities based on authentication state. Signed-in users get order tracking tools scoped to their data; guests only get product search. This is handled at the agent construction level rather than with runtime permission checks, so unauthorized tools never exist in the agent's context.

**Zustand with localStorage persistence** — Cart state lives client-side in Zustand with automatic localStorage sync. No cart API, no database writes on every "add to cart" click. The cart only hits the server at checkout, where stock is validated against Sanity before creating the Stripe session.

**Webhook-driven order creation** — Orders are never created optimistically. The Stripe webhook handler creates the order in Sanity only after payment confirmation, then decrements stock atomically. This avoids the class of bugs where orders exist without payment or stock is decremented prematurely.

## Features

**Storefront**
- Product catalog with category, subcategory, material, color, and price range filters
- Multi-select filters with active filter tags, in-stock toggle, and clear all
- Full-text product search with popular search suggestions in the search bar
- Product variant grouping — same product in different colors displays as one card with clickable color swatches
- Recently viewed products carousel on product pages (tracks last 12, persists across sessions)
- Sale prices with strikethrough and New/Sale filtered views
- Breadcrumb navigation on every product page
- Collapsible product detail sections (Description, Specifications, Shipping & Returns, Care Instructions)
- Related products carousel ("You May Also Like")
- Persistent shopping cart with stock validation at checkout
- Stripe checkout with shipping address collection (44 countries)
- Order history and individual order tracking pages
- Real-time inventory updates via Sanity Live (no polling)
- Loading skeletons throughout for smooth page transitions

**AI Shopping Assistant**
- Natural language product search with structured filters (category, material, color, price range)
- Image upload — customers can attach a photo and the AI will analyse it and suggest similar products
- "Ask AI for Similar" button on product pages to find matching items
- Add to cart directly from the chat conversation with inline confirmation card
- Order history lookup scoped to the authenticated user
- Welcome screen with capability cards showing what the assistant can do
- Conversational tone modelled after luxury showroom associates
- Context-aware responses: adapts available tools and instructions based on sign-in state
- Powered by Claude via Vercel AI Gateway (swappable to other providers)

**Homepage**
- Full-screen hero banner with video section
- Side-by-side promotional banners
- Featured products carousel (auto-scrolling with navigation dots and arrows)
- Category tiles with scroll-triggered right-to-left staggered entrance animation
- Best sellers section with scroll-triggered bottom-to-top staggered entrance animation
- Scroll animations use IntersectionObserver with 0.6s ease-out transitions and 0.1s stagger between tiles
- Newsletter signup form

**Header & Navigation**
- Transparent-to-solid header transition on the homepage with backdrop blur
- Smart hide-on-scroll (hides when scrolling down, reappears when scrolling up)
- Mega dropdown showing subcategories on hover
- Mega dropdown width dynamically matched to the navigation links span (New to Sale), consistent across all categories
- Dark mode toggle with sun/moon animation
- Store locator icon linking to physical locations

**Admin Dashboard**
- AI-generated sales insights, inventory alerts, and action items (Claude-powered)
- Product CRUD with direct Sanity App SDK mutations
- Image uploader, stock and price inputs, featured/new toggles
- Order management with status workflow (paid, shipped, delivered, cancelled)
- Low stock warnings and revenue analytics
- Embedded Sanity Studio at `/studio` for content management

**Security**
- Stripe webhook error handling to ensure orders are always created on payment
- Authentication required on chatbot API endpoint
- Admin role authorisation on analytics endpoints
- Sanitised error messages — no internal details exposed to the browser

**SEO**
- `robots.ts` and `sitemap.ts` for search engine crawling
- Page titles, descriptions, and Open Graph images on product pages

**Additional Pages**
- About, Contact, Blog, FAQ, Help Centre, Privacy Policy, Returns, Gift Vouchers, Shipping, Terms & Conditions, Customer Reviews, Store Locations (6 Australian locations)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Auth | Clerk with AgentKit |
| CMS | Sanity with App SDK and TypeGen |
| Payments | Stripe with webhook-driven order flow |
| AI | Vercel AI SDK with AI Gateway (Claude Sonnet) |
| State | Zustand with localStorage persistence |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Linting | Biome |

## Project Structure

```
app/
  (app)/                # Customer-facing routes
  (admin)/admin/        # Admin dashboard
  api/
    chat/               # AI chat endpoint
    webhooks/stripe/    # Stripe webhook handler
  studio/               # Embedded Sanity Studio
components/
  app/                  # Customer UI components
  admin/                # Admin UI components
  ui/                   # shadcn/ui components
lib/
  ai/                   # AI agent config and tools
  actions/              # Server actions (checkout, newsletter, search)
  sanity/queries/       # GROQ queries with TypeGen
  store/                # Zustand stores (cart, chat, recently viewed)
sanity/
  schemaTypes/          # Sanity document schemas
tools/
  test-chatbot.ts       # Integration tests for AI chatbot tools (zero AI cost)
```

## Setup

### Prerequisites

- Node.js 20+ (CI pins Node 20)
- pnpm 10+
- Accounts: [Sanity](https://www.sanity.io/), [Clerk](https://clerk.com/), [Stripe](https://stripe.com/), [Vercel](https://vercel.com/) (for AI Gateway)

### Install and Configure

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` with your API keys:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
NEXT_PUBLIC_SANITY_ORG_ID=
SANITY_API_WRITE_TOKEN=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

AI_GATEWAY_API_KEY=
```

### Generate Types and Seed Data

```bash
pnpm typegen
npx sanity dataset import sample-data.ndjson
```

### Run

```bash
pnpm dev
```

For local Stripe webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Verification

```bash
pnpm typecheck        # strict TypeScript
pnpm lint             # Biome (zero errors required)
pnpm test             # Vitest unit tests
pnpm build            # Next.js production build
pnpm build:analyze    # opens bundle-analyzer report
```

## Production Practices

This codebase is structured as a portfolio project with the hygiene of a small production service. The goal is to demonstrate awareness of what goes into running a system, not just building one.

**Architecture decisions are documented.** Non-obvious design choices — why orders are webhook-driven, why reads go through the Sanity CDN, why the cart lives in localStorage, why the rate limiter is in-memory — are recorded as ADRs in [`docs/adr/`](./docs/adr/) using the [Michael Nygard](https://github.com/joelparkerhenderson/architecture-decision-record/tree/main/locales/en/templates/decision-record-template-by-michael-nygard) Context / Decision / Consequences format. Each ADR names the tradeoff and the migration path away from it.

**A CI pipeline guards the main branch.** [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` on every push and PR. Concurrency groups cancel superseded runs, and build env vars are stubbed so the production build validates without real secrets.

**Critical paths are unit-tested.** [`tests/unit/`](./tests/unit/) covers the cart store, the cart-stock hook (debouncing + AbortController cancellation), the rate limiter (bucket isolation, window rollover, eviction), the balanced-brace JSON extractor (LLM preamble, escaped quotes, nested braces), and the monitoring abstraction (credential redaction). Vitest is configured with `happy-dom` and `@testing-library/react` for component tests. `pnpm test` exits 0 with 44 assertions passing in ~5 seconds.

**Security headers are set at the edge.** [`next.config.ts`](./next.config.ts) emits HSTS (`max-age=63072000; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` that restricts camera/microphone/geolocation and scopes `payment` to `self` + Stripe. A `Content-Security-Policy-Report-Only` header is shipped first so Sanity Studio, Clerk, Stripe, and the AI Gateway can be observed in violation reports before flipping to enforcing mode.

**Errors have a capture point.** [`lib/monitoring/`](./lib/monitoring/) is a vendor-neutral abstraction (`captureException`, `captureMessage`, `withMonitoring`) that currently logs to stderr and redacts obvious credential fields (`token`, `secret`, `password`, `apikey`, `authorization`) from context payloads. Wire it to Sentry, Highlight, or Datadog by swapping the body of `captureException` — nothing else changes.

**Rate limiting has two backends.** `/api/chat` routes through [`lib/ai/rate-limit.ts`](./lib/ai/rate-limit.ts), which resolves to an in-memory sliding-window limiter by default and swaps to Upstash Redis automatically when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set. No code change required to promote to a distributed quota — see [ADR-0004](./docs/adr/0004-in-memory-rate-limit-tradeoff.md) for the trade-offs.

**End-to-end tests exist.** [`tests/e2e/`](./tests/e2e/) uses Playwright to smoke-test the homepage, cart drawer wiring, static informational pages, and the security-header contract (including a guard against the Permissions-Policy double-quote regression). `pnpm test:e2e` boots Next.js on port `3101` so it doesn't collide with whatever is already on `3000`. The e2e job in CI is env-gated behind `vars.ENABLE_INTEGRATION_CI = 'true'` because the dev server needs real Sanity / Clerk / Stripe credentials to render.

**Performance budgets are encoded.** [`lighthouserc.json`](./lighthouserc.json) runs Lighthouse CI against `/about` on each PR (when `ENABLE_INTEGRATION_CI` is set), asserting `performance >= 0.7`, `accessibility >= 0.9`, LCP < 3.5s, CLS < 0.1, TBT < 300ms — all as warnings so the data surfaces without blocking merges. Run locally via `pnpm lighthouse`.

**Product analytics are scaffolded but opt-in.** [`components/analytics/PostHogProvider.tsx`](./components/analytics/PostHogProvider.tsx) initialises `posthog-js` only when `NEXT_PUBLIC_POSTHOG_KEY` is set, and [`lib/analytics/server.ts`](./lib/analytics/server.ts) exposes `captureServerEvent` for order / webhook tracking. Dev captures are opt-in via `NEXT_PUBLIC_POSTHOG_DEBUG=1`.

**LLM output is parsed defensively.** [`lib/ai/json-extract.ts`](./lib/ai/json-extract.ts) is a balanced-brace state-machine parser that tolerates model preamble, trailing prose, and escaped quotes in string literals — a greedy `/\{[\s\S]*\}/` regex over-matches when the model wraps JSON in explanation.

**Line endings are normalized.** [`.gitattributes`](./.gitattributes) enforces LF in the repository and Biome is configured with `lineEnding: "lf"`, so Windows collaborators don't generate CRLF churn in PRs.

**Bundle size is observable.** `pnpm build:analyze` toggles `@next/bundle-analyzer` via the `ANALYZE=true` env var and opens the client/server bundle reports in the browser.

## Performance & Robustness Hardening (2026-04-20)

A performance and robustness audit was run across the data layer, API routes, and hot-path components. TypeScript, Biome, and `next build` all pass cleanly after the changes (typecheck exit 0, build exit 0). Key fixes:

**Data layer**
- `sanity/lib/client.ts` — enabled `useCdn: true` on the read-only client so published reads are served from Sanity's global edge cache. The write client still bypasses CDN for freshness.

**API routes**
- `app/api/chat/route.ts` — added zod schema validation, 256KB body cap, per-user in-memory rate limiter (20 requests/minute, `429` + `Retry-After`), opportunistic bucket eviction, explicit `runtime: "nodejs"` and `maxDuration: 60` to prevent cost abuse and runaway streams.
- `app/api/webhooks/stripe/route.ts` — dropped reliance on `lineItems.data[index]` ordering matching `productIds` array order. The webhook now expands `line_items.data.price.product` and matches by the `productId` stored in `product_data.metadata` at session-creation time. Added quantity sanity checks and length-mismatch guard on the session metadata payload.
- `app/api/admin/insights/route.ts` — removed the duplicate `productSalesById` Map, fused `needsRestock` / `slowMoving` / `lowStockCount` into a single inventory pass, and replaced the greedy `/\{[\s\S]*\}/` JSON extraction with a balanced-brace parser that handles LLM preamble and trailing prose without silently truncating.

**Client hooks**
- `lib/hooks/useCartStock.ts` — O(n²) `products.find()` per cart item replaced with an O(1) Map lookup. Added a 400ms debounce on cart-mutation refetches, `AbortController` cancellation of in-flight Sanity fetches when the cart changes mid-request, and a stable `productId:quantity` signature so unrelated store updates no longer trigger refetches. `hasStockIssues` is now memoised.

**Tooling**
- `biome check --write` normalised imports and formatting across 192 files. `pnpm lint` now exits 0; the remaining 39 warnings are context-dependent (skeleton index keys, hover-only dropdown handlers, UI-library role usage) and are surfaced as warnings rather than errors to keep CI honest without punishing reasonable patterns.

**Not shipped in this pass**
- `ALL_CATEGORIES_QUERY` subquery optimisation was reverted: changing the query string invalidates the generated Sanity type override (the query string is the map key in `sanity.types.ts`). Revisit after running `pnpm typegen`.

## Rollback

Each major audit is pinned to a git tag so any stage can be restored in a single command.

| Tag | State |
|-----|-------|
| `pre-audit-2026-04-20` | Before any audit work (original feature set) |
| `pre-hardening-v1` | After performance audit, before production hardening |
| `production-hardening-v1` | After production hardening (in-memory rate limit, Playwright seeded locally, unit tests) |
| `pre-hardening-v2` | After v1 tag, before Playwright / Lighthouse / Upstash / PostHog |
| `production-hardening-v2` | After v2 (current) — e2e in CI, Lighthouse budgets, Upstash swap, PostHog scaffold |

```bash
# Inspect what changed between two tags
git diff pre-hardening-v2 production-hardening-v2

# Roll back to any tagged state
git reset --hard pre-hardening-v2        # undo the v2 work only
git reset --hard pre-hardening-v1        # undo both v1 and v2 hardening
git reset --hard pre-audit-2026-04-20    # undo everything (original state)

# Return to current state after a rollback
git reset --hard production-hardening-v2
```

Tags are local until pushed. Use `git push origin --tags` to publish them.

## License

[MIT](./LICENSE.md)
