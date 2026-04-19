# ADR-0001: Webhook-driven order creation

- **Status:** Accepted
- **Date:** 2026-04-20

## Context

A customer going through Stripe Checkout can fail at several points between clicking "Pay" and the session returning successfully: the card is declined, the browser loses connection, the tab is closed, the Stripe redirect URL is hit but the session hasn't settled on Stripe's side yet, or a network blip prevents the success page from loading. The naive implementation — create the order when the client hits the success page — therefore produces two categories of bugs:

1. **Orders without payment**: success page loads for a session that Stripe later declined.
2. **Stock decrements without orders**: client decrements stock eagerly and then never creates the order.

We also need to decide *where* to create orders: the server route that renders the success page, or the webhook Stripe calls after it confirms payment.

## Decision

Orders are created in Sanity **only** inside the Stripe webhook handler at `app/api/webhooks/stripe/route.ts`, after `checkout.session.completed` fires with `payment_status: "paid"`. The same handler atomically decrements stock for each purchased line item using `writeClient.transaction()`.

The success page is presentational only — it reads the order (or shows "processing..." if the webhook hasn't landed yet) but never mutates state.

Idempotency is enforced by checking `ORDER_BY_STRIPE_PAYMENT_ID_QUERY` before inserting. Stripe delivers webhooks at least once, so the handler must tolerate repeat delivery.

Line items are matched to products by the `productId` we stored in each line's `product_data.metadata` at session-creation time, not by array index — Stripe does not guarantee the ordering of `line_items.data` matches the order we sent, so index-based matching risks price/quantity corruption.

## Consequences

**Positive:**
- Impossible to have an order without confirmed payment.
- Impossible to decrement stock without an order.
- Replay-safe: Stripe's at-least-once webhook delivery doesn't double-create orders.
- Client complexity is zero — it just polls for the order record.

**Negative:**
- Success page UX requires a "processing..." state while waiting for the webhook (usually < 500ms but can be seconds under Stripe load).
- Local development requires running `stripe listen --forward-to localhost:3000/api/webhooks/stripe` alongside `pnpm dev`, which is an extra step documented in the README.
- Debugging requires reading both Stripe dashboard events and Sanity, since the state machine lives across two systems.

**Alternatives rejected:**
- *Create order on success-page render* — fails the "no orders without payment" guarantee when the success URL is hit before Stripe settles.
- *Optimistic create + webhook reconcile* — doubles the state machine and inverts the failure mode: now the problem is cleaning up ghost orders when payment fails.
