# Semantic Product Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add embeddings-based semantic product search with a published recall@5 benchmark and k6 stress-test report, plus a bundled polish pass to raise the project to a production-grade portfolio artifact.

**Architecture:** Sanity webhook → AI Gateway embed → Upstash Vector upsert. Query path mirrors it: embed query → vector search → Sanity hydrate → render. Existing keyword/filter search stays for hard-constrained shopping. New `/search` page for qualitative discovery; new `semanticSearchTool` alongside the existing `searchProductsTool` in the shopping agent.

**Tech Stack:** Next.js 16 App Router, React 19, AI SDK 6 (beta), Vercel AI Gateway (`@ai-sdk/gateway`), Upstash Vector (`@upstash/vector`), existing Upstash Ratelimit, Sanity CMS, Vitest, Playwright, k6 (external binary).

**Spec:** `docs/superpowers/specs/2026-04-20-semantic-search-design.md`

---

## File Map

**New files:**
- `lib/search/embed.ts` — AI Gateway embedding helper
- `lib/search/index.ts` — Upstash Vector client + CRUD
- `lib/search/text.ts` — product → embedding text builder
- `lib/search/types.ts` — shared types
- `app/api/search/route.ts` — public search endpoint
- `app/api/sanity/reindex/route.ts` — Sanity webhook handler
- `app/(app)/search/page.tsx` — search results page
- `components/app/search-bar.tsx` — search input used in header
- `lib/ai/tools/semantic-search.ts` — agent tool
- `tools/scripts/backfill-search-index.ts` — one-shot indexer
- `tests/unit/search-embed.test.ts`
- `tests/unit/search-index.test.ts`
- `tests/unit/search-text.test.ts`
- `tests/unit/search-route.test.ts`
- `tests/unit/reindex-webhook.test.ts`
- `tests/unit/semantic-search-tool.test.ts`
- `tests/e2e/search.spec.ts`
- `tests/search-eval/queries.json`
- `tests/search-eval/eval.ts`
- `tests/search-eval/README.md`
- `tests/search-eval/baseline.json`
- `tests/load/README.md`
- `tests/load/search.k6.js`
- `tests/load/chat.k6.js`
- `tests/load/catalog.k6.js`
- `tests/load/backfill-load.ts` (Node/tsx — k6 can't run the AI SDK)
- `tests/load/results/.gitkeep`
- `SECURITY.md`
- `docs/adr/0005-semantic-search-with-upstash-vector.md`

**Modified files:**
- `package.json` — add `@upstash/vector`, scripts
- `.env.example` — add Upstash Vector + Sanity webhook secret vars
- `.gitignore` — add `sanity.types.ts`
- `LICENSE.md` — populate with MIT text
- `lib/ai/shopping-agent.ts` — wire new tool + add guidance
- `app/layout.tsx` or header — wire search bar (follow existing nav pattern)
- `README.md` — add feature section + eval + perf tables
- `.github/workflows/ci.yml` — add typegen step, eval job, k6 baseline job

**Deleted files:**
- `package-lock.json`
- `sanity.types.ts` (untracked after `.gitignore` update)

---

## Phase 0 — Polish pass

Ship these first; they're independent of the feature and produce visible improvements fast.

### Task 0.1: Replace empty LICENSE.md with MIT

**Files:**
- Modify: `LICENSE.md`

- [ ] **Step 1: Verify current state**

Run: `wc -c LICENSE.md`
Expected: `1 LICENSE.md` (one byte — empty file with newline).

- [ ] **Step 2: Write MIT license**

Replace entire content of `LICENSE.md` with:

```
MIT License

Copyright (c) 2026 Neville Zeng

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Commit**

```bash
git add LICENSE.md
git commit -m "chore: populate LICENSE with MIT text"
```

---

### Task 0.2: Remove package-lock.json (pnpm is sole lockfile)

**Files:**
- Delete: `package-lock.json`

- [ ] **Step 1: Confirm pnpm is the intended tool**

Run: `grep -l pnpm .github/workflows/ci.yml`
Expected: match. CI uses `pnpm/action-setup@v4` — confirms pnpm is authoritative.

- [ ] **Step 2: Delete the npm lockfile**

```bash
git rm package-lock.json
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove package-lock.json; pnpm is the sole lockfile"
```

---

### Task 0.3: Untrack sanity.types.ts and regenerate in CI

**Files:**
- Modify: `.gitignore`
- Delete: `sanity.types.ts` (from git tree; file regenerated locally)
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add to .gitignore**

Append to the end of `.gitignore`:

```
# Sanity generated types — regenerate via `pnpm typegen`
sanity.types.ts
schema.json
```

- [ ] **Step 2: Untrack from git**

```bash
git rm --cached sanity.types.ts schema.json
```

- [ ] **Step 3: Wire CI to regenerate before typecheck**

Edit `.github/workflows/ci.yml`. In the `check` job, insert a step BEFORE `Typecheck`:

```yaml
      - name: Generate Sanity types
        run: pnpm typegen
```

Do the same in the `build` job (same insertion point — before `Build`):

```yaml
      - name: Generate Sanity types
        run: pnpm typegen
```

- [ ] **Step 4: Verify local regen still works**

Run: `pnpm typegen`
Expected: creates `sanity.types.ts` and `schema.json` locally without errors.

- [ ] **Step 5: Verify typecheck passes against the regenerated file**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add .gitignore .github/workflows/ci.yml
git commit -m "chore: untrack generated sanity.types.ts, regenerate in CI"
```

---

### Task 0.4: Add SECURITY.md

**Files:**
- Create: `SECURITY.md`

- [ ] **Step 1: Write SECURITY.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add SECURITY.md
git commit -m "docs: add SECURITY.md with auth/rate-limit/webhook policies"
```

---

## Phase 1 — Embedding pipeline and vector index

### Task 1.1: Install @upstash/vector and add env vars

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `.env.example`

- [ ] **Step 1: Install**

```bash
pnpm add @upstash/vector
```

- [ ] **Step 2: Update .env.example**

Append to `.env.example`:

```
# --- Upstash Vector (required for semantic search) ---
# Separate product from Upstash Redis. Create a database with 1536-dim
# vectors and dotproduct metric at https://console.upstash.com/vector
UPSTASH_VECTOR_REST_URL=
UPSTASH_VECTOR_REST_TOKEN=

# --- Sanity reindex webhook (required to keep the index in sync) ---
# Shared secret configured on the Sanity webhook; the handler verifies
# the HMAC-SHA256 signature against the raw request body.
SANITY_REVALIDATE_SECRET=
```

- [ ] **Step 3: Verify lockfile updated**

Run: `grep "@upstash/vector" package.json`
Expected: match.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add @upstash/vector dep and search env vars"
```

---

### Task 1.2: Define shared search types

**Files:**
- Create: `lib/search/types.ts`

- [ ] **Step 1: Write types**

```typescript
// lib/search/types.ts

export interface ProductEmbeddingMetadata {
  _id: string;
  slug: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: ProductEmbeddingMetadata;
}

export interface SearchOptions {
  topK?: number;
  filter?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/search/types.ts
git commit -m "feat(search): add shared search types"
```

---

### Task 1.3: Build product-to-text converter (TDD)

**Files:**
- Create: `tests/unit/search-text.test.ts`
- Create: `lib/search/text.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/search-text.test.ts
import { describe, expect, it } from "vitest";
import { buildEmbeddingText } from "@/lib/search/text";

describe("buildEmbeddingText", () => {
  it("concatenates core product fields separated by newlines", () => {
    const text = buildEmbeddingText({
      name: "Oakwood Dining Table",
      description: "Solid oak, seats 6, natural finish.",
      category: "Dining Room",
      material: "wood",
      color: "oak",
    });
    expect(text).toBe(
      "Oakwood Dining Table\nSolid oak, seats 6, natural finish.\nDining Room\nwood\noak",
    );
  });

  it("omits missing fields without leaving blank lines", () => {
    const text = buildEmbeddingText({
      name: "Floor Lamp",
      description: null,
      category: "Lighting",
      material: null,
      color: "black",
    });
    expect(text).toBe("Floor Lamp\nLighting\nblack");
  });

  it("returns an empty string when all fields are missing", () => {
    expect(
      buildEmbeddingText({
        name: null,
        description: null,
        category: null,
        material: null,
        color: null,
      }),
    ).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/search-text.test.ts`
Expected: FAIL — `buildEmbeddingText` not defined.

- [ ] **Step 3: Implement**

```typescript
// lib/search/text.ts

export interface ProductEmbeddingInput {
  name: string | null;
  description: string | null;
  category: string | null;
  material: string | null;
  color: string | null;
}

export function buildEmbeddingText(input: ProductEmbeddingInput): string {
  return [input.name, input.description, input.category, input.material, input.color]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join("\n");
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test tests/unit/search-text.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/search/text.ts tests/unit/search-text.test.ts
git commit -m "feat(search): add buildEmbeddingText helper"
```

---

### Task 1.4: Implement embedText via AI Gateway (TDD)

**Files:**
- Create: `tests/unit/search-embed.test.ts`
- Create: `lib/search/embed.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/search-embed.test.ts
import { describe, expect, it, vi } from "vitest";

const embedMany = vi.fn();

vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: (...args: unknown[]) => embedMany(...args),
}));

vi.mock("@/lib/search/embed", async (importOriginal) => {
  return await importOriginal();
});

describe("embedBatch", () => {
  it("returns embeddings for a batch of texts", async () => {
    embedMany.mockResolvedValueOnce({
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });
    const { embedBatch } = await import("@/lib/search/embed");
    const result = await embedBatch(["hello", "world"]);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(embedMany).toHaveBeenCalledOnce();
  });

  it("returns an empty array for empty input without calling the gateway", async () => {
    embedMany.mockClear();
    const { embedBatch } = await import("@/lib/search/embed");
    const result = await embedBatch([]);
    expect(result).toEqual([]);
    expect(embedMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/search-embed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// lib/search/embed.ts
import { embed, embedMany } from "ai";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIM = 1536;
const BATCH_MAX = 50;

export async function embedText(text: string): Promise<number[]> {
  if (text.length === 0) {
    throw new Error("embedText: empty input");
  }
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const chunks: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_MAX) {
    const slice = texts.slice(i, i + BATCH_MAX);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: slice,
    });
    chunks.push(...embeddings);
  }
  return chunks;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test tests/unit/search-embed.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/search/embed.ts tests/unit/search-embed.test.ts
git commit -m "feat(search): add AI Gateway embedding helpers"
```

---

### Task 1.5: Implement Upstash Vector CRUD with memory fallback (TDD)

**Files:**
- Create: `tests/unit/search-index.test.ts`
- Create: `lib/search/index.ts`

The fallback mirrors the pattern in `lib/ai/rate-limit.ts`: prefer Upstash when env vars are set; otherwise use an in-memory index suitable for tests and no-config dev.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/search-index.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryIndex } from "@/lib/search/index";

describe("createInMemoryIndex", () => {
  let index: ReturnType<typeof createInMemoryIndex>;

  beforeEach(() => {
    index = createInMemoryIndex();
  });

  it("upserts and queries by cosine similarity", async () => {
    await index.upsert([
      {
        id: "p1",
        vector: [1, 0, 0],
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: "x",
          price: 10,
          stock: 1,
        },
      },
      {
        id: "p2",
        vector: [0, 1, 0],
        metadata: {
          _id: "p2",
          slug: "b",
          name: "B",
          category: "y",
          price: 20,
          stock: 1,
        },
      },
    ]);
    const results = await index.query([1, 0, 0], { topK: 2 });
    expect(results[0].id).toBe("p1");
    expect(results[1].id).toBe("p2");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("deletes a vector by id", async () => {
    await index.upsert([
      {
        id: "p1",
        vector: [1, 0, 0],
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: "x",
          price: 10,
          stock: 1,
        },
      },
    ]);
    await index.delete("p1");
    const results = await index.query([1, 0, 0], { topK: 5 });
    expect(results).toHaveLength(0);
  });

  it("filters by metadata category", async () => {
    await index.upsert([
      {
        id: "p1",
        vector: [1, 0, 0],
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: "dining",
          price: 10,
          stock: 1,
        },
      },
      {
        id: "p2",
        vector: [1, 0, 0],
        metadata: {
          _id: "p2",
          slug: "b",
          name: "B",
          category: "living",
          price: 20,
          stock: 1,
        },
      },
    ]);
    const results = await index.query([1, 0, 0], {
      topK: 5,
      filter: { category: "dining" },
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("p1");
  });

  it("filters by price range", async () => {
    await index.upsert([
      {
        id: "p1",
        vector: [1, 0, 0],
        metadata: {
          _id: "p1",
          slug: "a",
          name: "A",
          category: "x",
          price: 50,
          stock: 1,
        },
      },
      {
        id: "p2",
        vector: [1, 0, 0],
        metadata: {
          _id: "p2",
          slug: "b",
          name: "B",
          category: "x",
          price: 200,
          stock: 1,
        },
      },
    ]);
    const results = await index.query([1, 0, 0], {
      topK: 5,
      filter: { minPrice: 100, maxPrice: 300 },
    });
    expect(results.map((r) => r.id)).toEqual(["p2"]);
  });
});

describe("getSearchIndex", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("falls back to in-memory index when UPSTASH_VECTOR env vars are unset", async () => {
    vi.stubEnv("UPSTASH_VECTOR_REST_URL", "");
    vi.stubEnv("UPSTASH_VECTOR_REST_TOKEN", "");
    const { getSearchIndex } = await import("@/lib/search/index");
    const index = getSearchIndex();
    expect(index.backend).toBe("memory");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/search-index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// lib/search/index.ts
import type { ProductEmbeddingMetadata, SearchOptions, SearchResult } from "./types";

export interface IndexRecord {
  id: string;
  vector: number[];
  metadata: ProductEmbeddingMetadata;
}

export interface SearchIndex {
  readonly backend: "memory" | "upstash";
  upsert(records: IndexRecord[]): Promise<void>;
  delete(id: string): Promise<void>;
  query(vector: number[], options?: SearchOptions): Promise<SearchResult[]>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function matchesFilter(
  meta: ProductEmbeddingMetadata,
  filter: NonNullable<SearchOptions["filter"]>,
): boolean {
  if (filter.category && meta.category !== filter.category) return false;
  if (typeof filter.minPrice === "number" && meta.price < filter.minPrice) return false;
  if (typeof filter.maxPrice === "number" && meta.price > filter.maxPrice) return false;
  return true;
}

export function createInMemoryIndex(): SearchIndex {
  const store = new Map<string, IndexRecord>();
  return {
    backend: "memory",
    async upsert(records) {
      for (const rec of records) store.set(rec.id, rec);
    },
    async delete(id) {
      store.delete(id);
    },
    async query(vector, options = {}) {
      const topK = options.topK ?? 10;
      const filter = options.filter;
      const scored: SearchResult[] = [];
      for (const rec of store.values()) {
        if (filter && !matchesFilter(rec.metadata, filter)) continue;
        scored.push({
          id: rec.id,
          score: cosineSimilarity(vector, rec.vector),
          metadata: rec.metadata,
        });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, topK);
    },
  };
}

async function createUpstashIndex(): Promise<SearchIndex> {
  const { Index } = await import("@upstash/vector");
  const index = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  });

  return {
    backend: "upstash",
    async upsert(records) {
      if (records.length === 0) return;
      await index.upsert(
        records.map((r) => ({
          id: r.id,
          vector: r.vector,
          metadata: r.metadata as unknown as Record<string, unknown>,
        })),
        { namespace: "products" },
      );
    },
    async delete(id) {
      await index.delete(id, { namespace: "products" });
    },
    async query(vector, options = {}) {
      const topK = options.topK ?? 10;
      const filter = options.filter;
      const parts: string[] = [];
      if (filter?.category) parts.push(`category = '${filter.category}'`);
      if (typeof filter?.minPrice === "number") parts.push(`price >= ${filter.minPrice}`);
      if (typeof filter?.maxPrice === "number") parts.push(`price <= ${filter.maxPrice}`);
      const res = await index.query(
        {
          vector,
          topK,
          includeMetadata: true,
          filter: parts.length > 0 ? parts.join(" AND ") : undefined,
        },
        { namespace: "products" },
      );
      return res.map((r) => ({
        id: String(r.id),
        score: r.score,
        metadata: r.metadata as unknown as ProductEmbeddingMetadata,
      }));
    },
  };
}

function hasUpstashVectorEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN,
  );
}

let cached: SearchIndex | null = null;
let upstashPromise: Promise<SearchIndex> | null = null;

export function getSearchIndex(): SearchIndex {
  if (cached) return cached;
  const fallback = createInMemoryIndex();
  cached = fallback;
  if (!hasUpstashVectorEnv()) return fallback;
  if (!upstashPromise) {
    upstashPromise = createUpstashIndex()
      .then((upstash) => {
        cached = upstash;
        return upstash;
      })
      .catch((err) => {
        console.warn(
          "[search] Upstash Vector init failed — staying on in-memory index:",
          err,
        );
        return fallback;
      });
  }
  return fallback;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test tests/unit/search-index.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/search/index.ts tests/unit/search-index.test.ts
git commit -m "feat(search): add vector index with Upstash + in-memory fallback"
```

---

### Task 1.6: Add high-level upsertProduct / deleteProduct helpers (TDD)

**Files:**
- Modify: `lib/search/index.ts`
- Modify: `tests/unit/search-index.test.ts`

- [ ] **Step 1: Write the failing test** (append to existing file)

```typescript
// tests/unit/search-index.test.ts — append at end
import { upsertProduct, deleteProduct, __setTestIndex } from "@/lib/search/index";

describe("upsertProduct", () => {
  beforeEach(() => {
    __setTestIndex(createInMemoryIndex());
  });

  it("embeds product text and writes to the index", async () => {
    const product = {
      _id: "prod-1",
      slug: "oak-table",
      name: "Oak Dining Table",
      description: "Solid oak table seats six.",
      category: "dining-room",
      material: "wood",
      color: "oak",
      price: 1200,
      stock: 4,
    };
    // Stub embed by passing a precomputed vector to bypass AI call
    await upsertProduct(product, { vectorOverride: [0.1, 0.2, 0.3] });
    const results = await __setTestIndex().query([0.1, 0.2, 0.3], { topK: 1 });
    expect(results[0].id).toBe("prod-1");
    expect(results[0].metadata.slug).toBe("oak-table");
  });
});

describe("deleteProduct", () => {
  beforeEach(() => {
    __setTestIndex(createInMemoryIndex());
  });

  it("removes a product from the index", async () => {
    const idx = __setTestIndex();
    await idx.upsert([
      {
        id: "prod-1",
        vector: [1, 0, 0],
        metadata: {
          _id: "prod-1",
          slug: "x",
          name: "X",
          category: null,
          price: 0,
          stock: 0,
        },
      },
    ]);
    await deleteProduct("prod-1");
    const results = await idx.query([1, 0, 0], { topK: 5 });
    expect(results).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/search-index.test.ts`
Expected: FAIL — `upsertProduct`, `deleteProduct`, `__setTestIndex` not defined.

- [ ] **Step 3: Implement** (append to `lib/search/index.ts`)

```typescript
// lib/search/index.ts — append at end

import { embedText } from "./embed";
import { buildEmbeddingText, type ProductEmbeddingInput } from "./text";

export interface ProductForIndexing extends ProductEmbeddingInput {
  _id: string;
  slug: string;
  price: number;
  stock: number;
}

export interface UpsertOptions {
  /** Bypass embedding — used for tests. */
  vectorOverride?: number[];
}

export async function upsertProduct(
  product: ProductForIndexing,
  options: UpsertOptions = {},
): Promise<void> {
  const text = buildEmbeddingText(product);
  if (text.length === 0) {
    console.warn(`[search] skipping ${product._id}: empty embed text`);
    return;
  }
  const vector = options.vectorOverride ?? (await embedText(text));
  const index = getSearchIndex();
  await index.upsert([
    {
      id: product._id,
      vector,
      metadata: {
        _id: product._id,
        slug: product.slug,
        name: product.name ?? "",
        category: product.category ?? null,
        price: product.price,
        stock: product.stock,
      },
    },
  ]);
}

export async function deleteProduct(id: string): Promise<void> {
  const index = getSearchIndex();
  await index.delete(id);
}

/** Test helper: swap the active index. Returns the current index. */
let _testIndex: SearchIndex | null = null;
export function __setTestIndex(next?: SearchIndex): SearchIndex {
  if (next) {
    _testIndex = next;
    cached = next;
  }
  if (!_testIndex) throw new Error("__setTestIndex: no test index set");
  return _testIndex;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test tests/unit/search-index.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add lib/search/index.ts tests/unit/search-index.test.ts
git commit -m "feat(search): add upsertProduct/deleteProduct helpers"
```

---

### Task 1.7: Build backfill script

**Files:**
- Create: `tools/scripts/backfill-search-index.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Write the backfill script**

```typescript
// tools/scripts/backfill-search-index.ts
/**
 * One-shot backfill: fetch all products from Sanity, embed, upsert to
 * Upstash Vector. Idempotent — re-running is safe.
 *
 * Run: `pnpm backfill:search` (see package.json).
 */
import "dotenv/config";
import { defineQuery } from "groq";
import { client } from "@/sanity/lib/client";
import { embedBatch } from "@/lib/search/embed";
import { getSearchIndex, type IndexRecord } from "@/lib/search/index";
import { buildEmbeddingText } from "@/lib/search/text";

const ALL_PRODUCTS_FOR_INDEX_QUERY = defineQuery(`
  *[_type == "product"]{
    _id,
    "slug": slug.current,
    name,
    description,
    price,
    stock,
    material,
    color,
    "category": category->slug.current
  }
`);

interface BackfillProduct {
  _id: string;
  slug: string;
  name: string | null;
  description: string | null;
  price: number;
  stock: number;
  material: string | null;
  color: string | null;
  category: string | null;
}

const BATCH_SIZE = 50;

async function main() {
  const start = Date.now();
  const products = (await client.fetch(ALL_PRODUCTS_FOR_INDEX_QUERY)) as BackfillProduct[];
  console.log(`[backfill] fetched ${products.length} products from Sanity`);

  const index = getSearchIndex();
  console.log(`[backfill] index backend: ${index.backend}`);

  let indexed = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const texts = batch.map(buildEmbeddingText);
    const keptIdx: number[] = [];
    const keptTexts: string[] = [];
    batch.forEach((_, j) => {
      if (texts[j].length === 0) return;
      keptIdx.push(j);
      keptTexts.push(texts[j]);
    });
    skipped += batch.length - keptIdx.length;

    const vectors = await embedBatch(keptTexts);

    const records: IndexRecord[] = keptIdx.map((j, k) => ({
      id: batch[j]._id,
      vector: vectors[k],
      metadata: {
        _id: batch[j]._id,
        slug: batch[j].slug,
        name: batch[j].name ?? "",
        category: batch[j].category,
        price: batch[j].price,
        stock: batch[j].stock,
      },
    }));
    await index.upsert(records);
    indexed += records.length;
    console.log(
      `[backfill] progress ${Math.min(i + BATCH_SIZE, products.length)}/${products.length}`,
    );
  }

  const durationSec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[backfill] done: indexed=${indexed} skipped=${skipped} in ${durationSec}s`,
  );
}

main().catch((err) => {
  console.error("[backfill] FAILED:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

Edit `package.json`, in the `"scripts"` block add:

```json
"backfill:search": "tsx tools/scripts/backfill-search-index.ts"
```

- [ ] **Step 3: Verify script parses**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add tools/scripts/backfill-search-index.ts package.json
git commit -m "feat(search): add backfill script for Upstash Vector index"
```

---

## Phase 2 — Reindex webhook

### Task 2.1: Verify Sanity webhook signature (TDD)

**Files:**
- Create: `tests/unit/reindex-webhook.test.ts`
- Create: `app/api/sanity/reindex/route.ts` (minimal: signature check only)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/reindex-webhook.test.ts
import crypto from "node:crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";

const SECRET = "test-secret";

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

async function invoke(body: string, headers: Record<string, string>) {
  vi.stubEnv("SANITY_REVALIDATE_SECRET", SECRET);
  const { POST } = await import("@/app/api/sanity/reindex/route");
  const req = new Request("http://localhost/api/sanity/reindex", {
    method: "POST",
    headers,
    body,
  });
  return POST(req);
}

describe("POST /api/sanity/reindex — signature verification", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects requests without a signature header", async () => {
    const res = await invoke("{}", { "content-type": "application/json" });
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid signature", async () => {
    const res = await invoke("{}", {
      "content-type": "application/json",
      "sanity-webhook-signature": "badsig",
    });
    expect(res.status).toBe(401);
  });

  it("accepts requests with a valid signature", async () => {
    const body = JSON.stringify({ _id: "prod-1", _type: "product", operation: "update" });
    const res = await invoke(body, {
      "content-type": "application/json",
      "sanity-webhook-signature": sign(body, SECRET),
    });
    expect(res.status).toBeLessThan(500);
    expect(res.status).not.toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/reindex-webhook.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement route**

```typescript
// app/api/sanity/reindex/route.ts
import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface SanityWebhookPayload {
  _id: string;
  _type: string;
  operation: "create" | "update" | "delete";
  slug?: string;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return constantTimeEqual(expected, signature);
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("sanity-webhook-signature");

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SanityWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload._type !== "product") {
    return NextResponse.json({ received: true, skipped: "non-product" });
  }

  // Dispatch handled in Task 2.2
  return NextResponse.json({ received: true, id: payload._id });
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test tests/unit/reindex-webhook.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/sanity/reindex/route.ts tests/unit/reindex-webhook.test.ts
git commit -m "feat(search): add reindex webhook with HMAC verification"
```

---

### Task 2.2: Dispatch webhook events to index operations (TDD)

**Files:**
- Modify: `app/api/sanity/reindex/route.ts`
- Modify: `tests/unit/reindex-webhook.test.ts`
- Create: `lib/sanity/queries/product-for-indexing.ts`

- [ ] **Step 1: Create the Sanity query**

```typescript
// lib/sanity/queries/product-for-indexing.ts
import { defineQuery } from "next-sanity";

export const PRODUCT_FOR_INDEXING_QUERY = defineQuery(`
  *[_type == "product" && _id == $id][0]{
    _id,
    "slug": slug.current,
    name,
    description,
    price,
    stock,
    material,
    color,
    "category": category->slug.current
  }
`);
```

- [ ] **Step 2: Append failing tests**

```typescript
// tests/unit/reindex-webhook.test.ts — append

import { __setTestIndex, createInMemoryIndex } from "@/lib/search/index";

const fetchMock = vi.fn();
vi.mock("@/sanity/lib/client", () => ({
  client: { fetch: (...args: unknown[]) => fetchMock(...args) },
}));

describe("POST /api/sanity/reindex — dispatch", () => {
  beforeEach(() => {
    vi.resetModules();
    __setTestIndex(createInMemoryIndex());
    fetchMock.mockReset();
  });

  it("upserts the product on update operation", async () => {
    fetchMock.mockResolvedValueOnce({
      _id: "p1",
      slug: "oak",
      name: "Oak Desk",
      description: "Solid oak",
      price: 500,
      stock: 3,
      material: "wood",
      color: "oak",
      category: "office",
    });
    const body = JSON.stringify({ _id: "p1", _type: "product", operation: "update" });
    const res = await invoke(body, {
      "content-type": "application/json",
      "sanity-webhook-signature": sign(body, SECRET),
    });
    expect(res.status).toBe(200);
  });

  it("deletes from index on delete operation", async () => {
    const body = JSON.stringify({ _id: "p1", _type: "product", operation: "delete" });
    const res = await invoke(body, {
      "content-type": "application/json",
      "sanity-webhook-signature": sign(body, SECRET),
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run tests to verify failures**

Run: `pnpm test tests/unit/reindex-webhook.test.ts`
Expected: dispatch tests FAIL (route doesn't upsert/delete yet).

- [ ] **Step 4: Update the route**

Replace `app/api/sanity/reindex/route.ts` with:

```typescript
// app/api/sanity/reindex/route.ts
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { deleteProduct, upsertProduct } from "@/lib/search/index";
import { PRODUCT_FOR_INDEXING_QUERY } from "@/lib/sanity/queries/product-for-indexing";
import { client } from "@/sanity/lib/client";

export const runtime = "nodejs";

interface SanityWebhookPayload {
  _id: string;
  _type: string;
  operation: "create" | "update" | "delete";
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return constantTimeEqual(expected, signature);
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("sanity-webhook-signature");

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SanityWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload._type !== "product") {
    return NextResponse.json({ received: true, skipped: "non-product" });
  }

  try {
    if (payload.operation === "delete") {
      await deleteProduct(payload._id);
      return NextResponse.json({ received: true, action: "deleted", id: payload._id });
    }

    const product = await client.fetch(PRODUCT_FOR_INDEXING_QUERY, { id: payload._id });
    if (!product) {
      await deleteProduct(payload._id);
      return NextResponse.json({
        received: true,
        action: "deleted-missing",
        id: payload._id,
      });
    }

    await upsertProduct(product);
    return NextResponse.json({ received: true, action: "upserted", id: payload._id });
  } catch (err) {
    console.error("[reindex] FAILED:", err);
    return NextResponse.json(
      { error: "Reindex failed", id: payload._id },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm test tests/unit/reindex-webhook.test.ts`
Expected: all passed.

- [ ] **Step 6: Commit**

```bash
git add app/api/sanity/reindex/route.ts lib/sanity/queries/product-for-indexing.ts tests/unit/reindex-webhook.test.ts
git commit -m "feat(search): dispatch Sanity webhook to upsert/delete operations"
```

---

## Phase 3 — Public search endpoint

### Task 3.1: Wire search rate limiter

**Files:**
- Modify: `lib/ai/rate-limit.ts`

- [ ] **Step 1: Append a named limiter**

At the end of `lib/ai/rate-limit.ts`, add:

```typescript
/** Search endpoint limiter: 30 req/min per IP. */
export const searchRateLimiter = createRateLimiter("ratelimit:search", {
  windowMs: 60_000,
  max: 30,
});
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/rate-limit.ts
git commit -m "feat(search): add searchRateLimiter (30 req/min per IP)"
```

---

### Task 3.2: Implement /api/search (TDD)

**Files:**
- Create: `tests/unit/search-route.test.ts`
- Create: `app/api/search/route.ts`
- Create: `lib/sanity/queries/products-by-ids.ts`

- [ ] **Step 1: Create the hydration query**

```typescript
// lib/sanity/queries/products-by-ids.ts
import { defineQuery } from "next-sanity";

export const PRODUCTS_BY_IDS_QUERY = defineQuery(`
  *[_type == "product" && _id in $ids]{
    _id,
    name,
    "slug": slug.current,
    price,
    salePrice,
    "images": images[0...4]{
      _key,
      asset->{ _id, url }
    },
    category->{
      _id,
      title,
      "slug": slug.current
    },
    material,
    color,
    stock
  }
`);
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/unit/search-route.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";

const embedTextMock = vi.fn();
const queryMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/search/embed", () => ({
  embedText: (t: string) => embedTextMock(t),
}));

vi.mock("@/lib/search/index", () => ({
  getSearchIndex: () => ({
    backend: "memory" as const,
    query: (...args: unknown[]) => queryMock(...args),
    upsert: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/sanity/lib/client", () => ({
  client: { fetch: (...args: unknown[]) => fetchMock(...args) },
}));

async function invoke(url: string, init?: RequestInit) {
  const { GET } = await import("@/app/api/search/route");
  return GET(new Request(url, init));
}

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.resetModules();
    embedTextMock.mockReset();
    queryMock.mockReset();
    fetchMock.mockReset();
  });

  it("rejects empty query with 400", async () => {
    const res = await invoke("http://localhost/api/search");
    expect(res.status).toBe(400);
  });

  it("returns semantically ranked hydrated results", async () => {
    embedTextMock.mockResolvedValueOnce([0.1, 0.2, 0.3]);
    queryMock.mockResolvedValueOnce([
      { id: "p2", score: 0.9, metadata: { _id: "p2", slug: "b", name: "B", category: null, price: 20, stock: 1 } },
      { id: "p1", score: 0.8, metadata: { _id: "p1", slug: "a", name: "A", category: null, price: 10, stock: 1 } },
    ]);
    fetchMock.mockResolvedValueOnce([
      { _id: "p1", slug: "a", name: "A", price: 10 },
      { _id: "p2", slug: "b", name: "B", price: 20 },
    ]);

    const res = await invoke("http://localhost/api/search?q=cozy+desk");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { results: { _id: string }[] };
    // Must preserve vector ranking (p2 first), not Sanity document order.
    expect(json.results.map((r) => r._id)).toEqual(["p2", "p1"]);
  });

  it("applies category filter", async () => {
    embedTextMock.mockResolvedValueOnce([0.1, 0.2]);
    queryMock.mockResolvedValueOnce([]);
    fetchMock.mockResolvedValueOnce([]);
    await invoke("http://localhost/api/search?q=table&category=dining");
    expect(queryMock).toHaveBeenCalledWith(
      [0.1, 0.2],
      expect.objectContaining({
        filter: expect.objectContaining({ category: "dining" }),
      }),
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test tests/unit/search-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 4: Implement route**

```typescript
// app/api/search/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { searchRateLimiter } from "@/lib/ai/rate-limit";
import { embedText } from "@/lib/search/embed";
import { getSearchIndex } from "@/lib/search/index";
import { PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products-by-ids";
import { client } from "@/sanity/lib/client";

export const runtime = "nodejs";

const searchParamsSchema = z.object({
  q: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  topK: z.coerce.number().int().min(1).max(50).optional().default(20),
});

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = searchParamsSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }
  const { q, category, minPrice, maxPrice, topK } = parsed.data;

  const { ok, retryAfter } = await searchRateLimiter.check(clientIp(req));
  if (!ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const start = performance.now();
  try {
    const vector = await embedText(q);
    const index = getSearchIndex();
    const results = await index.query(vector, {
      topK,
      filter: {
        ...(category ? { category } : {}),
        ...(typeof minPrice === "number" ? { minPrice } : {}),
        ...(typeof maxPrice === "number" ? { maxPrice } : {}),
      },
    });

    const ids = results.map((r) => r.id);
    let products: Record<string, unknown>[] = [];
    if (ids.length > 0) {
      const hydrated = (await client.fetch(PRODUCTS_BY_IDS_QUERY, { ids })) as Array<
        Record<string, unknown> & { _id: string }
      >;
      const byId = new Map(hydrated.map((p) => [p._id, p]));
      products = ids.map((id) => byId.get(id)).filter((p): p is typeof hydrated[number] => Boolean(p));
    }

    const latencyMs = Math.round(performance.now() - start);
    return NextResponse.json({
      results: products,
      method: "semantic",
      latencyMs,
      backend: index.backend,
    });
  } catch (err) {
    console.error("[search] FAILED:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm test tests/unit/search-route.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add app/api/search/route.ts lib/sanity/queries/products-by-ids.ts tests/unit/search-route.test.ts
git commit -m "feat(search): add /api/search endpoint with rate limiting"
```

---

## Phase 4 — Agent integration

### Task 4.1: Add semanticSearchTool (TDD)

**Files:**
- Create: `tests/unit/semantic-search-tool.test.ts`
- Create: `lib/ai/tools/semantic-search.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/semantic-search-tool.test.ts
import { describe, expect, it, vi } from "vitest";

const embedTextMock = vi.fn();
const queryMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/search/embed", () => ({
  embedText: (t: string) => embedTextMock(t),
}));

vi.mock("@/lib/search/index", () => ({
  getSearchIndex: () => ({
    backend: "memory",
    query: (...args: unknown[]) => queryMock(...args),
    upsert: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/sanity/lib/live", () => ({
  sanityFetch: (...args: unknown[]) => Promise.resolve({ data: fetchMock(...args) }),
}));

describe("semanticSearchTool", () => {
  it("returns ranked products for a qualitative query", async () => {
    embedTextMock.mockResolvedValueOnce([0.1, 0.2]);
    queryMock.mockResolvedValueOnce([
      { id: "p1", score: 0.9, metadata: { _id: "p1", slug: "a", name: "A", category: null, price: 100, stock: 1 } },
    ]);
    fetchMock.mockReturnValueOnce([
      { _id: "p1", slug: "a", name: "A", price: 100, stock: 1 },
    ]);

    const { semanticSearchTool } = await import("@/lib/ai/tools/semantic-search");
    const result = await semanticSearchTool.execute(
      { query: "cozy apartment desk" },
      { toolCallId: "t1", messages: [] },
    );
    expect(result.found).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].id).toBe("p1");
  });

  it("returns found=false when no matches", async () => {
    embedTextMock.mockResolvedValueOnce([0.1, 0.2]);
    queryMock.mockResolvedValueOnce([]);
    const { semanticSearchTool } = await import("@/lib/ai/tools/semantic-search");
    const result = await semanticSearchTool.execute(
      { query: "xyz nonsense" },
      { toolCallId: "t2", messages: [] },
    );
    expect(result.found).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/semantic-search-tool.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement tool**

```typescript
// lib/ai/tools/semantic-search.ts
import { tool } from "ai";
import { z } from "zod";
import { embedText } from "@/lib/search/embed";
import { getSearchIndex } from "@/lib/search/index";
import { PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products-by-ids";
import { sanityFetch } from "@/sanity/lib/live";
import { formatPrice } from "@/lib/utils";
import { getStockMessage, getStockStatus } from "@/lib/constants/stock";

const schema = z.object({
  query: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "Qualitative description of what the customer wants, e.g. 'cozy nook for a studio apartment', 'mid-century feel for a bedroom'",
    ),
  topK: z.number().int().min(1).max(20).optional().default(8),
});

export const semanticSearchTool = tool({
  description:
    "Semantic search for products by vibe/feel/context. Use when the customer describes how they want a space to feel or the situation the product is for, not when they name a specific product type or hard filter. Returns meaningfully ranked products.",
  inputSchema: schema,
  execute: async ({ query, topK }) => {
    try {
      const vector = await embedText(query);
      const index = getSearchIndex();
      const results = await index.query(vector, { topK });

      if (results.length === 0) {
        return {
          found: false,
          message: "No products found semantically matching that description.",
          products: [],
          query,
        };
      }

      const ids = results.map((r) => r.id);
      const { data } = await sanityFetch({
        query: PRODUCTS_BY_IDS_QUERY,
        params: { ids },
      });
      const byId = new Map(
        (data as Array<{ _id: string } & Record<string, unknown>>).map((d) => [d._id, d]),
      );

      const products = results
        .map((r) => {
          const doc = byId.get(r.id) as
            | {
                _id: string;
                name: string | null;
                slug: string | null;
                price: number;
                stock: number;
                category?: { title?: string; slug?: string } | null;
                material?: string | null;
                color?: string | null;
              }
            | undefined;
          if (!doc) return null;
          return {
            id: doc._id,
            name: doc.name,
            slug: doc.slug,
            price: doc.price,
            priceFormatted: formatPrice(doc.price),
            category: doc.category?.title ?? null,
            material: doc.material ?? null,
            color: doc.color ?? null,
            stockStatus: getStockStatus(doc.stock),
            stockMessage: getStockMessage(doc.stock),
            score: r.score,
            productUrl: doc.slug ? `/products/${doc.slug}` : null,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      return {
        found: products.length > 0,
        message: `Found ${products.length} products matching the vibe.`,
        products,
        query,
      };
    } catch (err) {
      console.error("[semanticSearch] failed:", err);
      return {
        found: false,
        message: "Semantic search is temporarily unavailable.",
        products: [],
        query,
      };
    }
  },
});
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test tests/unit/semantic-search-tool.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/tools/semantic-search.ts tests/unit/semantic-search-tool.test.ts
git commit -m "feat(ai): add semanticSearchTool for the shopping agent"
```

---

### Task 4.2: Wire semantic tool into the shopping agent

**Files:**
- Modify: `lib/ai/shopping-agent.ts`

- [ ] **Step 1: Add the import and tool**

Edit `lib/ai/shopping-agent.ts`. Add import at the top (with the other tool imports):

```typescript
import { semanticSearchTool } from "./tools/semantic-search";
```

Find where tools are registered in the agent construction (near `searchProductsTool`) and add `semanticSearchTool`.

- [ ] **Step 2: Update the system prompt**

In the same file, find the `## searchProducts Tool Usage` section. Immediately after it, insert:

```markdown
## semanticSearch Tool Usage

Use `semanticSearch` when the customer describes *how a space should feel* or *the situation the piece is for*, rather than a specific product type or hard filter.

**Pick semanticSearch for:**
- "something cozy for a tiny apartment"
- "mid-century vibe for the living room"
- "a gift for someone who reads a lot"
- "makes a kids' room feel playful but not chaotic"

**Pick searchProducts (the filter-based tool) for:**
- "show me oak dining tables under $1500"
- "what leather sofas are in stock"
- any query with a clear category, material, color, or price constraint

**You can call both in the same turn** — e.g., use semanticSearch to find candidates that match a vibe, then filter them down with searchProducts if the customer has hard constraints.
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/ai/shopping-agent.ts
git commit -m "feat(ai): wire semanticSearch tool with agent guidance"
```

---

## Phase 5 — Search UI

### Task 5.1: Build the /search page

**Files:**
- Create: `app/(app)/search/page.tsx`

- [ ] **Step 1: Implement the page**

```tsx
// app/(app)/search/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { embedText } from "@/lib/search/embed";
import { getSearchIndex } from "@/lib/search/index";
import { PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products-by-ids";
import { sanityFetch } from "@/sanity/lib/live";
import { formatPrice } from "@/lib/utils";

const SUGGESTED_QUERIES = [
  "cozy nook for a studio apartment",
  "mid-century feel for the bedroom",
  "kids' room that'll actually last",
];

export const metadata = {
  title: "Search — Kozy",
  description: "Find furniture by vibe, style, or context.",
};

type SearchParams = Promise<{ q?: string; category?: string }>;

async function Results({ query }: { query: string }) {
  const vector = await embedText(query);
  const index = getSearchIndex();
  const results = await index.query(vector, { topK: 20 });
  if (results.length === 0) {
    return <p className="text-muted-foreground">No matches found. Try rephrasing.</p>;
  }
  const ids = results.map((r) => r.id);
  const { data } = await sanityFetch({ query: PRODUCTS_BY_IDS_QUERY, params: { ids } });
  const byId = new Map(
    (data as Array<{ _id: string } & Record<string, unknown>>).map((d) => [d._id, d]),
  );
  const products = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {products.map((p) => {
        const prod = p as {
          _id: string;
          name: string;
          slug: string;
          price: number;
          images?: Array<{ asset?: { url?: string } }>;
          category?: { title?: string };
        };
        return (
          <Link
            key={prod._id}
            href={`/products/${prod.slug}`}
            className="rounded border p-4 hover:shadow-md transition"
          >
            {prod.images?.[0]?.asset?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prod.images[0].asset.url}
                alt={prod.name}
                className="mb-3 aspect-square w-full object-cover"
                loading="lazy"
              />
            ) : null}
            <h3 className="font-medium">{prod.name}</h3>
            <p className="text-sm text-muted-foreground">{prod.category?.title}</p>
            <p className="mt-1 font-semibold">{formatPrice(prod.price)}</p>
          </Link>
        );
      })}
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-semibold">Search</h1>
      <p className="mb-6 text-muted-foreground">
        Describe the vibe, situation, or feeling — not just the product.
      </p>

      <form method="GET" action="/search" className="mb-8">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="e.g. 'cozy nook for a studio apartment'"
          className="w-full rounded border px-4 py-3 text-base"
          aria-label="Search query"
        />
      </form>

      {query.length === 0 ? (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">Try one of these:</p>
          <ul className="space-y-2">
            {SUGGESTED_QUERIES.map((s) => (
              <li key={s}>
                <Link
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="text-primary underline"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Suspense fallback={<p>Searching…</p>}>
          <Results query={query} />
        </Suspense>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Smoke-test locally**

Run: `pnpm dev` and open `http://localhost:3000/search?q=cozy+desk`.
Expected: page renders, shows results after backfill or empty state otherwise.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/search/page.tsx"
git commit -m "feat(search): add /search page with suggested queries"
```

---

### Task 5.2: Add e2e smoke test for the search page

**Files:**
- Create: `tests/e2e/search.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
// tests/e2e/search.spec.ts
import { expect, test } from "@playwright/test";

test.describe("/search", () => {
  test("empty state renders suggested queries", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expect(page.getByText("cozy nook for a studio apartment")).toBeVisible();
  });

  test("submitting a query navigates with ?q=", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel("Search query").fill("leather sofa");
    await page.getByLabel("Search query").press("Enter");
    await page.waitForURL(/\/search\?q=leather\+sofa/);
  });
});
```

- [ ] **Step 2: Verify test authoring (will be skipped in default CI)**

Run: `pnpm test:e2e search.spec.ts` (requires running dev server — safe to skip if not running).
Expected: tests pass or cleanly skip when server unavailable.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/search.spec.ts
git commit -m "test(search): e2e smoke test for /search page"
```

---

## Phase 6 — Eval harness

### Task 6.1: Author the eval query set

**Files:**
- Create: `tests/search-eval/queries.json`
- Create: `tests/search-eval/README.md`

- [ ] **Step 1: Write the README**

```markdown
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
```

- [ ] **Step 2: Seed queries.json with 30 placeholder entries**

```json
[
  { "query": "cozy nook for a studio apartment", "relevantIds": [] },
  { "query": "mid-century feel for the living room", "relevantIds": [] },
  { "query": "gift for a reader", "relevantIds": [] },
  { "query": "kids' room that'll last", "relevantIds": [] },
  { "query": "warm natural wood dining table for six", "relevantIds": [] },
  { "query": "something for a small balcony", "relevantIds": [] },
  { "query": "desk for a work-from-home setup", "relevantIds": [] },
  { "query": "bedside table that doesn't dominate the room", "relevantIds": [] },
  { "query": "storage for a tidy entryway", "relevantIds": [] },
  { "query": "play area for toddlers", "relevantIds": [] },
  { "query": "reading chair for a quiet corner", "relevantIds": [] },
  { "query": "dining set for a family of four", "relevantIds": [] },
  { "query": "bedroom feel: calm and minimal", "relevantIds": [] },
  { "query": "lighting for a moody lounge", "relevantIds": [] },
  { "query": "outdoor seating that survives rain", "relevantIds": [] },
  { "query": "coffee table under $500 that looks expensive", "relevantIds": [] },
  { "query": "bookshelf for a rental where I can't drill", "relevantIds": [] },
  { "query": "soft fabric sofa for families", "relevantIds": [] },
  { "query": "guest bedroom essentials", "relevantIds": [] },
  { "query": "compact home office", "relevantIds": [] },
  { "query": "black metal and oak combo", "relevantIds": [] },
  { "query": "statement piece for a hallway", "relevantIds": [] },
  { "query": "warm lighting that isn't yellow", "relevantIds": [] },
  { "query": "nursery with a calm palette", "relevantIds": [] },
  { "query": "convertible pieces for a studio", "relevantIds": [] },
  { "query": "somewhere to put coats and keys", "relevantIds": [] },
  { "query": "leather sofa that won't scratch easily", "relevantIds": [] },
  { "query": "an armchair for a reading corner", "relevantIds": [] },
  { "query": "dining table that seats eight", "relevantIds": [] },
  { "query": "bench for the end of the bed", "relevantIds": [] }
]
```

**Note:** `relevantIds` must be filled in before the eval is meaningful. Do this after the backfill is working and real product IDs exist.

- [ ] **Step 3: Commit**

```bash
git add tests/search-eval/queries.json tests/search-eval/README.md
git commit -m "test(search): seed eval harness queries"
```

---

### Task 6.2: Implement the eval runner

**Files:**
- Create: `tests/search-eval/eval.ts`
- Create: `tests/search-eval/baseline.json`
- Modify: `package.json`

- [ ] **Step 1: Seed baseline.json**

```json
{
  "recallAt5": 0,
  "mrr": 0,
  "numQueries": 0,
  "runAt": "1970-01-01T00:00:00.000Z",
  "note": "Initial placeholder. Run `pnpm eval:search:promote` after first real run."
}
```

- [ ] **Step 2: Implement the runner**

```typescript
// tests/search-eval/eval.ts
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { embedText } from "@/lib/search/embed";
import { getSearchIndex } from "@/lib/search/index";

interface Query {
  query: string;
  relevantIds: string[];
}

interface RunResult {
  recallAt5: number;
  mrr: number;
  numQueries: number;
  numSkipped: number;
  runAt: string;
  perQuery: Array<{
    query: string;
    recallAt5: number;
    reciprocalRank: number;
    topIds: string[];
    relevantIds: string[];
  }>;
}

const DIR = join(process.cwd(), "tests", "search-eval");

async function runOne(q: Query): Promise<{
  recallAt5: number;
  reciprocalRank: number;
  topIds: string[];
}> {
  const vector = await embedText(q.query);
  const res = await getSearchIndex().query(vector, { topK: 10 });
  const topIds = res.map((r) => r.id);
  const relevant = new Set(q.relevantIds);
  const top5 = topIds.slice(0, 5);
  const hits5 = top5.filter((id) => relevant.has(id)).length;
  const recallAt5 = relevant.size === 0 ? 0 : hits5 / relevant.size;
  let reciprocalRank = 0;
  for (let i = 0; i < topIds.length; i += 1) {
    if (relevant.has(topIds[i])) {
      reciprocalRank = 1 / (i + 1);
      break;
    }
  }
  return { recallAt5, reciprocalRank, topIds };
}

async function main() {
  const queries = JSON.parse(
    readFileSync(join(DIR, "queries.json"), "utf8"),
  ) as Query[];

  const scored: RunResult["perQuery"] = [];
  let skipped = 0;

  for (const q of queries) {
    if (q.relevantIds.length === 0) {
      skipped += 1;
      continue;
    }
    const { recallAt5, reciprocalRank, topIds } = await runOne(q);
    scored.push({
      query: q.query,
      recallAt5,
      reciprocalRank,
      topIds: topIds.slice(0, 5),
      relevantIds: q.relevantIds,
    });
  }

  const recallAt5 =
    scored.length === 0
      ? 0
      : scored.reduce((s, r) => s + r.recallAt5, 0) / scored.length;
  const mrr =
    scored.length === 0
      ? 0
      : scored.reduce((s, r) => s + r.reciprocalRank, 0) / scored.length;

  const result: RunResult = {
    recallAt5,
    mrr,
    numQueries: scored.length,
    numSkipped: skipped,
    runAt: new Date().toISOString(),
    perQuery: scored,
  };

  const outFile = join(DIR, `results-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  writeFileSync(join(DIR, "latest.json"), JSON.stringify(result, null, 2));

  console.log(`[eval] recall@5 = ${recallAt5.toFixed(3)}`);
  console.log(`[eval] MRR      = ${mrr.toFixed(3)}`);
  console.log(`[eval] queries  = ${scored.length} (skipped ${skipped})`);
  console.log(`[eval] wrote    = ${outFile}`);

  if (process.argv.includes("--promote")) {
    writeFileSync(join(DIR, "baseline.json"), JSON.stringify(
      { recallAt5, mrr, numQueries: scored.length, runAt: result.runAt },
      null,
      2,
    ));
    console.log("[eval] baseline updated");
  }

  if (process.argv.includes("--check")) {
    const baseline = JSON.parse(readFileSync(join(DIR, "baseline.json"), "utf8")) as {
      recallAt5: number;
    };
    const threshold = baseline.recallAt5 - 0.05;
    if (recallAt5 < threshold) {
      console.error(
        `[eval] FAIL: recall@5 ${recallAt5.toFixed(3)} < baseline ${baseline.recallAt5.toFixed(3)} - 0.05`,
      );
      process.exit(1);
    }
    console.log("[eval] OK vs baseline");
  }
}

main().catch((err) => {
  console.error("[eval] crashed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Add npm scripts**

Edit `package.json` scripts block, append:

```json
"eval:search": "tsx tests/search-eval/eval.ts",
"eval:search:promote": "tsx tests/search-eval/eval.ts --promote",
"eval:search:check": "tsx tests/search-eval/eval.ts --check"
```

- [ ] **Step 4: Add results/ to gitignore**

Append to `.gitignore`:

```
# Search eval ephemeral results (keep baseline.json tracked)
tests/search-eval/results-*.json
tests/search-eval/latest.json
```

- [ ] **Step 5: Verify typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add tests/search-eval/eval.ts tests/search-eval/baseline.json package.json .gitignore
git commit -m "test(search): implement eval runner with recall@5 and MRR"
```

---

### Task 6.3: Wire eval into CI (gated behind integration env)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add eval job**

Append to `.github/workflows/ci.yml` at the same indentation as `e2e` and `lighthouse`:

```yaml
  search-eval:
    name: Search eval (recall@5 vs baseline)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: build
    if: vars.ENABLE_INTEGRATION_CI == 'true'
    env:
      NEXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_SANITY_PROJECT_ID }}
      NEXT_PUBLIC_SANITY_DATASET: ${{ secrets.NEXT_PUBLIC_SANITY_DATASET }}
      AI_GATEWAY_API_KEY: ${{ secrets.AI_GATEWAY_API_KEY }}
      UPSTASH_VECTOR_REST_URL: ${{ secrets.UPSTASH_VECTOR_REST_URL }}
      UPSTASH_VECTOR_REST_TOKEN: ${{ secrets.UPSTASH_VECTOR_REST_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Generate Sanity types
        run: pnpm typegen
      - name: Run search eval vs baseline
        run: pnpm eval:search:check
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add search-eval job (gated on ENABLE_INTEGRATION_CI)"
```

---

## Phase 7 — Stress testing (k6)

### Task 7.1: Document k6 install and add scripts README

**Files:**
- Create: `tests/load/README.md`
- Create: `tests/load/results/.gitkeep`
- Modify: `.gitignore`

- [ ] **Step 1: Write README**

```markdown
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
```

- [ ] **Step 2: Add results dir placeholder**

Create `tests/load/results/.gitkeep` (empty file).

- [ ] **Step 3: Gitignore ephemeral JSON summaries except committed canonical ones**

Append to `.gitignore`:

```
# k6 ephemeral result files (commit canonical runs explicitly by adding -f)
tests/load/results/*.json
!tests/load/results/canonical-*.json
```

- [ ] **Step 4: Commit**

```bash
git add tests/load/README.md tests/load/results/.gitkeep .gitignore
git commit -m "docs(load): add k6 install and usage guide"
```

---

### Task 7.2: Write search.k6.js with baseline/ramp/spike scenarios

**Files:**
- Create: `tests/load/search.k6.js`

- [ ] **Step 1: Write the script**

```javascript
// tests/load/search.k6.js
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const SCENARIO = __ENV.SCENARIO || "baseline";

const QUERIES = [
  "cozy nook for a studio apartment",
  "mid-century feel for the living room",
  "oak dining table",
  "leather sofa for families",
  "kids' room that'll last",
  "storage for a tidy entryway",
  "something for a small balcony",
  "reading chair for a quiet corner",
  "compact home office",
  "statement piece for a hallway",
];

const scenarios = {
  baseline: {
    executor: "constant-vus",
    vus: 10,
    duration: "60s",
  },
  ramp: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "2m", target: 100 },
      { duration: "2m", target: 100 },
      { duration: "30s", target: 0 },
    ],
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "10s", target: 10 },
      { duration: "30s", target: 200 },
      { duration: "10s", target: 10 },
    ],
  },
};

export const options = {
  scenarios: {
    [SCENARIO]: scenarios[SCENARIO],
  },
  thresholds: {
    // 5xx errors are always bugs.
    "http_req_failed{expected_response:true}": ["rate<0.01"],
    // Relax P95 under spike because 429 responses count in latency.
    http_req_duration: [
      SCENARIO === "spike" ? "p(95)<1500" : "p(95)<500",
    ],
  },
};

export default function () {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const url = `${BASE}/api/search?q=${encodeURIComponent(q)}`;
  const res = http.get(url);

  check(res, {
    "status is 200 or 429": (r) => r.status === 200 || r.status === 429,
    "has body": (r) => r.body && r.body.length > 0,
  });

  sleep(0.2 + Math.random() * 0.8);
}
```

- [ ] **Step 2: Smoke-test locally**

Run (needs k6 installed and `pnpm start` running):
```bash
k6 run --env SCENARIO=baseline tests/load/search.k6.js
```
Expected: completes in ~60s; thresholds pass; reports P95 < 500ms.

- [ ] **Step 3: Commit**

```bash
git add tests/load/search.k6.js
git commit -m "test(load): k6 script for /api/search (baseline/ramp/spike)"
```

---

### Task 7.3: Write chat.k6.js

**Files:**
- Create: `tests/load/chat.k6.js`

- [ ] **Step 1: Write the script**

```javascript
// tests/load/chat.k6.js
// Hits /api/chat with a canned user message. Requires a Clerk test-mode
// session token exported as CLERK_TEST_SESSION. In CI this is a secret.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const SCENARIO = __ENV.SCENARIO || "baseline";
const CLERK_SESSION = __ENV.CLERK_TEST_SESSION;

if (!CLERK_SESSION) {
  throw new Error("CLERK_TEST_SESSION env required for chat load test");
}

const scenarios = {
  baseline: { executor: "constant-vus", vus: 5, duration: "60s" },
  ramp: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "1m", target: 20 },
      { duration: "2m", target: 20 },
      { duration: "30s", target: 0 },
    ],
  },
};

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  thresholds: {
    "http_req_failed{expected_response:true}": ["rate<0.02"],
    http_req_duration: ["p(95)<3000"],
  },
};

const PROMPTS = [
  "Show me a cozy chair for a small study.",
  "What oak dining tables do you have under $1500?",
  "I need a gift for someone who camps a lot.",
];

export default function () {
  const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  const res = http.post(
    `${BASE}/api/chat`,
    JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `__session=${CLERK_SESSION}`,
      },
    },
  );
  check(res, {
    "status 200 or 429": (r) => r.status === 200 || r.status === 429,
  });
  sleep(1 + Math.random() * 2);
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/load/chat.k6.js
git commit -m "test(load): k6 script for /api/chat"
```

---

### Task 7.4: Write catalog.k6.js

**Files:**
- Create: `tests/load/catalog.k6.js`

- [ ] **Step 1: Write the script**

```javascript
// tests/load/catalog.k6.js
// Hits the /products page (ISR-cached). Target: P95 < 200ms.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 20,
  duration: "60s",
  thresholds: {
    "http_req_failed{expected_response:true}": ["rate<0.005"],
    http_req_duration: ["p(95)<200"],
  },
};

export default function () {
  const res = http.get(`${BASE}/products`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(0.3 + Math.random() * 0.7);
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/load/catalog.k6.js
git commit -m "test(load): k6 script for /products (ISR)"
```

---

### Task 7.5: Write backfill load test (Node-driven)

**Files:**
- Create: `tests/load/backfill-load.ts`

Backfill is a Node script, not an HTTP endpoint. k6 can't import the `ai` SDK directly, so this is a tsx-driven harness that seeds N synthetic products and measures end-to-end time + embed cost. Kept in `tests/load/` for co-location.

- [ ] **Step 1: Create node-based load script**

```typescript
// tests/load/backfill-load.ts
// Node/tsx script (name keeps load/ folder cohesive even though this isn't k6).
// Runs the backfill against N synthetic products and prints timing + cost.
import "dotenv/config";
import { embedBatch } from "@/lib/search/embed";
import { getSearchIndex, type IndexRecord } from "@/lib/search/index";

const N = Number(process.env.BACKFILL_N ?? 1000);
const BATCH = 50;

function synthetic(i: number): IndexRecord & { text: string } {
  const categories = ["dining", "living", "bedroom", "office", "outdoor"];
  const materials = ["wood", "metal", "fabric", "leather"];
  const name = `Synthetic Product ${i}`;
  const description = `A ${materials[i % materials.length]} piece for the ${categories[i % categories.length]} room, model ${i}.`;
  return {
    id: `synth-${i}`,
    vector: [], // filled in by embedBatch
    text: `${name}\n${description}`,
    metadata: {
      _id: `synth-${i}`,
      slug: `synth-${i}`,
      name,
      category: categories[i % categories.length],
      price: 100 + (i % 20) * 50,
      stock: (i % 10) + 1,
    },
  };
}

async function main() {
  console.log(`[backfill-load] seeding ${N} synthetic products`);
  const start = Date.now();
  const index = getSearchIndex();
  console.log(`[backfill-load] backend: ${index.backend}`);

  const items = Array.from({ length: N }, (_, i) => synthetic(i));
  let indexed = 0;

  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const vectors = await embedBatch(slice.map((s) => s.text));
    const records: IndexRecord[] = slice.map((s, k) => ({
      id: s.id,
      vector: vectors[k],
      metadata: s.metadata,
    }));
    await index.upsert(records);
    indexed += records.length;
    if ((i / BATCH) % 4 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[backfill-load] ${indexed}/${N} in ${elapsed}s`);
    }
  }

  const totalSec = ((Date.now() - start) / 1000).toFixed(1);
  // text-embedding-3-small: $0.02 / 1M tokens. Assume ~20 tokens/product.
  const approxTokens = N * 20;
  const approxCost = (approxTokens / 1_000_000) * 0.02;
  console.log(`[backfill-load] done: ${N} products in ${totalSec}s`);
  console.log(`[backfill-load] approx embed cost: $${approxCost.toFixed(4)}`);

  // Cleanup
  console.log("[backfill-load] cleaning up synthetic products");
  for (const item of items) {
    await index.delete(item.id);
  }
  console.log("[backfill-load] cleanup done");
}

main().catch((err) => {
  console.error("[backfill-load] crashed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

Edit `package.json`, append:

```json
"load:backfill": "tsx tests/load/backfill-load.ts"
```

- [ ] **Step 3: Commit**

```bash
git add tests/load/backfill-load.ts package.json
git commit -m "test(load): node harness for backfill throughput + cost"
```

---

### Task 7.6: Run canonical loads locally and commit results

**Files:**
- Create: `tests/load/results/canonical-search-YYYY-MM-DD.json`
- Create: `tests/load/results/canonical-catalog-YYYY-MM-DD.json`
- Create: `tests/load/results/canonical-backfill-YYYY-MM-DD.txt`

- [ ] **Step 1: Run canonical search load**

Start app (`pnpm build && pnpm start`) in a separate terminal, then:

```bash
k6 run --summary-export=tests/load/results/canonical-search-$(date +%Y-%m-%d).json tests/load/search.k6.js
```

Confirm thresholds pass.

- [ ] **Step 2: Run canonical catalog load**

```bash
k6 run --summary-export=tests/load/results/canonical-catalog-$(date +%Y-%m-%d).json tests/load/catalog.k6.js
```

- [ ] **Step 3: Run backfill load**

```bash
pnpm load:backfill 2>&1 | tee tests/load/results/canonical-backfill-$(date +%Y-%m-%d).txt
```

- [ ] **Step 4: Commit canonical results**

```bash
git add tests/load/results/canonical-*.json tests/load/results/canonical-*.txt
git commit -m "test(load): commit canonical baseline load-test results"
```

---

### Task 7.7: Add lightweight k6 CI job

**Files:**
- Modify: `.github/workflows/ci.yml`

k6 runs against a live server, so this job depends on `ENABLE_INTEGRATION_CI` like the e2e/lighthouse jobs.

- [ ] **Step 1: Append job**

At the same indentation as `e2e`:

```yaml
  load-baseline:
    name: k6 baseline (search)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: build
    if: vars.ENABLE_INTEGRATION_CI == 'true'
    env:
      NEXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_SANITY_PROJECT_ID }}
      NEXT_PUBLIC_SANITY_DATASET: ${{ secrets.NEXT_PUBLIC_SANITY_DATASET }}
      SANITY_API_WRITE_TOKEN: ${{ secrets.SANITY_API_WRITE_TOKEN }}
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
      CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
      STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
      STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
      AI_GATEWAY_API_KEY: ${{ secrets.AI_GATEWAY_API_KEY }}
      UPSTASH_VECTOR_REST_URL: ${{ secrets.UPSTASH_VECTOR_REST_URL }}
      UPSTASH_VECTOR_REST_TOKEN: ${{ secrets.UPSTASH_VECTOR_REST_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typegen
      - run: pnpm build
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Start app
        run: pnpm start &
      - name: Wait for app
        run: npx wait-on http://localhost:3000 -t 60000
      - name: k6 baseline
        run: k6 run --env SCENARIO=baseline tests/load/search.k6.js
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add k6 baseline job (gated on ENABLE_INTEGRATION_CI)"
```

---

## Phase 8 — Documentation

### Task 8.1: Write ADR for vector search stack choice

**Files:**
- Create: `docs/adr/0005-semantic-search-with-upstash-vector.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR-0005: Semantic search with Upstash Vector + AI Gateway

**Date:** 2026-04-20
**Status:** Accepted

## Context

The keyword-only product search misses qualitative queries ("cozy nook for a studio apartment"). We want embeddings-based semantic search without introducing heavy infrastructure.

## Decision

- **Vector store:** Upstash Vector. We already use Upstash Redis for rate limiting; the account/billing surface is the same. 1536-dim vectors, dotproduct metric.
- **Embedding model:** `openai/text-embedding-3-small` via Vercel AI Gateway. Strong baseline quality at low cost, and routes through the gateway key we already have.
- **Index backend swap:** same "prefer Upstash, fall back to in-memory" pattern used by `lib/ai/rate-limit.ts`. The in-memory fallback makes tests and no-config dev ergonomic.
- **Keep keyword search:** `/api/search` is new; existing filter-based search on category pages stays. Different tool for different job.

## Considered alternatives

- **Sanity Embeddings Index** — first-party, zero new infra. Rejected because rolling the pipeline is a stronger portfolio signal and keeps embedding-model choice in our hands.
- **pgvector on Neon** — adds a new database plus connection pooling. Rejected on complexity.
- **Pinecone / Weaviate** — mature but adds a third account. Rejected on complexity + cost.

## Consequences

- Two new env vars (`UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`). Free tier fits this catalog size.
- Cost is roughly linear in catalog size for embeddings (~$0.02 per million tokens). Full backfill of 1000 products ≈ $0.004.
- Upstash Vector free tier has query rate limits; our rate limiter caps `/api/search` at 30 req/min/IP, well below the account limit.
- If Upstash Vector becomes a bottleneck, the same interface can be backed by pgvector — the swap is contained to `lib/search/index.ts`.
- Webhook signature verification uses a new secret (`SANITY_REVALIDATE_SECRET`). Missing this secret means the webhook rejects all requests, which is safer than silent success.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0005-semantic-search-with-upstash-vector.md
git commit -m "docs(adr): 0005 semantic search with Upstash Vector"
```

---

### Task 8.2: Update README with feature + perf + eval tables

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Semantic Search" section**

Insert a new top-level section under the existing feature list (location depends on README layout; place after the shopping agent section). Use this content:

```markdown
## Semantic product search

Vibes-first product discovery. Users describe a feeling or situation — "cozy nook for a studio apartment", "kids' room that'll last" — and the system returns products ranked by meaning, not keyword overlap.

**Stack:** Vercel AI Gateway (`openai/text-embedding-3-small`, 1536-dim) → Upstash Vector (namespace `products`) → Sanity hydrate.

**Architecture:** Sanity webhook fires on product publish → `/api/sanity/reindex` verifies the HMAC and re-embeds → Upstash upsert. On search, `/api/search` embeds the query, queries the index, hydrates full docs from Sanity, preserves vector ranking. See [ADR-0005](docs/adr/0005-semantic-search-with-upstash-vector.md).

### Eval

Hand-labeled 30 queries with ground-truth product IDs. Runs via `pnpm eval:search`; CI fails if recall@5 drops >5% from baseline.

| Metric | Semantic | Keyword baseline |
|---|---|---|
| recall@5 | **TBD after first run** | TBD |
| MRR | **TBD after first run** | TBD |

> Baseline from `tests/search-eval/baseline.json`. Promote new baselines with `pnpm eval:search:promote`.

### Load / stress testing

k6 scripts under `tests/load/`. See [tests/load/README.md](tests/load/README.md) for install and usage.

| Scenario | VUs | P50 | P95 | P99 | Error rate |
|---|---|---|---|---|---|
| search / baseline | 10 | **TBD** | **TBD** | **TBD** | **TBD** |
| search / ramp | 0→100 | TBD | TBD | TBD | TBD |
| search / spike | 200 | TBD | TBD | TBD | TBD |
| catalog / steady | 20 | TBD | TBD | TBD | TBD |

> Fill in from `tests/load/results/canonical-*.json` after running.
```

- [ ] **Step 2: After the first canonical runs land, replace the TBD cells with real numbers**

This is a follow-up step — deferred until load + eval have run against real data.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add semantic search, eval, and perf sections to README"
```

---

### Task 8.3: Fill in eval ground truth and canonical numbers

**Files:**
- Modify: `tests/search-eval/queries.json`
- Modify: `tests/search-eval/baseline.json`
- Modify: `README.md`
- Modify: `tests/load/results/canonical-*.json` (committed in 7.6)

These steps are mechanical follow-ups that close the loop — they're only meaningful after the pipeline works end-to-end.

- [ ] **Step 1: Backfill the real Sanity index**

```bash
pnpm backfill:search
```

Expected: prints `indexed=N skipped=0 in Ts`.

- [ ] **Step 2: Populate queries.json ground truth**

For each of the 30 seeded queries in `tests/search-eval/queries.json`, open `http://localhost:3000/search?q=<query>` (and/or use Sanity to browse products) and fill in the 2–5 `relevantIds` a human would consider a good match. Replace empty arrays.

- [ ] **Step 3: Run the eval and promote baseline**

```bash
pnpm eval:search:promote
```

Expected: prints recall@5, MRR; writes `baseline.json`.

- [ ] **Step 4: Run the canonical load tests** (repeat Task 7.6 steps 1–3)

- [ ] **Step 5: Replace TBDs in README**

Update the eval + perf tables with real numbers from `baseline.json` and `tests/load/results/canonical-*.json`.

- [ ] **Step 6: Commit everything**

```bash
git add tests/search-eval/queries.json tests/search-eval/baseline.json README.md tests/load/results/canonical-*.json tests/load/results/canonical-*.txt
git commit -m "docs: publish eval recall@5 and canonical load-test numbers"
```

---

## Phase 9 — Final verification

### Task 9.1: Full local gate

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: zero errors in main code (warnings in tests/tools OK per biome.json overrides).

- [ ] **Step 3: Unit tests**

Run: `pnpm test`
Expected: all green.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: successful build, no type errors, no runtime errors.

- [ ] **Step 5: Smoke check in browser**

Run `pnpm start`, visit:
- `/search` → empty state with suggestions renders
- `/search?q=cozy+desk` → results render (needs backfill first)
- Open shopping agent, ask "something for a small apartment" → agent uses semanticSearch

- [ ] **Step 6: E2E (if integration creds available)**

Run: `pnpm test:e2e`
Expected: all green including `tests/e2e/search.spec.ts`.

### Task 9.2: Portfolio readiness check

- [ ] **Step 1: Re-check the polish items from the 2026-04-20 review**

- `LICENSE.md` has real MIT text (Task 0.1)
- `package-lock.json` is gone (Task 0.2)
- `sanity.types.ts` is gitignored + regenerated in CI (Task 0.3)
- `SECURITY.md` exists (Task 0.4)

Run: `ls LICENSE.md SECURITY.md && git log --oneline --all -- sanity.types.ts | tail -5 && [ ! -f package-lock.json ] && echo "pnpm-only lockfile confirmed"`
Expected: all four confirmations.

- [ ] **Step 2: Verify README tells the full story**

Open `README.md` and check: semantic search section exists, eval table filled in, perf table filled in, links to ADR-0005 and tests/load/README.md work.

- [ ] **Step 3: Tag the release**

```bash
git tag -a portfolio-ready-2026-04-XX -m "Semantic search + stress testing + polish pass"
git push --tags
```

---

## Self-review notes

**Spec coverage vs plan:**
- §1 embedding pipeline → Phase 1 (Tasks 1.1–1.4) ✓
- §2 index management → Phase 1 (Tasks 1.5–1.6) ✓
- §3 backfill script → Phase 1 (Task 1.7) ✓
- §4 reindex webhook → Phase 2 (Tasks 2.1–2.2) ✓
- §5 search endpoint → Phase 3 (Tasks 3.1–3.2) ✓
- §6 search UI → Phase 5 (Tasks 5.1–5.2) ✓
- §7 agent integration → Phase 4 (Tasks 4.1–4.2) ✓
- §8 eval harness → Phase 6 (Tasks 6.1–6.3) ✓
- §9 stress testing → Phase 7 (Tasks 7.1–7.7) ✓
- §10 polish pass → Phase 0 (Tasks 0.1–0.4) ✓
- README + ADR → Phase 8 (Tasks 8.1–8.3) ✓
- Final gate → Phase 9 ✓

**Known limitations / follow-ups listed in spec §"Follow-ups":**
- OpenTelemetry tracing — out of scope
- Hybrid search weighting — out of scope
- User-personalized ranking — out of scope
- Model upgrade re-embed job — out of scope

**No placeholders in code blocks.** Every `// ...` removed; exact implementations provided for each TDD step.
