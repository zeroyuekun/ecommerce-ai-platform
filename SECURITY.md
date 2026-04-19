# Security

## Reporting vulnerabilities

Please email eddie.zeng95@gmail.com with a clear description and reproduction steps. Do not open a public GitHub issue for security-sensitive reports. We aim to acknowledge within 48 hours.

## Authentication boundaries

| Surface | Auth required | Notes |
|---|---|---|
| `/api/chat` | Clerk `userId` | Returns 401 without a valid session. |
| `/api/search` | None | Public, rate-limited. |
| `/api/sanity/reindex` | HMAC | `SANITY_REVALIDATE_SECRET` must match webhook signature. |
| `/api/webhooks/stripe` | HMAC | Stripe signature verified via `stripe.webhooks.constructEvent`. |
| `/studio` and `(admin)/**` | Clerk + role | Admin role required. |
| Sanity write operations | `SANITY_API_WRITE_TOKEN` | Server-only; never exposed to the client. |

## Rate limits

Implemented in `lib/ai/rate-limit.ts`. Backed by Upstash Redis when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set; in-memory fallback otherwise (per-container).

| Endpoint | Limit | Key |
|---|---|---|
| `/api/chat` | 20 req / 60s | Clerk `userId` |
| `/api/search` | 30 req / 60s | client IP |

## Webhook verification

- **Stripe:** constructed event verification with `STRIPE_WEBHOOK_SECRET`. Rejects unsigned or tampered payloads with 400.
- **Sanity reindex:** HMAC-SHA256 of raw body vs `sanity-webhook-signature` header, using `SANITY_REVALIDATE_SECRET`. Constant-time comparison.

## Secret management

All secrets live in environment variables (see `.env.example`). Never commit `.env.local`. CI uses `${{ secrets.* }}` injected into GitHub Actions environments.

## Dependency hygiene

- Dependabot runs weekly; open a PR before merging security advisories.
- `pnpm audit` runs as part of CI (TODO: enable, see backlog).

## Content Security Policy

CSP is configured in `next.config.ts` in report-only mode. Reports are sampled; enforcement lands after a two-week observation window.
