# Search Eval Harness

Hand-labeled queries used to benchmark semantic search quality.

## Format

`queries.json` is an array of:

```json
{
  "query": "cozy nook for a studio apartment",
  "relevantIds": ["<sanity-product-id-1>", "<sanity-product-id-2>"]
}
```

`relevantIds` are the ground-truth products that a human would consider a good match. Order doesn't matter — presence in the top-K is what's scored. A query with `relevantIds: []` is skipped (used for deliberately unscorable queries where the catalog has no good match).

## Metrics

- **recall@5** — fraction of relevant products that appeared in the top 5.
- **MRR** — mean reciprocal rank of the first relevant result across queries.

## Running

```bash
# Runs against the in-memory index (auto-seeded from Sanity) if UPSTASH_VECTOR_REST_*
# env vars are not set, otherwise runs against the live Upstash namespace.
# Deterministic embeddings are cached to .embeddings-cache.json (gitignored) so
# reruns are instant and don't hit the AI Gateway.
pnpm eval:search

# Promote latest run to baseline.json
pnpm eval:search:promote

# Compare latest run to baseline (fails if recall@5 drops >5%)
pnpm eval:search:check
```

## Current baseline

| Metric | Value |
|---|---|
| recall@5 | 0.652 |
| MRR | 0.696 |
| Scored queries | 29 (1 skipped) |

## Regenerating ground truth

The queries in `queries.json` were mapped to product IDs by hand using the category/material/color/productType facets from the live Sanity catalog. To regenerate against a changed catalog:

```bash
# Dump all products with attributes to stdout
pnpm tsx tools/scripts/dump-products.ts > .tmp/products.json
```

Then open `queries.json` and re-pick 2–5 plausibly-relevant IDs per query. Commit the new `queries.json` and a fresh `baseline.json`.
