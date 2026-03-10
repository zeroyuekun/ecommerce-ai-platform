# What I Changed (And Why)

This project started from a tutorial baseline — a working e-commerce platform with product filtering, Stripe checkout, an AI shopping assistant, and an admin dashboard. I redesigned the frontend from scratch and extended it into something that feels like a real product.

---

## Design Overhaul

Rebuilt the entire visual layer around a luxury minimalist aesthetic — the kind you see on sites like Aesop, Muji, or Koala.

**Typography**: Cormorant Garamond (weight 300, leading 1.15) for headings, DM Sans for body text. Uppercase tracking (0.12em–0.2em) on nav links, labels, and buttons.

**Color**: Monochrome zinc scale in OKLCH. No unnecessary color — product images do the talking. Amber accents only for active states, red only for sale prices. Full dark mode with deliberate equivalents for every color.

**Sharp edges**: `rounded-none` on banners, buttons, and interactive elements. Forced sharp corners on Clerk modals too. Rounded feels friendly; sharp feels architectural — matches the furniture.

**Whitespace**: Generous padding, breathing room between sections. Homepage leads with a full-viewport hero, not a product dump. Each section earns its space.

**Micro-interactions**: Product card hover scales to 1.05x over 700ms ease-out. Header hides on scroll-down, reappears on scroll-up (500ms). Nav underlines animate width on hover (300ms). Everything uses ease-out — nothing bounces.

---

## Product & Shop Pages

Where customers spend 90% of their time, so this got the heaviest rework.

**Variant grouping**: Same product in different colors collapses into one card with clickable swatches. Hovering a swatch swaps image, price, and link in-place. On the detail page, switching variants updates everything without a page load — uses `window.history.replaceState` so the URL stays shareable.

**Sticky gallery**: Image gallery pins with `lg:sticky lg:top-24` while you scroll through the info panel. Smooth opacity crossfades (500ms) on image swaps.

**Accordion sections**: Description, Specifications, Shipping & Returns, Care Instructions — collapsible with CSS grid animation. Description parser auto-bolds informal headings from Sanity content.

**Related products**: "You May Also Like" carousel pulling from the same category. Responsive breakpoints (2/3/4 columns).

**Breadcrumbs**: Home → Shop → Category → Product Name on every product page.

---

## Header

**Transparent-to-solid**: On the homepage, the header starts fully transparent over the hero — logo, nav, icons all in white. Scrolling past 100px transitions to solid white with backdrop blur. Every element adapts: logo color, link opacity, search bar border, cart badge colors.

**Smart hide-on-scroll**: Accumulates scroll deltas instead of checking raw position — fixes false triggers on slow scrolls and middle-click auto-scrolling.

**Mega dropdown**: Hovering a category shows subcategories immediately without a page load.

---

## Navigation & Filtering

**Two-click product finding**: Homepage → Category → Product. Never deeper.

**Extended filters**: Added subcategory/type filter with hierarchy (Living Room → Sofas, Coffee Tables, etc.), multi-select, in-stock toggle, active filter pills with individual remove, clear all.

**Products moved to `/shop`**: Homepage is a brand landing page, not a catalog.

---

## 12+ New Pages

| Page | Purpose |
|------|---------|
| `/about` | Brand story, design philosophy, sustainability |
| `/contact` | Contact form, business hours, location |
| `/blog` | Interior design posts, buying guides |
| `/faq` | Collapsible FAQ in 4 categories |
| `/help` | Help centre hub with 6 topic cards |
| `/privacy` | Privacy policy (GDPR, data practices) |
| `/returns` | 30-day returns, warranty, damaged items |
| `/gift-vouchers` | Digital gift cards ($50–$500) |
| `/shipping` | Standard/Express/White Glove rates |
| `/terms` | Terms & Conditions (10 sections) |
| `/reviews` | Customer reviews with star ratings |
| `/store-locations` | 6 Australian locations with hours |

Not technically complex, but they're what makes a demo pass as a real store.

---

## Footer

Four-column layout (About, Customer Service, Information, Contact), payment method icons (Visa, Mastercard, Amex, PayPal, Apple Pay, Afterpay), social links, dark mode support. The baseline didn't have one.

---

## Recently Viewed Products

Zustand store with localStorage persistence tracking up to 12 products. Tracker component records views silently, carousel displays them on product pages. Uses `skipHydration` for SSR safety.

---

## Security Hardening

**Webhook silent failure**: The Stripe webhook handler returned early (200 status) when metadata was missing — Stripe never retried, so customers got charged with no order created. Changed to `throw` so it returns 500 and Stripe retries. Found this while reading the Stripe webhook retry docs — it works fine locally because the CLI listener behaves differently.

**Open chat endpoint**: `/api/chat` had no auth check. Anyone could POST to it anonymously and rack up Claude API costs. Added 401 for unauthenticated users.

**Admin error leaking**: `/api/admin/insights` passed raw `error.message` to the client — GROQ queries, AI config, file paths. Replaced with a generic message; full error stays server-side.

**Missing role check**: Admin insights endpoint checked authentication but not authorization. Any signed-in user could access store analytics. Added `publicMetadata.role === "admin"` check.

---

## Other Additions

- **Error boundaries** for app and admin routes
- **ProductCard memoization** with `React.memo()` for filter performance
- **Newsletter signup** with Sanity schema and server action (stub — no email delivery yet)
- **Search analytics** logging queries to Sanity for product demand insights
- **Add to cart from chat** — the AI assistant can add products directly to the customer's cart. The tool runs server-side (looks up the product in Sanity, validates stock), then the client-side `ToolCallUI` component detects the result and pushes the item into the Zustand cart store. A `CartAddedWidget` confirms the action inline. This means the chatbot isn't just a search box — it can take actions.
- **Redesigned welcome screen** — replaced flat suggestion pills with categorized capability cards (icon + label + description). Each card triggers a relevant prompt. Quick-search pills sit below for direct queries. Signed-in users see a fourth card for order tracking. The layout follows the pattern used by Palazzo and Alhena AI — give customers a clear visual menu of what the assistant can do before they type anything.
- **Refined AI voice** — rewrote the system prompt so the assistant speaks like a showroom associate at a high-end furniture store, not a generic chatbot. Products are presented with opinionated notes ("Solid wood construction, 150cm wide — a good fit if you need storage without bulk") instead of bullet-point specs. The AI explains its reasoning when applying filters and offers natural next steps after results.
- **Conversation flow design** — modelled after patterns used by Palazzo AI and Burberry's chatbot. The assistant now asks follow-up questions for vague requests ("What room are you furnishing?"), maintains context across the conversation so customers don't repeat themselves, handles dead ends gracefully by suggesting pivots instead of just saying "no results", and proactively suggests complementary items after cart adds. Orders are presented conversationally rather than as data. Results are capped at 3-5 with an offer to show more. An AI transparency disclaimer sits at the bottom of the welcome screen — research shows this builds trust rather than eroding it.
- **Rebranding** to Kozy with package rename, professional README, and MIT license
