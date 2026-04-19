# Load tests (k6)

[k6](https://k6.io/) is a standalone binary — install once per machine, not via pnpm.

## Install

```bash
# macOS
brew install k6

# Windows (winget)
winget install k6 --source winget

# Linux (Debian)
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6
```

Verify: `k6 version`.

## Running

Start the app first:

```bash
pnpm build && pnpm start
```

Then, in another terminal:

```bash
# Baseline (10 VUs × 60s, steady state)
k6 run tests/load/search.k6.js

# Ramp (0 → 100 VUs over 2 min, hold 2 min)
k6 run --env SCENARIO=ramp tests/load/search.k6.js

# Spike (sudden 200 VUs for 30s)
k6 run --env SCENARIO=spike tests/load/search.k6.js
```

Pipe to a JSON summary for the README perf table:

```bash
k6 run --summary-export=tests/load/results/search-$(date +%Y%m%d).json tests/load/search.k6.js
```

## What each script targets

| Script | Endpoint | Target SLO |
|---|---|---|
| `search.k6.js` | `GET /api/search?q=...` | P95 < 500ms @ 50 RPS, <1% err |
| `chat.k6.js` | `POST /api/chat` | P95 < 3s, <2% err |
| `catalog.k6.js` | `GET /products` | P95 < 200ms (ISR), <0.5% err |
| `backfill-load.ts` | N/A (Node/tsx) | 1000 products < 90s, <$0.05 embed cost |

## Interpreting results

- A clean `http_req_failed` rate near 0 at baseline, plus a predictable 429 rate under spike, means the rate limiter is engaged correctly. 5xx under load is the red flag — that's an actual bug.
- P95 latencies above target: first check whether AI Gateway latency dominates (look at `/api/search` custom metrics) before tuning the app.
