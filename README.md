# Kozy — AI-Powered Furniture E-commerce Platform

A full-stack e-commerce platform for a furniture brand, built with Next.js 16, Sanity CMS, and an AI shopping assistant. Customers browse products with real-time inventory, chat with an AI agent that searches the catalog and retrieves their orders, and check out through Stripe. Store owners manage everything from an admin dashboard with AI-generated sales insights.

## Why I Built It This Way

**Sanity App SDK over REST APIs** — The admin dashboard uses Sanity's App SDK for direct document mutations instead of going through API routes. This gives the admin UI real-time reactivity without building a separate WebSocket layer. Product edits, order status changes, and inventory updates appear instantly across all connected clients.

**Clerk AgentKit for authenticated AI tools** — The AI shopping assistant adapts its capabilities based on authentication state. Signed-in users get order tracking tools scoped to their data; guests only get product search. This is handled at the agent construction level rather than with runtime permission checks, so unauthorized tools never exist in the agent's context.

**Zustand with localStorage persistence** — Cart state lives client-side in Zustand with automatic localStorage sync. No cart API, no database writes on every "add to cart" click. The cart only hits the server at checkout, where stock is validated against Sanity before creating the Stripe session.

**Webhook-driven order creation** — Orders are never created optimistically. The Stripe webhook handler creates the order in Sanity only after payment confirmation, then decrements stock atomically. This avoids the class of bugs where orders exist without payment or stock is decremented prematurely.

## Features

**Storefront**
- Product catalog with category, material, color, and price filters
- Full-text product search with real-time results
- Persistent shopping cart with stock validation at checkout
- Stripe checkout with automatic order creation via webhooks
- Real-time inventory updates via Sanity Live (no polling)

**AI Shopping Assistant**
- Natural language product search with structured filters (material, color, price range)
- Order history lookup scoped to the authenticated user
- Context-aware responses: adapts instructions based on sign-in state
- Powered by Claude via Vercel AI Gateway (swappable to other providers)

**Admin Dashboard**
- AI-generated sales insights, inventory alerts, and action items (Claude-powered)
- Product CRUD with direct Sanity App SDK mutations
- Order management with status workflow (paid, shipped, delivered)
- Low stock warnings and revenue analytics
- Embedded Sanity Studio at `/studio` for content management

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
  sanity/queries/       # GROQ queries with TypeGen
  store/                # Zustand stores
sanity/
  schemaTypes/          # Sanity document schemas
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm
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

## License

[MIT](./LICENSE.md)
