# Architecture Decision Records

Short, dated records of architecturally significant decisions made for this project. Format follows [Michael Nygard's ADR template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions.html): **Context → Decision → Consequences**.

Each ADR captures *why* a choice was made, including the alternatives that were considered and rejected, so future maintainers (or hiring managers) can reconstruct the reasoning without having to ask.

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](./0001-webhook-driven-order-creation.md) | Webhook-driven order creation | Accepted |
| [0002](./0002-sanity-cdn-for-published-reads.md) | Sanity CDN for published reads | Accepted |
| [0003](./0003-zustand-localstorage-cart.md) | Zustand + localStorage for cart state | Accepted |
| [0004](./0004-in-memory-rate-limit-tradeoff.md) | In-memory rate limiter — accepted tradeoff + migration path | Accepted |

New ADRs: `NNNN-kebab-case-title.md`, next sequential number, add row to table above. Keep them short (< 500 words each) and decision-focused — this is not the place for tutorials.
