# Changelog

All notable changes to this project are documented here, in reverse chronological order.

---

## 2026-03-11

### AI Chatbot
- Added `addToCart` tool — users can add products to their cart directly from the chat
- New `CartAddedWidget` component for inline cart confirmation in chat
- Server-side stock validation before adding to cart
- Updated shopping agent instructions with addToCart usage patterns

### Portfolio Cleanup
- Renamed package from `ecommerce-dec-build-sanity-appsdk-clerk` to `kozy-ecommerce`
- Rewrote README.md as a professional project overview with architecture decisions
- Replaced CC BY-NC 4.0 license with MIT
- Renamed CLAUDE_CHANGES.md to CHANGELOG.md
- Removed `reference` git remote pointing to tutorial repo
- Cleaned up `.claude/settings.local.json` (removed one-off commands and tutorial repo URLs)
- Added CLAUDE.md project instructions
- Documented all changes in CHANGES.md

## 2026-03-10

### Security Hardening
- **Webhook silent failure fix**: Changed early `return` to `throw` in Stripe webhook handler when metadata is missing — previously returned 200 to Stripe so it never retried, meaning customer paid but no order was created
- **Chat endpoint authentication**: Added 401 check on `/api/chat` — endpoint was previously open to anonymous users, allowing unlimited Claude API spend
- **Admin error detail leak**: Replaced raw `error.message` in `/api/admin/insights` response with a generic message — was exposing GROQ queries, AI gateway config, and file paths
- **Admin role authorization**: Added `publicMetadata.role === "admin"` check on insights endpoint — any signed-in user could previously access store analytics

### Performance
- Wrapped `ProductCard` in `React.memo()` to prevent unnecessary re-renders on filter changes

### Error Handling
- Added `error.tsx` boundary for admin routes
- Added `error.tsx` boundary for main app routes

### AI Chatbot
- Updated system prompt and branding for Kozy products
- Improved error handling in chat responses

## 2026-03-09

### Bug Fixes
- Fixed Stripe API version compatibility
- Reverted BlurImage/LQIP experiment
- Fixed dependencies

### Code Audit
- Added SEO improvements
- Implemented multi-select on type/subcategory filter
- Bold product details styling
- Auth improvements

### Product Display
- Added product carousels
- Reduced Recently Viewed section size
- Switched currency display to AUD

## 2026-03-08

### Product Features
- Added product variant grouping (`variantGroup` schema field)
- Added New/Sale navigation links with filtered views
- Improved sticky scroll behavior
- Added Recently Viewed products on product pages

### UI Fixes
- Fixed mega dropdown triggering on New/Sale hover
- Set sharp button corners site-wide
- Fixed filter panel scroll trap
- Footer cleanup

### Homepage
- Added dual side-by-side promotional banners (Rorie Bed + Lighter Living)
- Added full-width Art of Autumn seasonal banner
- Added Fresh Foundations white space section

### Work in Progress
- UI enhancements across the board
- Product filter improvements
- Recently viewed store implementation
- Chat widget improvements

## 2026-03-07

### Typography
- Implemented Cormorant Garamond for headings (light weight, tight leading)
- Implemented DM Sans for body text
- Added uppercase tracking on labels and buttons (0.12em-0.2em)
- Refined typography hierarchy and spacing

### Header
- Fixed header not hiding on slow/middle-click scroll by accumulating scroll deltas
- Fixed header transparency on non-homepage (now solid from the start)
- Header stays solid when hiding
- Updated banner and animation timing

### Styling
- Set sharp corners on all Clerk UI components

## 2026-03-06

### Major UI Overhaul
- Added footer with four-column layout, contact details, social icons, payment method icons
- Added payment icons (Visa, Mastercard, Amex, PayPal, Apple Pay, Afterpay)
- Added info pages: About, Contact, Blog, FAQ, Help, Privacy, Returns, Gift Vouchers, Shipping, Terms, Reviews, Store Locations
- Added style gallery section
- Added best sellers section
- Updated hero banner

### Homepage Redesign
- Moved products to `/shop` page
- Cleaned up homepage as a brand landing page
- Added secondary hero banner

### Storefront Foundation
- Added Kozy storefront branding
- Built hero banner with full-viewport design
- Created category pages
- Built header mega dropdown navigation
- Applied monochrome zinc color palette with OKLCH
- Applied minimalist luxury styling throughout
