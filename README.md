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
