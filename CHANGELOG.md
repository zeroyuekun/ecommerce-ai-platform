# Changelog

All notable changes to this project are documented here, in reverse chronological order.

---

## 2026-03-11

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
