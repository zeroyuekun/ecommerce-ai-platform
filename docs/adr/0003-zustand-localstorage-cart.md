# ADR-0003: Zustand + localStorage for cart state

- **Status:** Accepted
- **Date:** 2026-04-20

## Context

Shopping carts are the single most-mutated piece of state in an e-commerce storefront: every "add", "increment", "remove", "open drawer" is a state update, and the cart must survive page reloads. We had three realistic options:

1. **Server-owned cart** — a cart document per user (or per session cookie) in Sanity, mutated via server actions.
2. **Client-owned cart** — Zustand store hydrated from localStorage, no server writes until checkout.
3. **Hybrid** — optimistic client store, background server sync.

## Decision

Client-owned cart using `createCartStore` in `lib/store/cart-store.ts`, persisted to `localStorage` under key `cart-storage` via Zustand's `persist` middleware. The only server interactions driven by the cart are:

- `useCartStock` reads current stock for the cart's product IDs (for exceed/out-of-stock badges).
- The checkout server action re-validates stock against Sanity before creating the Stripe session.

Hydration is deferred (`skipHydration: true`) and triggered on the client by the cart provider, which prevents SSR/client markup mismatch in Next.js App Router. `partialize` persists only `items`, not UI state like `isOpen`.

## Consequences

**Positive:**
- Zero database writes on "add to cart". No cart table, no cart cleanup cron, no anonymous-to-authenticated cart merge logic.
- Instantaneous UI: cart mutations are synchronous state updates, not network round-trips.
- Offline-friendly: browsing and cart manipulation work with no connectivity; only checkout requires the network.
- Sanity quota stays focused on actual purchase events, not cart churn.

**Negative:**
- Cart does not survive device switches. A user who adds items on desktop won't see them on mobile. This is explicitly a tradeoff — if the business needs cross-device carts later, the path is "add server sync on top" not "rebuild from scratch."
- Prices shown in the cart can go stale if the product is repriced in Sanity between "add" and "checkout". The checkout server action re-reads authoritative prices before the Stripe session, so the cart price is *display-only*; the charged price is always server-authoritative.
- Stock shown in the cart can similarly drift; `useCartStock` polls to show "only 2 left" badges and blocks checkout if any item has `exceedsStock`.

**Alternatives rejected:**
- *Server-owned cart*: adds a Sanity document per cart session, creates an orphaned-cart cleanup problem, and the latency on every "+1 quantity" click is poor UX for no real gain at this traffic level.
- *Hybrid*: double the code paths and double the failure modes, for a cross-device feature we don't need yet.

**Migration path if cross-device becomes a requirement:**
Wrap `addItem` / `removeItem` / `updateQuantity` in a background `fetch("/api/cart", ...)` that upserts a per-user cart document. Hydrate from the server on sign-in. The client store remains the source of truth for the current tab; the server is a second persistence layer.
