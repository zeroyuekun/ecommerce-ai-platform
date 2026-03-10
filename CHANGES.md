# What I Changed (And Why)

This project started from [Sonny Sangha's YouTube tutorial](https://www.youtube.com/watch?v=BHjcpEsqHx4) — a 5-hour live build of an e-commerce platform with Next.js 16, Sanity, Clerk, Stripe, and an AI shopping assistant. I coded along with the video, got the full thing working, then spent a significant amount of time redesigning the frontend and extending the project into something that feels closer to a real product than a tutorial demo.

Sonny's build covers a lot of ground. You get a working storefront with product filtering (categories, materials, colors, price ranges), a cart powered by Zustand with localStorage persistence, Stripe checkout with webhook-driven order creation, a full AI shopping assistant with custom chat widgets, and an admin dashboard with AI insights — all using the Sanity App SDK for real-time mutations. It's genuinely one of the most complete tutorials I've come across. If you haven't watched it, it's worth the full 5 hours.

That said, tutorials are tutorials. They stop at "it works" because there's only so much you can cover in a livestream. My goal was to take what Sonny built and push it toward something I'd feel good about showing to someone — whether that's a client, a hiring manager, or just putting it in my portfolio without it screaming "I followed a YouTube video." The biggest area I focused on was the design — rethinking the entire visual language of the app to feel like a premium brand, not a tech demo.

Here's everything I added or changed, and why.

---

## The Design Overhaul: Why Minimalism

The single biggest change I made was to the UI and frontend. The tutorial's design is functional — it gets the job done and demonstrates the tech stack. But it looks like a tutorial. My goal was to strip away the noise and rebuild the visual layer with a luxury minimalist approach, the kind of aesthetic you see on sites like Aesop, Muji, or Koala (the Australian furniture brand).

The guiding principle was simple: **less noise, easier navigation.** Every element that doesn't help the customer find or buy a product is clutter. I wanted someone to land on the homepage and immediately understand what this store is about, find what they're looking for without thinking, and feel like they're shopping somewhere premium. Minimalism isn't about being sparse for the sake of it — it's about making sure every pixel earns its place.

Here's what that looked like in practice:

### Typography System
Replaced the default system fonts with a deliberate serif/sans-serif pairing:
- **Cormorant Garamond** for all headings — a refined serif that signals luxury. Light weight (300) with tight leading (1.15) so headlines feel elegant, not heavy. This is on every h1–h6, the "Kozy." logo, and product names.
- **DM Sans** for body text and UI controls — clean, modern, highly legible at small sizes. Relaxed line height (1.6) so product descriptions and info text breathe.
- **Uppercase tracking on labels and buttons** — navigation links, category labels, CTA buttons all use wide letter spacing (0.12em–0.2em) at small sizes (11–13px). This is a subtle detail but it's one of those things that separates luxury retail from generic e-commerce. It gives the UI a gallery-like quality.

### Color Palette: Monochrome with Purpose
Gutted the default Shadcn color scheme and rebuilt it around a **monochrome zinc scale** using OKLCH color space:
- Pure white backgrounds, near-black foreground text, and zinc grays for everything in between
- No unnecessary color. The UI is intentionally muted so that product images do the talking — when your products are oak dining tables and walnut bed frames, the furniture should be the most colorful thing on the page
- **Amber accents** (amber-500) reserved strictly for active states and attention signals — like the pulsing indicator on the currently selected category tile
- **Red** only for sale prices and destructive actions — sparingly used so it actually catches the eye when it appears
- Full dark mode that isn't an afterthought — every color has a deliberate dark equivalent, borders shift to `white/10%` opacity, cards use subtle `zinc-800/50` transparency

### Sharp Edges, Not Rounded
Deliberately set `rounded-none` on hero banners, CTA buttons, and most interactive elements. The default web trend is to round everything. For a luxury aesthetic, sharp edges feel more architectural and intentional — like the furniture being sold. The Clerk authentication modals were rounded by default and clashed with everything, so I forced sharp corners there too.

### Whitespace as a Design Element
Generous padding throughout — `px-4 sm:px-6 lg:px-8` on containers, breathing room between sections, restraint on borders. The homepage doesn't cram products above the fold. You see a full-viewport hero image first, then scroll into category tiles, then featured products. Each section has room to breathe. This is the opposite of the "show everything immediately" approach most e-commerce tutorials take, but for furniture — where people browse visually and rarely impulse-buy — it works.

### Micro-interactions That Feel Intentional
- **Product cards**: Images scale to 1.05x on hover with a slow 700ms ease-out. Slow enough to feel smooth, fast enough to be responsive. Not bouncy, not snappy — just a gentle lift.
- **Header**: Hides on scroll-down, reappears on scroll-up, with a 500ms transition. On the homepage it starts transparent over the hero image and transitions to solid white as you scroll — so the first impression is the hero, not the navigation bar.
- **Navigation underlines**: Width animates from 0 to full on hover over 300ms. Subtle cue that something is interactive without being distracting.
- **Category tiles**: Active category gets a pulsing amber ring (using `animate-ping`). It's the only animated element on the homepage besides the carousel, so it draws your eye to where you are in the navigation.
- **Chat widget**: Slides in from bottom with a 300ms fade — doesn't pop in abruptly.

All transitions use `ease-out` or default easing. Nothing bounces, nothing overshoots. Luxury means restraint.

### Making Navigation Effortless
The minimalist approach wasn't just about aesthetics — it was about reducing cognitive load. A customer should be able to find any product in two clicks max:

1. **Homepage → Category** (via tiles or mega dropdown) **→ Product** — three levels, never more
2. **Mega dropdown on hover**: Instead of clicking through to a category page and then filtering, hovering on a nav category shows subcategories immediately. Living Room → Sofas, Coffee Tables, Entertainment Units — right there in the dropdown without a page load.
3. **Products moved off the homepage**: The tutorial puts the full product grid on the homepage, which means you're scrolling past dozens of products to find anything. I moved products to `/shop` and turned the homepage into a landing page with clear entry points: hero banner → category tiles → featured products carousel. Each one funnels you somewhere specific.
4. **Active filter pills**: When you're browsing with filters applied, you can see exactly what's filtering your view and remove any filter with one click. No hunting through filter panels to figure out why you're only seeing 3 products.
5. **Footer with clear information architecture**: Four columns — About, Customer Service, Information, Contact — so any page on the site is reachable from the bottom of any other page. The tutorial didn't have a footer at all.

### Rebranding to Kozy

All of this design work came together under the **Kozy** brand — a premium Australian furniture store. The name, the serif logo, the monochrome palette, the generous whitespace — they all reinforce the same message: this is a place that cares about design and quality. It's not just a reskin; the brand identity informed every visual decision.

---

## 12+ New Pages

The tutorial builds the core transactional pages: homepage, product detail, checkout, order history, and the admin section. For a real e-commerce store, that's maybe 40% of the pages you actually need. I built out the rest:

| Page | What it does |
|------|-------------|
| `/about` | Brand story with full-bleed hero image, sections on design philosophy, craftsmanship, and sustainability |
| `/contact` | Contact form with business hours, location details, phone and email |
| `/blog` | Blog listing with sample posts covering interior design, trends, buying guides, sustainability |
| `/faq` | Collapsible FAQ organized into 4 categories: Orders, Shipping, Returns/Warranty, Products/Care |
| `/help` | Help centre hub page with 6 clickable cards linking out to support topics |
| `/privacy` | Full privacy policy — GDPR stuff, data collection practices, user rights, security measures |
| `/returns` | 30-day returns policy, warranty info, damaged item handling, list of non-returnable items |
| `/gift-vouchers` | Digital gift card page with preset amounts ($50–$500), custom amount input, email delivery |
| `/shipping` | Shipping rates for Standard, Express, and White Glove delivery, plus a free shipping threshold at $500 |
| `/terms` | Terms & Conditions with 10 sections covering orders, payment, liability, the works |
| `/reviews` | Customer reviews display with star ratings, location tags, and product references |
| `/store-locations` | 6 Australian store locations with hours, phone numbers, and map integration |
| `/shop` | Dedicated shop page — I moved the product grid off the homepage |
| `/category/[slug]` | Dynamic category browsing pages with filtered views |

None of these are technically complex. They're mostly static content pages. But they're the difference between a demo and something that passes the sniff test as a real store. You land on the homepage, scroll down, see a proper footer with links to About, FAQ, Shipping, Returns — suddenly the whole thing feels legit.

---

## The Footer

Sonny's tutorial doesn't include a footer. When you scroll to the bottom of the page, it just... ends. I built a full footer with:

- **Four-column link layout**: About, Customer Service, Information, Contact — linking to all the new pages
- **Contact details**: Phone number and email with Lucide icons
- **Social media icons**: Instagram, Facebook, YouTube
- **Payment method icons**: Visa, Mastercard, Amex, PayPal, Apple Pay, Afterpay — the visual shorthand for "yes, we accept real payments"
- **Legal links** and dynamic copyright year
- **Dark mode support**

It's the glue that ties all the new pages together. Without it, the informational pages just float disconnected from the rest of the site.

---

## Homepage Redesign

In the tutorial, the homepage has a featured carousel at the top (which Sonny builds — nice Embla implementation), category tiles, and then the full product grid with filters. It works, but it's essentially a catalog page. I wanted the homepage to feel more like a brand landing page that makes you want to browse, not just a list of products to scroll through.

What I changed:

- **Added a primary hero banner**: Full-viewport image with "Made for Life's Moments" headline and a shop CTA. This is the first thing you see — sets the mood before any products show up.
- **Added a video hero banner**: Full-width video background with "Fresh Foundations" messaging. Alternate hero option for seasonal campaigns.
- **Added secondary banners**: Dual side-by-side promotional banners (The Rorie Bed + Lighter Living) plus a full-width "Art of Autumn" seasonal section below. These break up the page and give it editorial feel.
- **Moved the product grid to `/shop`**: The homepage no longer tries to be everything. It's a landing page. If you want to browse products, you go to Shop. This keeps the homepage clean and focused on brand storytelling.

Sonny's featured carousel and category tiles are still there — I just repositioned them within the new layout.

---

## Recently Viewed Products

This wasn't part of the tutorial. I added:

- A **Zustand store** (`recently-viewed-store.ts`) with localStorage persistence that tracks up to 12 products
- A **tracker component** (`RecentlyViewedTracker.tsx`) that silently records views when you visit a product page
- A **carousel component** (`RecentlyViewed.tsx`) that displays your recently viewed items on product pages

The store uses `skipHydration` for SSR safety — same pattern Sonny uses for the cart store, so it was natural to follow that for consistency. Small feature, but it's one of those things you notice on real e-commerce sites and miss when it's not there.

---

## Extended Product Filtering

Sonny builds a solid filter system in the tutorial — categories, materials, colors, price range, all synced to URL params. I kept all of that and extended it with:

- **Subcategory/type filter**: A hierarchical system (`lib/constants/subcategories.ts`) where selecting "Living Room" gives you subcategories like Sofas, Coffee Tables, Entertainment Units, Shelving. Sonny's version filters by top-level category only.
- **Multi-select on the type filter**: You can select multiple subcategories at once
- **In-stock toggle**: Quick filter to hide out-of-stock items
- **Active filter pills**: Visual display of all active filters with individual remove buttons — so you can see at a glance what's filtering your view and remove any one of them
- **Clear all button**: One-click reset for all filters

The subcategory system was probably the most involved addition since it touches the data model. I had to map out which product types belong to which categories and build the hierarchy from scratch.

---

## Product Variant Grouping

Added a `variantGroup` field to the product schema. In Sonny's version, if you have a dining chair in oak and the same chair in walnut, they're two completely separate products with no connection. With variant grouping, they're linked — so you could build a color selector on the product page or show "also available in..." suggestions.

This is a schema-level change, so it had to happen at the Sanity type definition. Relatively simple to add but it changes how you think about the product catalog.

---

## Security Hardening

This is where I spent the most time per line of code changed. None of these are flashy features, but they're the kind of things that would bite you in production:

### Webhook Silent Failure (The Scary One)
The Stripe webhook handler had an early `return` when session metadata was missing. Here's why this is bad: when the handler returns without throwing, the response goes back to Stripe as a 200. Stripe thinks the webhook was processed successfully. It never retries.

Meanwhile: customer has been charged. No order was created in Sanity. No stock was decremented. No confirmation email. The customer thinks they paid and got nothing. You don't find out until they email support — if they email at all.

This works fine in development because the Stripe CLI's local listener behaves differently. You only discover it's broken after you deploy. I changed the `return` to `throw new Error(...)` so the catch block sends back a 500 and Stripe retries the webhook.

### Chat Endpoint Wide Open
The `/api/chat` route had no authentication check. Sonny mentions in the video that the orders tool is only added for authenticated users (which is correct — the agent construction handles that), but the endpoint itself was open. Anyone could POST to it without signing in. Every message costs real money — it hits Claude's API. Leaving it open is essentially giving anonymous users a blank check on your AI spend.

I added a userId check that returns 401 if you're not signed in. The chat FAB now prompts sign-in for logged-out users instead of letting them send messages into the void.

### Admin Insights Leaking Internal Details
The `/api/admin/insights` endpoint was passing `error.message` straight to the client in its error response. If the Sanity query failed, the client would see the full GROQ query. If the AI gateway errored, you'd see the model configuration. File paths, stack traces — all of it leaking out in a JSON response.

Fixed it to return a generic "Failed to generate insights. Please try again later." message to the client. Full error is still logged server-side where it belongs.

### Admin Endpoint Missing Role Check
The insights endpoint verified that you were authenticated (signed in) but not that you were authorized (an admin). Any signed-in customer could hit `/api/admin/insights` and get AI-generated analytics about your store's revenue and inventory.

Added a role check: `publicMetadata.role === "admin"` from Clerk. Returns 403 if you're not an admin.

---

## Error Boundaries

The tutorial doesn't include error boundary components. In Next.js App Router, if a component throws during rendering and there's no `error.tsx` in the route, the error bubbles up and can take down the whole page — or worse, show a raw error screen to users.

I added `error.tsx` for both the main `(app)` routes and the `(admin)` routes. They catch rendering errors, show a clean "Something went wrong" message with a retry button, and log the error to console. Basic stuff, but it means a single broken product page doesn't crash the entire storefront.

---

## Performance: ProductCard Memoization

Wrapped `ProductCard` in `React.memo()`. On a grid page with 30+ products, every time filter state changes, every card was re-rendering even if its props hadn't changed. With `memo()`, cards only re-render when their actual product data changes. Small optimization but it's noticeable on slower devices.

---

## Newsletter Signup

Added a newsletter subscription flow that the tutorial doesn't cover:

- Server action (`lib/actions/newsletter.ts`) with email validation and duplicate checking
- New `newsletterSignup` schema type in Sanity for storing subscriptions
- Creates documents in Sanity when users subscribe

It's a stub right now — no actual email delivery — but the infrastructure is there to plug in a service like Resend or SendGrid.

---

## Search Analytics

Added search query logging so you can see what customers are looking for:

- `searchQuery` schema type in Sanity with query text, timestamp, and result count
- Server action to record each search
- `getPopularSearches()` action to retrieve popular queries

This is the kind of data that's gold for an e-commerce store. If people keep searching for "standing desk" and you don't sell standing desks, that's a pretty clear signal.

---

## Header Rework

Sonny builds a functional header with the store name, navigation, search, and auth controls. I kept the core structure and added:

- **Mega dropdown navigation**: Hover on a category and you get a dropdown with subcategories, not just a link
- **New/Sale navigation links**: Quick-access filtered views for new arrivals and sale items
- **Sticky header with smart hide-on-scroll**: The header sticks to the top as you scroll, but hides when you scroll down and reappears when you scroll up. I had to accumulate scroll deltas instead of checking raw scroll position — otherwise it triggers incorrectly on slow scrolls or middle-click auto-scroll.
- **Transparent-to-solid transition**: On the homepage, the header starts transparent over the hero image and transitions to solid as you scroll. On other pages it's solid from the start.

---

## What Sonny Covers (That I Kept As-Is)

Just to be clear about what came from the tutorial and what's mine — Sonny builds all of this in the video and I kept his implementations largely intact:

- **Product filtering** (categories, materials, colors, price range with URL sync)
- **Featured product carousel** (Embla with auto-play)
- **Cart system** (Zustand with localStorage, stock control)
- **Stripe checkout** (server action, session creation, webhook handler)
- **AI shopping assistant** (ToolLoopAgent with Claude, searchProducts + getMyOrders tools, custom chat widgets)
- **Admin dashboard** (AI insights, inventory management, order management via Sanity App SDK)
- **Stock validation in cart** (`useCartStock` hook, checkout blocking)
- **Sanity schemas** (product, category, order, customer)
- **Clerk authentication** (protected routes, proxy.ts, AgentKit integration)
- **Skeleton loading states** throughout the app
- **Category tiles** on the homepage

His architecture decisions — webhook-driven orders instead of optimistic creation, Zustand over server-side cart state, Sanity App SDK for admin mutations instead of API routes — are all solid choices and I didn't feel the need to change them.

---

## What I Learned

Working on top of a tutorial codebase is a different kind of learning than building from scratch. You skip the "getting stuck on setup" phase and go straight to understanding architecture decisions. Why did he use Zustand with `skipHydration` instead of a simpler state approach? Why webhook-driven orders instead of creating the order before payment? You learn the *reasoning* faster because the code is already there and working.

The security stuff was the biggest eye-opener for me. The webhook silent failure bug is the kind of thing that costs real money — works perfectly in dev, silently breaks in production. The open chat endpoint is another one: looks fine in a demo, but in production, any anonymous user hammering it means your Claude API bill goes through the roof. Tutorials understandably don't focus on this stuff because it's not exciting, but it's the first thing you need to fix before deploying.

If I were starting this over, I'd plan the subcategory system and variant grouping before importing products into Sanity. Retrofitting data model changes after you already have content is always messier than designing for it upfront.

---

## Tech Stack

Same as Sonny's tutorial — I didn't swap out any core technologies:

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Auth | Clerk with AgentKit |
| CMS | Sanity with App SDK, Live, and TypeGen |
| Payments | Stripe (checkout sessions + webhooks) |
| AI | Vercel AI SDK with AI Gateway (Claude Sonnet) |
| State | Zustand with localStorage persistence |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Linting | Biome |

---

## Summary

The biggest thing I brought to this project was the design. Sonny's tutorial gives you an impressive working app — AI assistant, real-time admin dashboard, Stripe payments, the full stack. But the frontend was built to demonstrate technology, not to sell furniture. I rebuilt the visual layer from the ground up with a minimalist luxury aesthetic: monochrome palette, serif/sans-serif typography, sharp edges, generous whitespace, and purposeful micro-interactions. Every design choice was in service of one goal — cut the noise so customers can find what they want and buy it without friction.

On top of that, I added the pages a real store needs (about, FAQ, shipping, returns, and 8 more), a proper footer to tie them together, security hardening that the tutorial skipped, and UX touches like recently viewed products and smart scroll behavior.

The tutorial gave me the engine. I redesigned the car around it.

---

## Portfolio Cleanup

After finishing the feature work, I went back and cleaned up the project presentation:

- **Package name**: Changed from `ecommerce-dec-build-sanity-appsdk-clerk` (the tutorial's working name) to `kozy-ecommerce` to match the brand.
- **README**: Rewrote from scratch. The tutorial README was a mix of affiliate links, "join the PAPAFAM" calls to action, and setup instructions aimed at tutorial followers. Replaced it with a straightforward project README: what it is, why I made the architectural choices I did, feature list, tech stack, and setup instructions.
- **License**: Swapped the CC BY-NC 4.0 license (which was under Sonny's name and restricted commercial use) for MIT under my own name. The tutorial code is the foundation, but the design, new pages, security fixes, and extensions are mine.
- **Removed tutorial remote**: The git repo had a `reference` remote pointing to Sonny's original GitHub repository. Removed it since it's not needed and exposes the tutorial origin.
- **Cleaned up local config**: Removed one-off commands and URLs from `.claude/settings.local.json` that referenced the tutorial repo.
