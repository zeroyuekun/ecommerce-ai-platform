# Load tests

## Prerequisites
- `k6` installed (`brew install k6` or see https://k6.io/docs/getting-started/installation/).
- A deployed Vercel preview with `RAG_ENABLED=true`.
- A Clerk session token for an authenticated user (the chat route requires auth).

## Run

```bash
k6 run \
  --env BASE_URL=https://your-preview.vercel.app \
  --env CLERK_TOKEN=ey... \
  tests/load/rag-pipeline.k6.js
```

## Targets
- p95 first-token < 2.0 s
- HTTP failure rate < 0.5%
- Per-query cost ≤ $0.02 (tracked separately via AI Gateway logs)
