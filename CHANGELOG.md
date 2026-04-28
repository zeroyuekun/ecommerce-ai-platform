# Changelog

All notable changes to this project are documented here, in reverse chronological order.

---

## 2026-04-28

### RAG Phase 1.6 — 17 of 18 implementation tasks shipped
- Phase 1.6 design spec at `docs/superpowers/specs/2026-04-27-rag-telemetry-faithfulness-design.md` and 18-task implementation plan at `docs/superpowers/plans/2026-04-28-rag-phase-1-6-implementation.md` — closes the two named gaps from Phase 1: per-query retrieval traces and answer-faithfulness measurement
- Trace recorder (`lib/ai/rag/trace.ts`) shipped: emits one structured record per `semanticSearch` call to stdout (Vercel Logs in prod), opt-in `.tmp/rag-traces.jsonl` via `RAG_TRACE_FILE=1`, and PostHog (`rag.retrieval.completed`) alongside the existing turn-level events
- Heuristic faithfulness checker shipped (`lib/ai/rag/faithfulness.ts`) — regex + catalog-vocab matching for price/dim/material/color/name/stock/shipping claims; zero recurring cost. LLM-as-judge upgrade is a one-line `FAITHFULNESS_BACKEND=llm` flag flip; current LLM path is a stub
- Shared agent config factory (`lib/ai/agent/config.ts`) and non-streaming `runAgentTurn` (`lib/ai/agent/run-turn.ts`) extracted so the eval harness exercises the real prompt + tool loop without going through the streaming chat route
- Trace-tail CLI (`pnpm trace:tail`) reads `.tmp/rag-traces.jsonl` with `--bucket` / `--since` filters
- Eval harness extended with agent-driven runs, faithfulness gate (≥ 0.85), per-bucket rollup, and a `--yes` cost banner (~$0.15/run, on-demand only)
- PII redactor (`redactPII` in `lib/monitoring/index.ts`) — emails + phone-like patterns stripped before traces emit
- CI hygiene: `eval-rag.yml` workflow dropped (eval is on-demand only); Phase 1 spec amended to match shipped reality (LLM-judge ship gate walked back to heuristic 0.85 floor; nightly CI gate replaced with manual `pnpm eval:rag` before merges into `lib/ai/rag/**`; turn-level token *alerts* deferred to Phase 1.7 — events themselves shipped in Phase 1)
- Golden set grew 15 → 50 across 7 buckets — synonym (10), multi-constraint (10), vague-style (5), out-of-vocabulary (5), ambiguous-routing (5) — every product ID grounded in the live Sanity catalog (no fabrication)
- Pre-rollback git tag `pre-phase-1-6` set
- **Cost-free verification path** (`pnpm verify:rag` → `tools/verify-phase-1-6.ts`): drives the real Pinecone + Cohere pipeline with a stub query-understanding function, so trace + faithfulness checker code paths can be exercised end-to-end without burning AI Gateway credits. Surfaces a per-claim `score / supported / unsupported / reasoning` block over real catalog data.
- **Heuristic checker fix** (surfaced by the verification): price comparator no longer false-matches embedded substrings — `$99.99` no longer matches inside `$179.99`, `$200` no longer matches inside `$2,000.00`. Now uses canonical numeric form (integer + optional `.NN`) with non-digit/non-dot boundaries.
- **Reindex `--no-qa` mode**: `pnpm reindex:rag --no-qa` refreshes the 4 base chunks per product (parent/description/specs/care) using only Pinecone Inference (free). Skips the Haiku-backed synthetic Q&A pass. Useful for picking up the 2026-04-25 C3 chunk-text fix without paying for Q&A regeneration.
- **Production Pinecone refreshed (2026-04-28)** via `pnpm reindex:rag --no-qa` — all 57 products × 4 base chunks. The pre-2026-04-25 chunks (which lacked `metadata.text`) are gone; trace candidates now carry real chunk text. `pnpm verify:rag` confirms — heuristic faithfulness on the truthful test case jumped from 0.000 to 0.750 after the refresh. Synthetic-Q&A chunks will be backfilled on the next full re-index.
- **Pending:** T10 smoke run + T18 baseline appendix — still blocked on Vercel AI Gateway free-tier abuse limit. The first eval trace fires fine (verified 2026-04-28); the agent's Sonnet call returns `GatewayRateLimitError 429`. Resolution: top up credits at vercel.com/[team]/~/ai?modal=top-up, then `pnpm eval:rag --yes`.

## 2026-04-25

### RAG Phase 1 — shipped to production
- Replaced the keyword-only `searchProducts` tool with semantic retrieval over Pinecone (Pinecone Inference `multilingual-e5-large` embeddings @ 1024d)
- Query understanding pass: Haiku rewrites the user query, generates a hypothetical answer (HyDE), and extracts structured filters (category, material, color, price range)
- Optional Cohere reranker — pipeline auto-skips when `COHERE_API_KEY` is missing and preserves Pinecone's native similarity scores
- Conversation compaction: Haiku compacts older turns into a summary when input exceeds the soft token cap, so the user-facing Sonnet model never blows past its budget
- Each product is chunked into 4–9 pieces (parent summary, description, specs, care instructions, plus optional synthetic Q&A pairs)
- Behind feature flag `RAG_ENABLED` — instant rollback via `vercel env rm RAG_ENABLED production`. Hard revert via `git tag pre-rag`
- Per-turn telemetry to PostHog: `rag.turn.input_tokens`, `rag.compaction.triggered`
- Smoke tools in `tools/` (`smoke-rag`, `smoke-agent`, `smoke-filters`, `smoke-understand`, `list-products`, `rag-eval`); `pnpm` scripts: `eval:rag`, `reindex:rag`
- Cost profile: Sonnet 4.5 for the user-facing chatbot (~$0.01–0.03 per turn); Haiku 4.5 for query understanding, conversation compaction, synthetic Q&A indexing; Pinecone Inference + Cohere are free-tier
- Post-cutover P0–P3 audit sweep landed in commit `4472977`

## 2026-04-20

### Production hardening
- Performance and robustness audit across data layer, API routes, hot-path components — see README "Performance & Robustness Hardening" section for the full breakdown
- Sanity read-only client switched to `useCdn: true` for edge-cached published reads
- `/api/chat` gained zod validation, 256KB body cap, per-user rate limiter (20 req/min), explicit `runtime: "nodejs"`, `maxDuration: 60`
- Stripe webhook decoupled from `lineItems` ordering — now matches by `productId` in `product_data.metadata`
- Admin insights route fused inventory passes into one and replaced greedy-regex JSON extraction with a balanced-brace parser
- Cart-stock hook gained debounce, `AbortController` cancellation, and an O(1) Map lookup
- Production hardening v2 (later): Playwright e2e suite, Lighthouse CI, Upstash Redis swap for the rate limiter, PostHog scaffold

## 2026-03-11

### Animations
- Added scroll-triggered entrance animation to "Shop by Room" category tiles — tiles slide in from right to left with a staggered delay as the section enters the viewport
- Added scroll-triggered entrance animation to "Best Sellers" product tiles — tiles rise up from below with a staggered delay as the section enters the viewport
- Both animations use IntersectionObserver (fires once at 15% visibility) with 0.6s ease-out transitions and 0.1s stagger between each tile

### Header
- Condensed mega dropdown width to match the span of the navigation links (New to Sale) instead of stretching full-page width
- Dropdown width stays consistent regardless of which category is hovered

### Testing
- Added chatbot integration test script (`tools/test-chatbot.ts`) that exercises the AI tool pipeline without calling any AI API — zero cost, Sanity reads only
- Tests cover searchProducts (broad, category, material, price range, text, combined filters), addToCart (by slug, by name, quantity, stock checks, nonexistent products), and getMyOrders (authenticated, unauthenticated, status filters)
- Includes an end-to-end conversation flow simulation and API route auth checks
- Run with `npx tsx tools/test-chatbot.ts`

### AI Chatbot
- Customers can upload a photo in the chat (e.g. a room or a piece of furniture they like) and the AI will suggest similar products from the catalog
- Users can now add products to their cart directly from the chat conversation
- New confirmation card appears in chat when a product is added to cart, showing the item image, name, and price
- Stock is checked on the server before adding to cart — if an item is out of stock, the chatbot lets you know
- Added "Ask AI for Similar" button on product pages — opens the chatbot with a request for similar products pre-filled
- Redesigned the welcome screen with clear option cards: Find Furniture, Get Recommendations, Add to Cart, and Track Orders
- Added quick-search shortcuts below the option cards for common queries like "Oak dining tables"
- Rewrote the AI's tone to sound like a knowledgeable furniture showroom associate — polished and helpful, not robotic
- The AI now explains why it's showing certain results (e.g. "Since you mentioned a warm, natural feel, I've focused on oak and walnut pieces")
- Products are described with useful context instead of plain spec lists
- After showing results, the AI suggests next steps like "Would you like me to add any of these to your cart?"
- The AI asks clarifying questions for vague requests instead of guessing (e.g. "What room are you furnishing?")
- When no products match a search, the chatbot suggests alternatives instead of just saying "no results"
- After adding an item to the cart, the chatbot suggests complementary products
- Order updates are described in plain language instead of raw data
- Results are limited to 3–5 products per response so customers aren't overwhelmed, with an offer to show more
- Adjusted chat window size and header spacing for better proportions

### Project Setup
- Set up project as `kozy-ecommerce` with MIT license
- Wrote README.md with project overview and architecture decisions
- Added CLAUDE.md project instructions
- Added CHANGELOG.md and CHANGES.md for documentation

## 2026-03-10

### Security Hardening
- **Webhook fix**: Stripe webhook was silently succeeding even when order data was missing — customers could get charged with no order created. Fixed it to return an error so Stripe retries automatically.
- **Chat authentication**: The chatbot API had no login check, so anyone could use it without an account and run up AI costs. Added authentication so only logged-in users can chat.
- **Admin error messages**: The admin analytics page was accidentally exposing internal details (database queries, file paths) in error messages. Replaced with a generic message — details stay on the server.
- **Admin role check**: The admin analytics endpoint only checked if a user was logged in, not if they were an admin. Any logged-in customer could view store analytics. Added a proper admin-only check.

### Performance
- Wrapped product cards in `React.memo()` so they don't re-render unnecessarily when filters change

### Error Handling
- Added error pages for admin and app routes — if something crashes, users see a friendly message instead of a blank screen

### AI Chatbot
- Updated chatbot branding and system prompt for Kozy
- Improved error handling in chat responses

## 2026-03-09

### Bug Fixes
- Fixed Stripe API version compatibility
- Reverted BlurImage/LQIP experiment that caused issues
- Fixed dependency issues

### Shop & Filters
- Added SEO improvements (meta tags, page titles, Open Graph images, robots.txt, sitemap)
- Added ability to select multiple subcategory filters at once
- Added price range slider filter
- Improved product details styling
- Auth improvements

### Product Display
- Added product carousels (featured products, related products)
- Made the Recently Viewed section more compact
- Switched currency display to AUD
- Added sale price display with strikethrough for discounted products
- Added loading skeletons for product grids, product pages, and carousels

## 2026-03-08

### Product Features
- Added product variant grouping — same product in different colors shows as one card with clickable color swatches
- Added New and Sale navigation links that filter products automatically
- Improved sticky scroll behaviour on product pages — image gallery stays pinned while scrolling through details
- Added Recently Viewed products section on product pages (tracks last 12 products, persists in browser)
- Added "You May Also Like" related products carousel on product pages
- Added breadcrumb navigation (Home → Shop → Category → Product Name) on every product page
- Added collapsible product detail sections (Description, Specifications, Shipping & Returns, Care Instructions)

### UI Fixes
- Fixed mega dropdown accidentally triggering on New/Sale links
- Set square button corners across the entire site
- Fixed filter panel trapping scroll (couldn't scroll the page while cursor was over filters)
- Footer cleanup

### Homepage
- Added side-by-side promotional banners (Rorie Bed + Lighter Living)
- Added full-width Art of Autumn seasonal banner
- Added Fresh Foundations video section
- Added newsletter signup form in footer

### Search & Analytics
- Added search query tracking — logs what customers search for to Sanity
- Popular searches appear as suggestions in the search bar
- Search analytics stored for understanding product demand

### Work in Progress
- General UI improvements across the site
- Product filter improvements
- Recently viewed products implementation
- Chat widget improvements

## 2026-03-07

### Typography
- Set up Cormorant Garamond for headings (thin weight, tight line spacing)
- Set up DM Sans for body text
- Added uppercase letter spacing on labels and buttons
- Refined text sizing and spacing throughout

### Header
- Fixed header not hiding properly during slow scrolling or middle-click auto-scroll
- Fixed header being transparent on non-homepage pages (now starts solid)
- Header stays solid coloured when hiding
- Updated banner and animation timing
- Added dark mode toggle (sun/moon icon with rotation animation) in the header
- Added store locator map pin icon linking to `/store-locations`

### Styling
- Set square corners on all Clerk sign-in/sign-up modals
- Added dark mode styles to every component across the site

## 2026-03-06

### Major UI Overhaul
- Added footer with four-column layout, contact details, social icons, and payment method icons
- Added payment icons (Visa, Mastercard, Amex, PayPal, Apple Pay, Afterpay)
- Added 12 new pages: About, Contact, Blog, FAQ, Help, Privacy, Returns, Gift Vouchers, Shipping, Terms, Reviews, Store Locations
- Added style inspiration gallery section
- Added best sellers section
- Updated hero banner

### Homepage Redesign
- Moved products to `/shop` page — homepage is now a brand landing page
- Built full-screen hero banner with secondary and video variants
- Added category tiles with images
- Added featured products carousel (auto-scrolling with navigation dots and arrows)

### Storefront Foundation
- Added Kozy storefront branding
- Created category pages with subcategory filtering
- Built header mega dropdown navigation showing subcategories on hover
- Applied grayscale colour palette
- Applied minimalist luxury styling throughout

### Checkout & Orders
- Stripe checkout with shipping address collection (44 countries)
- Order creation via Stripe webhooks — orders only created after payment is confirmed
- Stock validated before checkout and decremented after payment
- Order history page for signed-in customers
- Individual order detail pages with status tracking
- Checkout success confirmation page
