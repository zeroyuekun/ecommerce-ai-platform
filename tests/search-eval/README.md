# Search Eval Harness

Hand-labeled queries used to benchmark semantic search quality.

## Format

`queries.json` is an array of:

```json
{
  "query": "cozy dorm desk",
  "relevantIds": ["<sanity-product-id-1>", "<sanity-product-id-2>"],
  "tags": ["qualitative", "context"]
}
```

`relevantIds` are the ground-truth products that a human would consider a good match for this query. Order doesn't matter — presence in the top-K matters.

## Metrics

- **recall@K** — fraction of relevant products that appeared in the top K ranked results.
- **MRR** — mean reciprocal rank of the first relevant result.

## Running

```bash
# One-shot run (requires local .env with Upstash Vector + AI Gateway)
pnpm eval:search

# Promote the latest result to baseline
pnpm eval:search:promote
```

CI fails if `recall@5` drops more than 5% below `baseline.json`.

## Populating queries.json

Real product IDs come from Sanity. You can get 30 candidate products via:

```bash
pnpm exec sanity documents query '*[_type == "product"][0...30]{ _id, name, category->{title} }'
```

Pair each with 1–3 queries that a real shopper might use to find it. Commit both the query file and a fresh `baseline.json`.
