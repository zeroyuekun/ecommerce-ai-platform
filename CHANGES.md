# What I Changed (And Why)

Kozy is a full-stack e-commerce platform I built for premium Australian furniture. Below is a breakdown of the design decisions, features, and technical work that went into it.

---

## Design Overhaul

Rebuilt the entire look and feel around a luxury minimalist aesthetic — inspired by sites like Van Cleef & Arpels, Crate & Barrel, West Elm, and Mocka.com.au.

**Typography**: Cormorant Garamond for headings (thin weight, tight line spacing), DM Sans for body text. Navigation links, labels, and buttons use uppercase with wide letter spacing for a clean, editorial look.

**Color**: A grayscale palette with no unnecessary color — product images do the talking. Amber accents only for active/selected states, red only for sale prices. Full dark mode with carefully chosen equivalents for every color (not just "invert everything").

**Sharp edges**: Square corners on banners, buttons, and interactive elements — including Clerk sign-in modals. Rounded corners feel friendly; square corners feel architectural, which matches the furniture.

**Whitespace**: Generous padding and breathing room between sections. The homepage leads with a full-screen hero image, not a wall of products.

**Homepage composition**: Rebuilt the homepage from a simple product grid into a brand landing page — full-screen hero banner, video section with "Fresh Foundations" messaging, side-by-side promotional banners, a featured products carousel (auto-scrolling with navigation dots and arrows), category tiles, best sellers section, and a style inspiration gallery. Products were moved to `/shop` so the homepage tells a story instead of listing a catalog.

**Hover effects and animations**: Product cards gently scale up on hover. The header hides when you scroll down and reappears when you scroll up. Navigation links have animated underlines. All animations use smooth easing — nothing bounces or feels jarring.

**Scroll-triggered entrance animations**: The "Shop by Room" category tiles slide in from the right with a staggered cascade as you scroll down to them. The "Best Sellers" product tiles rise up from below in the same staggered fashion. Both use IntersectionObserver so they only fire once when the section comes into view — 0.6s ease-out with a 0.1s delay between each tile for a polished reveal effect.

**Loading states**: Added skeleton loading screens throughout the site (product grids, product pages, carousels, checkout, orders) so customers see smooth placeholder layouts instead of blank screens while content loads.

---

## Product & Shop Pages

Where customers spend most of their time, so this got the heaviest rework.

**Variant grouping**: Products available in different colors show as one card with clickable color swatches. Hovering a swatch swaps the image, price, and link instantly. On the product detail page, switching between variants updates everything without reloading — and the URL updates so you can share a link to the exact variant.

**Sticky image gallery**: The product image stays pinned on screen while you scroll through the product details below it. Images crossfade smoothly when switching between them.

**Collapsible sections**: Description, Specifications, Shipping & Returns, and Care Instructions are each in expandable/collapsible panels with smooth animation.

**Sale prices**: Products on sale show the discounted price alongside the original price with a strikethrough. Sale items can be browsed via a dedicated "Sale" link in the navigation.

**"Ask AI for Similar" button**: On every product page, customers can click a button to open the AI chatbot and immediately ask for similar products — the chatbot opens with the request pre-filled.

**Related products**: A "You May Also Like" carousel at the bottom of each product page, pulling products from the same category. Layout adjusts for different screen sizes.

**Breadcrumbs**: Navigation trail (Home → Shop → Category → Product Name) on every product page so customers always know where they are.

---

## Header

**Transparent-to-solid**: On the homepage, the header starts fully transparent over the hero image — logo, nav, and icons all in white. As you scroll down, it transitions to a solid white background with a blur effect. Every element adapts: logo color, link styles, search bar, cart badge.

**Smart hide-on-scroll**: The header hides when scrolling down and reappears when scrolling up. Uses accumulated scroll distance rather than raw position to avoid false triggers during slow scrolling or middle-click auto-scrolling.

**Mega dropdown**: Hovering over a category in the navigation shows subcategories immediately in a dropdown — no extra page load needed.

**Search bar with popular searches**: The search bar shows trending search terms based on what other customers have been searching for. Search queries are tracked and the most popular ones appear as suggestions.

**Dark mode toggle**: Built a toggle button (sun/moon icon with a smooth rotation animation) and added it to the header. Every component has hand-written dark mode styles, so the toggle works properly across the entire site. The dark palette uses dark backgrounds, subtle opacity borders, and muted card surfaces — intentionally distinct from just "invert everything."

**Store locator icon**: Added a map pin icon in the header linking to `/store-locations`. Small touch, but it signals "we have physical stores" — which matters for a furniture brand where customers want to see things in person.

---

## Navigation & Filtering

**Two-click product finding**: Homepage → Category → Product. Never deeper than that.

**Extended filters**: Added subcategory filters with hierarchy (e.g. Living Room → Sofas, Coffee Tables), ability to select multiple filters at once, an in-stock toggle, visible filter tags you can remove individually, and a "clear all" button. Also added material, color, and price range slider filters.

**New and Sale views**: Navigation links for "New" and "Sale" that automatically filter to show new arrivals or discounted products.

**Products moved to `/shop`**: Homepage is a brand landing page, not a product catalog.

---

## Checkout & Orders

**Stripe checkout**: Customers check out through Stripe with shipping address collection supporting 44 countries. Stock is validated against the database before the checkout session is created — if something went out of stock while in the cart, the customer is told before they pay.

**Order creation via webhooks**: Orders are only created after Stripe confirms payment, not when the customer clicks "pay." This means there's never a situation where an order exists without a successful payment. Stock is decremented at the same time.

**Order history**: Signed-in customers can view all their past orders at `/orders`, with individual order detail pages showing items, status, shipping address, and totals.

**Checkout success page**: After payment, customers see a confirmation page with their order details pulled from the Stripe session.

---

## 12+ New Pages

| Page | Purpose |
|------|---------|
| `/about` | Brand story, design philosophy, sustainability |
| `/contact` | Contact form, business hours, location |
| `/blog` | Interior design posts, buying guides |
| `/faq` | Collapsible FAQ organised into 4 categories |
| `/help` | Help centre hub with 6 topic cards |
| `/privacy` | Privacy policy (GDPR, data practices) |
| `/returns` | 30-day returns, warranty, damaged items |
| `/gift-vouchers` | Digital gift cards ($50–$500) |
| `/shipping` | Standard/Express/White Glove delivery rates |
| `/terms` | Terms & Conditions (10 sections) |
| `/reviews` | Customer reviews with star ratings |
| `/store-locations` | 6 Australian store locations with hours |

Not technically complex, but they're what makes a demo feel like a real store.

---

## Footer

Four-column layout (About, Customer Service, Information, Contact), payment method icons (Visa, Mastercard, Amex, PayPal, Apple Pay, Afterpay), social links, and full dark mode support.

---

## Recently Viewed Products

Tracks the last 12 products a customer has looked at and displays them in a carousel on product pages. Data persists in the browser so it survives page refreshes and tab closes.

---

## AI Shopping Assistant

**Image upload in chat** — customers can attach a photo (e.g. a room, a piece of furniture they like, or an inspiration image) and the AI will analyse it and suggest similar products from the catalog. The upload button sits next to the text input with a live preview before sending.

**Add to cart from chat** — the AI assistant can add products directly to the customer's cart. It looks up the product, checks if it's in stock, and adds it. A confirmation card appears in the chat showing what was added with the product image, name, and price. This means the chatbot isn't just a search tool — it can take real actions.

**"Ask AI for Similar" button** — on every product page, customers can click a button that opens the chatbot and automatically asks for similar products.

**Redesigned welcome screen** — when customers open the chatbot, they see clear option cards (Find Furniture, Get Recommendations, Add to Cart, Track Orders) instead of a blank text box. Each card triggers a relevant conversation. Quick-search shortcuts sit below for common queries. Signed-in users see an extra card for order tracking.

**Refined AI voice** — the AI speaks like a knowledgeable showroom associate, not a generic chatbot. Products are described with useful opinions ("Solid wood construction, 150cm wide — a good fit if you need storage without bulk") instead of plain spec lists. The AI explains why it chose certain results and suggests natural next steps.

**Conversation flow design** — the chatbot asks follow-up questions for vague requests ("What room are you furnishing?"), remembers what you've already discussed so you don't repeat yourself, and suggests alternatives when nothing matches instead of just saying "no results found." After adding something to the cart, it suggests complementary items. Orders are described in plain language rather than raw data. Results are limited to 3–5 per response so customers aren't overwhelmed, with an offer to show more.

**Order tracking** — signed-in users can ask the chatbot about their orders and get conversational status updates instead of raw data.

---

## Security Hardening

**Webhook silent failure**: The Stripe webhook handler was returning a success response even when order data was missing — meaning Stripe thought everything was fine and never retried. Customers could get charged with no order created. Fixed it to return an error so Stripe automatically retries the payment notification.

**Open chat endpoint**: The AI chatbot API had no login check. Anyone could send requests to it without an account, which would rack up AI costs. Added authentication so only logged-in users can use the chatbot.

**Admin error leaking**: The admin analytics page was sending detailed internal error messages to the browser — including database queries, AI config details, and file paths. Replaced with a generic error message so sensitive information stays on the server.

**Missing role check**: The admin analytics endpoint checked if a user was logged in, but not whether they were actually an admin. Any logged-in customer could access store analytics. Added a proper admin role check.

---

## Testing

Built a chatbot integration test script (`tools/test-chatbot.ts`) that validates the entire AI tool pipeline without making any AI API calls — so it costs nothing to run. It connects to real Sanity data and exercises each tool the chatbot uses:

- **searchProducts** — broad queries, category/material/color filters, price ranges, text search, combined filters, and no-result scenarios
- **addToCart** — lookup by slug and name, quantity handling, stock validation, nonexistent products, and overstock rejection
- **getMyOrders** — authenticated and unauthenticated flows, status filtering, and order shape validation

Also includes an end-to-end conversation flow simulation (search → add to cart → follow-up search → order check) and API route tests that verify the chat endpoint requires authentication.

Run with `npx tsx tools/test-chatbot.ts`.

---

## Other Additions

- **Error boundaries** — if something crashes in the app or admin section, users see a friendly error page instead of a blank screen
- **Product card performance** — wrapped product cards in `React.memo()` so they don't unnecessarily re-render when filters change, keeping the shop page fast
- **Newsletter signup** — form in the footer with a Sanity schema and server action to store subscriptions
- **Search analytics** — logs what customers search for to Sanity, and the most popular searches appear as suggestions in the search bar
- **SEO foundations** — added `robots.ts` and `sitemap.ts` so search engines can find and index the site, plus page titles, descriptions, and social media preview images on product pages
- **Project setup** — professional README with architecture decisions, MIT license, and full project documentation
