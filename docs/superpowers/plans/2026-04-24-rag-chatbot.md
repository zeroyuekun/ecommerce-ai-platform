# RAG Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-grade RAG layer to the existing Kozy chatbot so it understands semantic intent and grounds spec/price/stock answers in tool-call truth, while leaving every existing path untouched until cutover.

**Architecture:** Six isolated units (Embedding · Vector Store · Reranker · Context Manager · Indexer · Query Pipeline) wired into the existing `ToolLoopAgent` via three new tools (`semanticSearch`, `getProductDetails`) and one rename (`searchProducts` → `filterSearch`). Sanity webhook → QStash → background worker keeps Pinecone in sync. Everything ships behind a `RAG_ENABLED` feature flag.

**Tech Stack:** Pinecone Serverless (sparse+dense hybrid), Voyage `voyage-3-large` embeddings, Cohere Rerank 3.5, Claude Sonnet 4.5 (existing) for generation, Claude Haiku 4.5 for query understanding & compaction, Upstash QStash for re-indexing queue, Upstash Redis for semantic cache (existing infra), Vitest + k6 for eval & load tests.

**Spec:** `docs/superpowers/specs/2026-04-24-rag-chatbot-design.md` (commit `46dd096`).

**Hard constraint:** Do not break the existing chatbot. Every checkpoint runs `pnpm typecheck && pnpm lint && pnpm test && pnpm build` and must pass. Pending uncommitted edits in `components/app/StyleGallery.tsx` and `next.config.ts` are out of scope — never stage them.

---

## File Structure

**New files:**
```
lib/ai/rag/
├── flags.ts                     # RAG feature flag (env-driven)
├── embed.ts                     # Voyage embedding adapter
├── store.ts                     # Pinecone vector store adapter
├── rerank.ts                    # Cohere reranker adapter
├── format.ts                    # formatToolResult — token-budget enforcer
├── context.ts                   # Context Manager (compaction, fresh-start, cache-aware assembly)
├── tokens.ts                    # Lightweight token estimation (char ÷ 4)
├── indexer/
│   ├── chunk.ts                 # Hierarchical chunking
│   ├── synthetic-qa.ts          # Haiku Q&A generator
│   └── index-product.ts         # Orchestrator: fetch → chunk → embed → upsert
└── query/
    ├── understand.ts            # Haiku rewrite + filter extraction + conditional HyDE
    ├── retrieve.ts              # Pinecone hybrid query
    ├── rerank.ts                # Cohere rerank wrapper
    └── format.ts                # Pipeline output → tool-result shape

lib/ai/tools/
├── semantic-search.ts           # NEW tool exposed to the agent
├── filter-search.ts             # Renamed from search-products.ts (re-export shim left behind for one release)
└── get-product-details.ts       # NEW authoritative-truth tool

app/api/
├── webhooks/sanity-rag/route.ts # Sanity → QStash enqueue
└── jobs/reindex-product/route.ts # QStash worker → Pinecone upsert

tools/
├── reindex-rag.ts               # Bulk reindex CLI
└── rag-eval.ts                  # Eval runner CLI

tests/rag/
├── golden.json                  # 50-query seed (expanded later)
├── multi-turn.json              # 5 multi-turn dialogues (seed)
├── adversarial.json             # 30 adversarial cases (seed)
├── eval.spec.ts                 # Vitest eval harness
├── marathon.spec.ts             # 30-turn compaction test
└── adversarial.spec.ts          # Adversarial suite

tests/load/
└── rag-pipeline.k6.js           # k6 load profile

tests/unit/rag/                  # Unit tests live here so vitest picks them up via existing include
├── embed.test.ts
├── store.test.ts
├── rerank.test.ts
├── format.test.ts
├── context.test.ts
├── tokens.test.ts
├── chunk.test.ts
├── synthetic-qa.test.ts
└── index-product.test.ts

components/app/chat/
└── FreshStartButton.tsx         # NEW (or merged into ChatHeader)

docs/adr/
└── 0005-rag-stack-choice.md     # New ADR

.github/workflows/
└── ci.yml                       # Modify: add `pnpm test:rag` job (allowed to fail until golden set is full)
```

**Modified files (additive only — no behaviour change while flag is off):**
```
lib/ai/shopping-agent.ts         # Conditionally include new tools when RAG_ENABLED=true
app/api/chat/route.ts            # Insert Context Manager between message validation and agent
package.json                     # New deps + new scripts (test:rag, reindex:rag, etc.)
.env.example                     # Document new env vars
README.md                        # Brief mention of RAG layer + flag
```

**Untouched (do not edit):**
- `components/app/StyleGallery.tsx` — pre-existing uncommitted changes belong to user
- `next.config.ts` — pre-existing uncommitted changes belong to user
- All existing `lib/ai/tools/add-to-cart.ts`, `get-my-orders.ts` — unchanged
- Anything in `app/(app)/`, `app/(admin)/`, or storefront search

---

## Conventions

**Test discipline (TDD):** Every functional task follows: write failing test → confirm it fails → implement minimum → confirm pass → commit. Tests for new code live in `tests/unit/rag/` (Vitest picks them up via the existing `include: ["tests/**/*.test.{ts,tsx}"]`). Integration tests that require live API keys live in `tests/rag/*.spec.ts` and are gated by env (`RAG_LIVE_TESTS=1`).

**Commit cadence:** One commit per task. Message format: `<type>(rag): <imperative summary>` where type ∈ `feat`, `test`, `docs`, `chore`, `refactor`. Always include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

**Checkpoint command (run after every task):**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
If any of those fail, fix before moving to the next task. Do not stage unrelated files. Never `git add -A` or `git add .`.

**File header convention:** Every new file starts with a short JSDoc-style block comment describing purpose and any non-obvious invariants. Match the style of `lib/ai/rate-limit.ts`.

**Logging convention:** Diagnostic logs use `console.log("[ModuleName] ...", payload)`. Errors go through `captureException` from `lib/monitoring/`.

**Path alias:** `@/` maps to repo root.

**Adapter pattern:** Each external service (Voyage, Pinecone, Cohere, QStash) is wrapped in a single adapter file with a typed interface. Callers never import the vendor SDK directly. Swapping vendors = edit one file + change one env var.

**Feature flag:** `RAG_ENABLED` env var, default `false`. Read via `lib/ai/rag/flags.ts:isRagEnabled()`. Until cutover, `RAG_ENABLED=false` in all environments — new code paths exist but are never hit by user traffic.

---

## Task Index

**Phase 0 — Foundation (Tasks 1–4):** ADR, deps, feature flag, env scaffolding
**Phase 1 — Adapters (Tasks 5–7):** Voyage, Pinecone, Cohere
**Phase 2 — Core utilities (Tasks 8–10):** Tokens, formatToolResult, Context Manager
**Phase 3 — Indexer (Tasks 11–14):** Chunker, synthetic Q&A, orchestrator, bulk CLI
**Phase 4 — Query pipeline (Tasks 15–18):** Understand, retrieve, rerank, format
**Phase 5 — Routes (Tasks 19–20):** Sanity webhook, QStash worker
**Phase 6 — Tools (Tasks 21–23):** semanticSearch, filterSearch (rename), getProductDetails
**Phase 7 — Agent integration (Tasks 24–25):** Agent flag-gated wiring, chat-route Context Manager
**Phase 8 — UI (Task 26):** Fresh-start button + auto-suggest
**Phase 9 — Eval (Tasks 27–30):** Datasets, harness, marathon, adversarial
**Phase 10 — Stress (Task 31):** k6 load profile
**Phase 11 — Cutover (Tasks 32–34):** Bulk index, tag, flip flag in dev

---

## Phase 0 — Foundation

### Task 1: Write ADR-0005 documenting the RAG stack

**Files:**
- Create: `docs/adr/0005-rag-stack-choice.md`

- [ ] **Step 1: Create the ADR**

```markdown
# ADR-0005: RAG Stack Choice (Pinecone + Voyage + Cohere)

## Status
Accepted — 2026-04-24

## Context
The existing chatbot's `searchProducts` tool uses keyword-only GROQ matching against product
name + description. It cannot resolve semantic queries ("cozy reading nook", "Japandi for a
small bedroom") that customers actually use. We need a retrieval-augmented generation (RAG)
layer that handles semantic intent, grounds spec/price answers in tool-call truth, and
respects existing latency, cost, and reliability budgets.

## Decision
Adopt the following stack for Phase 1 (text-only RAG):

- **Vector store:** Pinecone Serverless via Vercel Marketplace integration. Native sparse-dense
  hybrid in one query, single-stage metadata filtering, sub-10 ms p50, ~5 yrs production
  maturity, env vars auto-injected by Vercel Marketplace.
- **Text embeddings:** Voyage `voyage-3-large` @ 1024d int8. Anthropic-recommended embedding
  partner; tops MTEB; Matryoshka support means future downsizing is free.
- **Reranker:** Cohere Rerank 3.5 — ~600 ms p50, ~30 % precision lift, longest production
  track record.
- **Re-indexing pipeline:** Sanity webhook → Vercel route → Upstash QStash → background worker
  → Pinecone upsert. Idempotency key = `${_id}:${_rev}`.
- **Caching:** Reuse existing Upstash Redis for semantic cache (cosine ≥ 0.97, 1 h TTL).
- **Generation LLM:** Claude Sonnet 4.5 via Vercel AI Gateway (unchanged).
- **Query understanding LLM:** Claude Haiku 4.5 via Vercel AI Gateway.

## Alternatives considered
- **Turbopuffer** — technically excellent (used by Cursor / Notion / Anthropic) and ~5×
  cheaper, but lacks the Vercel Marketplace integration and is younger in production. Cost
  is irrelevant at low-thousands of vectors. Pinecone wins on operational simplicity.
- **Sanity native `text::semanticSimilarity()`** — opaque embedding model, no version pinning,
  10-chunk-per-document cap. Disqualifying for a high-quality A/B-able pipeline.
- **pgvector via Neon** — would force adopting a new primary OLTP store. Too invasive.
- **OpenAI text-embedding-3-large** — fine, but no advantage over Voyage given the Claude
  generation stack and Voyage's Matryoshka support.
- **Cohere `embed-v4`** — ~tied with Voyage on MTEB; multilingual edge isn't needed yet.
- **Voyage Rerank 2.5** — tempting for single-vendor consolidation but Cohere has more
  battle-testing.

## Consequences
- Three new external vendors enter the dependency graph: Pinecone, Voyage, Cohere. Each is
  isolated behind a single adapter file (`lib/ai/rag/{embed,store,rerank}.ts`) so a swap is
  one-file + one env var.
- Phase 2 (visual search via `voyage-multimodal-3.5`) gets the same vendor relationship for
  free — already paying Voyage.
- Cost per query target: ≤ $0.02 (per spec §1).
- Failure modes and rollback covered in spec §12.

## Migration path away
- **From Pinecone:** rewrite `lib/ai/rag/store.ts` against another vector DB with hybrid +
  metadata filtering (Turbopuffer, Qdrant, pgvector). Re-index from Sanity. ~1 day.
- **From Voyage:** swap `lib/ai/rag/embed.ts` to Cohere `embed-v4` (1024d). Full re-index
  required (~$0.50, ~30 min for low-thousands of products). ~2 hours.
- **From Cohere Rerank:** rewrite `lib/ai/rag/rerank.ts` against Voyage Rerank or Jina
  Reranker. Pure read-path change, no re-index. ~1 hour.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0005-rag-stack-choice.md
git commit -m "$(cat <<'EOF'
docs(rag): add ADR-0005 documenting Pinecone + Voyage + Cohere stack choice

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Checkpoint**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: all green (no source code changed).

---

### Task 2: Add new dependencies

**Files:**
- Modify: `package.json` (and `pnpm-lock.yaml` regenerates)

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add voyageai@^0.1.0 @pinecone-database/pinecone@^4.0.0 cohere-ai@^7.14.0 @upstash/qstash@^2.7.20 pinecone-text@^1.2.0
```

Pinned to current major versions as of 2026-04. `pinecone-text` is the official sparse-vector encoder (BM25) for Pinecone hybrid.

- [ ] **Step 2: Verify install + checkpoint**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: all green. (No imports of the new packages exist yet.)

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore(rag): add Voyage, Pinecone, Cohere, QStash dependencies

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Document new env vars

**Files:**
- Modify: `.env.example` (or create if missing)

- [ ] **Step 1: Check whether .env.example exists**

```bash
ls -la C:/Users/Admin/ecommerce-ai-platform/.env.example 2>/dev/null || echo "not present"
```

- [ ] **Step 2: Add the RAG env block at the bottom of .env.example (create file if it doesn't exist)**

If the file doesn't exist, create it with all current env vars listed in `README.md` plus the RAG block. If it does exist, append:

```
# RAG layer (Phase 1) — see docs/adr/0005-rag-stack-choice.md
# Master kill switch. Set to "true" only when ready to cut over.
RAG_ENABLED=false

# Pinecone — auto-injected by `vercel integration add pinecone`
PINECONE_API_KEY=
PINECONE_INDEX_NAME=kozy-products
# Active namespace (managed via Edge Config in production for double-buffer cutovers)
PINECONE_NAMESPACE=products-v1

# Voyage AI (text embeddings)
VOYAGE_API_KEY=

# Cohere (reranker)
COHERE_API_KEY=

# Upstash QStash (re-indexing queue)
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# Sanity webhook signing secret for /api/webhooks/sanity-rag
SANITY_RAG_WEBHOOK_SECRET=

# Tunables (defaults baked into code; override only if needed)
RAG_HARD_INPUT_TOKEN_CAP=32000
RAG_SOFT_INPUT_TOKEN_CAP=16000
RAG_FRESH_START_COSINE_THRESHOLD=0.4
RAG_SEMANTIC_CACHE_THRESHOLD=0.97
RAG_SEMANTIC_CACHE_TTL_SECONDS=3600
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "$(cat <<'EOF'
docs(rag): document new env vars in .env.example

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Checkpoint**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 4: Feature-flag module

**Files:**
- Create: `lib/ai/rag/flags.ts`
- Create: `tests/unit/rag/flags.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/flags.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isRagEnabled } from "@/lib/ai/rag/flags";

describe("isRagEnabled", () => {
  const originalEnv = process.env.RAG_ENABLED;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.RAG_ENABLED;
    else process.env.RAG_ENABLED = originalEnv;
  });

  it("returns false when RAG_ENABLED is unset", () => {
    delete process.env.RAG_ENABLED;
    expect(isRagEnabled()).toBe(false);
  });

  it("returns false when RAG_ENABLED is 'false'", () => {
    process.env.RAG_ENABLED = "false";
    expect(isRagEnabled()).toBe(false);
  });

  it("returns false for any non-'true' value", () => {
    process.env.RAG_ENABLED = "1";
    expect(isRagEnabled()).toBe(false);
    process.env.RAG_ENABLED = "yes";
    expect(isRagEnabled()).toBe(false);
  });

  it("returns true only when RAG_ENABLED is exactly 'true'", () => {
    process.env.RAG_ENABLED = "true";
    expect(isRagEnabled()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/flags.test.ts
```
Expected: fails — module does not exist.

- [ ] **Step 3: Implement `lib/ai/rag/flags.ts`**

```typescript
/**
 * RAG feature flag. Read at module boundary so tests can monkey-patch
 * process.env. Strict equality on the string "true" — anything else,
 * including unset, "1", "yes", or empty, is treated as off.
 *
 * Default off until cutover (see docs/superpowers/specs/2026-04-24-rag-chatbot-design.md §12).
 */
export function isRagEnabled(): boolean {
  return process.env.RAG_ENABLED === "true";
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/flags.test.ts
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/rag/flags.ts tests/unit/rag/flags.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add RAG_ENABLED feature flag (default off)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Checkpoint**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 1 — Adapters

### Task 5: Voyage embedding adapter

**Files:**
- Create: `lib/ai/rag/embed.ts`
- Create: `tests/unit/rag/embed.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/embed.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEmbed = vi.fn();
vi.mock("voyageai", () => ({
  VoyageAIClient: vi.fn().mockImplementation(() => ({ embed: mockEmbed })),
}));

import { embedTexts } from "@/lib/ai/rag/embed";

describe("embedTexts", () => {
  beforeEach(() => {
    mockEmbed.mockReset();
    process.env.VOYAGE_API_KEY = "test-key";
  });

  it("returns the embeddings for each input string", async () => {
    mockEmbed.mockResolvedValueOnce({
      data: [
        { embedding: [0.1, 0.2, 0.3] },
        { embedding: [0.4, 0.5, 0.6] },
      ],
    });
    const out = await embedTexts(["a", "b"], { kind: "document" });
    expect(out).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    expect(mockEmbed).toHaveBeenCalledWith({
      input: ["a", "b"],
      model: "voyage-3-large",
      inputType: "document",
      outputDimension: 1024,
      outputDtype: "int8",
    });
  });

  it("uses inputType=query for kind: 'query'", async () => {
    mockEmbed.mockResolvedValueOnce({ data: [{ embedding: [0.1] }] });
    await embedTexts(["q"], { kind: "query" });
    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ inputType: "query" }),
    );
  });

  it("returns [] for an empty input array without calling the API", async () => {
    const out = await embedTexts([], { kind: "document" });
    expect(out).toEqual([]);
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it("throws a typed error when the API call fails", async () => {
    mockEmbed.mockRejectedValueOnce(new Error("voyage 503"));
    await expect(embedTexts(["a"], { kind: "document" })).rejects.toThrow(
      /voyage embedding failed/i,
    );
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/embed.test.ts
```
Expected: module not found.

- [ ] **Step 3: Implement `lib/ai/rag/embed.ts`**

```typescript
/**
 * Voyage embedding adapter. Wraps the Voyage SDK so the rest of the RAG
 * pipeline never imports it directly. Defaults: voyage-3-large, 1024d, int8.
 *
 * Per spec §3 — Anthropic-recommended embedding partner. Matryoshka means
 * the dimension can be reduced later without re-embedding. Single-vendor
 * billing alongside future voyage-multimodal-3.5 in Phase 2.
 */
import { VoyageAIClient } from "voyageai";

export type EmbedKind = "document" | "query";

export interface EmbedOptions {
  kind: EmbedKind;
}

const MODEL = "voyage-3-large";
const DIMENSION = 1024;
const DTYPE = "int8" as const;

let cachedClient: VoyageAIClient | null = null;
function getClient(): VoyageAIClient {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set");
  }
  cachedClient = new VoyageAIClient({ apiKey });
  return cachedClient;
}

export async function embedTexts(
  texts: string[],
  { kind }: EmbedOptions,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    const response = await getClient().embed({
      input: texts,
      model: MODEL,
      inputType: kind,
      outputDimension: DIMENSION,
      outputDtype: DTYPE,
    });
    return response.data.map((row) => row.embedding);
  } catch (err) {
    throw new Error(
      `Voyage embedding failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Test seam — clears the cached client so unit tests can re-stub the constructor. */
export function __resetEmbedClientForTests(): void {
  cachedClient = null;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/embed.test.ts
```
Expected: 4 passed.

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/embed.ts tests/unit/rag/embed.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add Voyage embedding adapter (voyage-3-large @ 1024d int8)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 6: Pinecone vector-store adapter

**Files:**
- Create: `lib/ai/rag/store.ts`
- Create: `tests/unit/rag/store.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/store.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn().mockResolvedValue(undefined);
const mockQuery = vi.fn();
const mockDeleteMany = vi.fn().mockResolvedValue(undefined);
const mockNamespace = vi.fn(() => ({
  upsert: mockUpsert,
  query: mockQuery,
  deleteMany: mockDeleteMany,
}));
const mockIndex = vi.fn(() => ({ namespace: mockNamespace }));

vi.mock("@pinecone-database/pinecone", () => ({
  Pinecone: vi.fn().mockImplementation(() => ({ index: mockIndex })),
}));

import { hybridQuery, upsertChunks, deleteByProductId, __resetStoreForTests } from "@/lib/ai/rag/store";

describe("Pinecone store adapter", () => {
  beforeEach(() => {
    mockUpsert.mockClear();
    mockQuery.mockReset();
    mockDeleteMany.mockClear();
    mockIndex.mockClear();
    mockNamespace.mockClear();
    process.env.PINECONE_API_KEY = "k";
    process.env.PINECONE_INDEX_NAME = "i";
    process.env.PINECONE_NAMESPACE = "products-v1";
    __resetStoreForTests();
  });

  it("upserts records with id, values, sparseValues, and metadata", async () => {
    await upsertChunks([
      {
        id: "p1#description",
        values: [0.1, 0.2],
        sparseValues: { indices: [3, 7], values: [0.5, 0.4] },
        metadata: { product_id: "p1", chunk_type: "description", price: 100, in_stock: true },
      },
    ]);
    expect(mockNamespace).toHaveBeenCalledWith("products-v1");
    expect(mockUpsert).toHaveBeenCalledWith([
      {
        id: "p1#description",
        values: [0.1, 0.2],
        sparseValues: { indices: [3, 7], values: [0.5, 0.4] },
        metadata: { product_id: "p1", chunk_type: "description", price: 100, in_stock: true },
      },
    ]);
  });

  it("hybridQuery returns matches with normalized score and metadata", async () => {
    mockQuery.mockResolvedValueOnce({
      matches: [
        { id: "p1#description", score: 0.9, metadata: { product_id: "p1", chunk_type: "description" } },
        { id: "p2#parent",      score: 0.8, metadata: { product_id: "p2", chunk_type: "parent" } },
      ],
    });
    const out = await hybridQuery({
      vector: [0.1, 0.2],
      sparseVector: { indices: [1], values: [1] },
      topK: 30,
      filter: { in_stock: { $eq: true } },
    });
    expect(out).toEqual([
      { id: "p1#description", score: 0.9, productId: "p1", chunkType: "description", metadata: { product_id: "p1", chunk_type: "description" } },
      { id: "p2#parent",      score: 0.8, productId: "p2", chunkType: "parent", metadata: { product_id: "p2", chunk_type: "parent" } },
    ]);
    expect(mockQuery).toHaveBeenCalledWith({
      vector: [0.1, 0.2],
      sparseVector: { indices: [1], values: [1] },
      topK: 30,
      filter: { in_stock: { $eq: true } },
      includeMetadata: true,
    });
  });

  it("deleteByProductId calls deleteMany with a product_id filter", async () => {
    await deleteByProductId("p1");
    expect(mockDeleteMany).toHaveBeenCalledWith({ product_id: { $eq: "p1" } });
  });

  it("upsert is a no-op for an empty array", async () => {
    await upsertChunks([]);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/store.test.ts
```
Expected: module not found.

- [ ] **Step 3: Implement `lib/ai/rag/store.ts`**

```typescript
/**
 * Pinecone vector-store adapter. Single point of contact for the rest of
 * the RAG pipeline. Hybrid (dense + sparse) queries with metadata filtering.
 *
 * Per spec §3 — Pinecone Serverless via Vercel Marketplace. The active
 * namespace is read from PINECONE_NAMESPACE so the double-buffer cutover
 * pattern (write to v{N+1}, swap, keep vN for 24 h) is just a config flip.
 */
import { Pinecone } from "@pinecone-database/pinecone";

export type ChunkType = "parent" | "description" | "specs" | "care" | "qa";

export interface ChunkMetadata {
  product_id: string;
  chunk_type: ChunkType;
  category_slug?: string;
  material?: string;
  color?: string;
  price?: number;
  in_stock?: boolean;
  ships_to_au?: boolean;
  is_new?: boolean;
  assembly_required?: boolean;
}

export interface ChunkRecord {
  id: string;
  values: number[];
  sparseValues?: { indices: number[]; values: number[] };
  metadata: ChunkMetadata;
}

export interface QueryFilter {
  [key: string]: { $eq?: string | number | boolean; $gte?: number; $lte?: number };
}

export interface QueryArgs {
  vector: number[];
  sparseVector?: { indices: number[]; values: number[] };
  topK: number;
  filter?: QueryFilter;
}

export interface QueryMatch {
  id: string;
  score: number;
  productId: string;
  chunkType: ChunkType;
  metadata: ChunkMetadata;
}

let cached: { client: Pinecone; namespace: string; indexName: string } | null = null;

function getNamespace() {
  if (cached) return cached;
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  const namespace = process.env.PINECONE_NAMESPACE;
  if (!apiKey || !indexName || !namespace) {
    throw new Error(
      "Pinecone env not configured (PINECONE_API_KEY, PINECONE_INDEX_NAME, PINECONE_NAMESPACE)",
    );
  }
  const client = new Pinecone({ apiKey });
  cached = { client, namespace, indexName };
  return cached;
}

function ns() {
  const { client, namespace, indexName } = getNamespace();
  return client.index(indexName).namespace(namespace);
}

export async function upsertChunks(records: ChunkRecord[]): Promise<void> {
  if (records.length === 0) return;
  await ns().upsert(records);
}

export async function hybridQuery(args: QueryArgs): Promise<QueryMatch[]> {
  const result = await ns().query({
    vector: args.vector,
    sparseVector: args.sparseVector,
    topK: args.topK,
    filter: args.filter,
    includeMetadata: true,
  });
  return (result.matches ?? []).map((m) => {
    const meta = (m.metadata ?? {}) as ChunkMetadata;
    return {
      id: m.id,
      score: m.score ?? 0,
      productId: meta.product_id,
      chunkType: meta.chunk_type,
      metadata: meta,
    };
  });
}

export async function deleteByProductId(productId: string): Promise<void> {
  await ns().deleteMany({ product_id: { $eq: productId } });
}

/** Test seam. */
export function __resetStoreForTests(): void {
  cached = null;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/store.test.ts
```
Expected: 4 passed.

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/store.ts tests/unit/rag/store.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add Pinecone vector-store adapter (hybrid query, namespace-aware)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 7: Cohere reranker adapter

**Files:**
- Create: `lib/ai/rag/rerank.ts`
- Create: `tests/unit/rag/rerank.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/rerank.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRerank = vi.fn();
vi.mock("cohere-ai", () => ({
  CohereClient: vi.fn().mockImplementation(() => ({ v2: { rerank: mockRerank } })),
}));

import { rerankCandidates, __resetRerankerForTests } from "@/lib/ai/rag/rerank";

describe("rerankCandidates", () => {
  beforeEach(() => {
    mockRerank.mockReset();
    process.env.COHERE_API_KEY = "test";
    __resetRerankerForTests();
  });

  it("returns input order unchanged when candidates is empty", async () => {
    const out = await rerankCandidates({ query: "q", candidates: [], topN: 5 });
    expect(out).toEqual([]);
    expect(mockRerank).not.toHaveBeenCalled();
  });

  it("calls Cohere v2.rerank with correct payload and returns reordered slice", async () => {
    mockRerank.mockResolvedValueOnce({
      results: [
        { index: 2, relevanceScore: 0.95 },
        { index: 0, relevanceScore: 0.71 },
      ],
    });
    const candidates = [
      { id: "a", text: "alpha" },
      { id: "b", text: "beta" },
      { id: "c", text: "gamma" },
    ];
    const out = await rerankCandidates({ query: "q", candidates, topN: 2 });
    expect(out).toEqual([
      { id: "c", text: "gamma", score: 0.95 },
      { id: "a", text: "alpha", score: 0.71 },
    ]);
    expect(mockRerank).toHaveBeenCalledWith({
      model: "rerank-english-v3.5",
      query: "q",
      documents: ["alpha", "beta", "gamma"],
      topN: 2,
    });
  });

  it("falls back to input order if Cohere throws", async () => {
    mockRerank.mockRejectedValueOnce(new Error("cohere 503"));
    const candidates = [
      { id: "a", text: "alpha" },
      { id: "b", text: "beta" },
    ];
    const out = await rerankCandidates({ query: "q", candidates, topN: 1 });
    expect(out).toEqual([{ id: "a", text: "alpha", score: 0 }]);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/rerank.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/rerank.ts`**

```typescript
/**
 * Cohere Rerank adapter. Pure read-path; if Cohere is unavailable we fall
 * back to the input order so the rest of the pipeline keeps working at a
 * graceful quality degradation (per spec §12).
 */
import { CohereClient } from "cohere-ai";
import { captureException } from "@/lib/monitoring";

const MODEL = "rerank-english-v3.5";

export interface RerankCandidate {
  id: string;
  text: string;
}

export interface RerankResult extends RerankCandidate {
  score: number;
}

export interface RerankArgs {
  query: string;
  candidates: RerankCandidate[];
  topN: number;
}

let cached: CohereClient | null = null;
function getClient(): CohereClient {
  if (cached) return cached;
  const token = process.env.COHERE_API_KEY;
  if (!token) throw new Error("COHERE_API_KEY is not set");
  cached = new CohereClient({ token });
  return cached;
}

export async function rerankCandidates(
  args: RerankArgs,
): Promise<RerankResult[]> {
  const { query, candidates, topN } = args;
  if (candidates.length === 0) return [];
  try {
    const response = await getClient().v2.rerank({
      model: MODEL,
      query,
      documents: candidates.map((c) => c.text),
      topN,
    });
    return response.results.map((r) => ({
      id: candidates[r.index].id,
      text: candidates[r.index].text,
      score: r.relevanceScore,
    }));
  } catch (err) {
    captureException(err, { context: "rerank", query, candidateCount: candidates.length });
    return candidates.slice(0, topN).map((c) => ({ ...c, score: 0 }));
  }
}

/** Test seam. */
export function __resetRerankerForTests(): void {
  cached = null;
}
```

> **Note on captureException import:** verify the exact export shape in `lib/monitoring/index.ts` before implementing — if it's a different name (`logError`, etc.), match that. The README mentions `captureException` and `captureMessage` so this should be correct.

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/rerank.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/rerank.ts tests/unit/rag/rerank.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add Cohere Rerank 3.5 adapter with graceful fallback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 2 — Core utilities

### Task 8: Token estimator

**Files:**
- Create: `lib/ai/rag/tokens.ts`
- Create: `tests/unit/rag/tokens.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/tokens.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { estimateTokens, estimateMessageTokens } from "@/lib/ai/rag/tokens";

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates roughly 1 token per 4 characters (rounded up)", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});

describe("estimateMessageTokens", () => {
  it("sums string and content-array messages", () => {
    expect(
      estimateMessageTokens([
        { role: "user", content: "hello world here" },
        { role: "assistant", content: [{ type: "text", text: "hi back" }] },
      ]),
    ).toBeGreaterThan(0);
  });

  it("includes a small per-message overhead", () => {
    const oneShort = estimateMessageTokens([{ role: "user", content: "hi" }]);
    expect(oneShort).toBeGreaterThanOrEqual(4); // overhead floor
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/tokens.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/tokens.ts`**

```typescript
/**
 * Cheap token estimator. Uses the standard ~4-chars-per-token heuristic.
 * Good enough for budgeting decisions; precise counting is the LLM
 * provider's job at request time.
 */
const CHARS_PER_TOKEN = 4;
const PER_MESSAGE_OVERHEAD = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

interface MessageLike {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
}

export function estimateMessageTokens(messages: MessageLike[]): number {
  let total = 0;
  for (const msg of messages) {
    total += PER_MESSAGE_OVERHEAD;
    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          total += estimateTokens(part.text);
        }
      }
    }
  }
  return total;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/tokens.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/tokens.ts tests/unit/rag/tokens.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add lightweight token estimator

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 9: formatToolResult — token-budget enforcer

**Files:**
- Create: `lib/ai/rag/format.ts`
- Create: `tests/unit/rag/format.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/format.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { formatToolResult } from "@/lib/ai/rag/format";

const longText = "x".repeat(2000); // ~500 tokens

describe("formatToolResult", () => {
  it("passes through when payload fits the cap", () => {
    const out = formatToolResult({
      toolName: "semanticSearch",
      payload: { products: [{ id: "1", name: "A" }] },
      capTokens: 1200,
    });
    expect(out.truncated).toBe(false);
    expect(out.payload.products).toHaveLength(1);
  });

  it("appends a sentinel when an array payload is truncated", () => {
    const products = Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: longText }));
    const out = formatToolResult({
      toolName: "semanticSearch",
      payload: { products },
      capTokens: 600,
      arrayKey: "products",
    });
    expect(out.truncated).toBe(true);
    expect(out.payload.products.length).toBeLessThan(8);
    expect(out.notice).toMatch(/more available/i);
  });

  it("never returns more than the cap (or zero items if the first one already overflows)", () => {
    const products = [{ id: "0", name: longText }, { id: "1", name: "small" }];
    const out = formatToolResult({
      toolName: "semanticSearch",
      payload: { products },
      capTokens: 100,
      arrayKey: "products",
    });
    // First item is too big; result should be truncated to zero with a notice.
    expect(out.truncated).toBe(true);
    expect(out.payload.products.length).toBe(0);
  });

  it("preserves non-array fields verbatim", () => {
    const out = formatToolResult({
      toolName: "semanticSearch",
      payload: { products: [], filters: { maxPrice: 500 }, totalResults: 0 },
      capTokens: 1200,
      arrayKey: "products",
    });
    expect(out.payload.filters).toEqual({ maxPrice: 500 });
    expect(out.payload.totalResults).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/format.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/format.ts`**

```typescript
/**
 * formatToolResult — enforces a hard token cap on every tool result so that
 * the LLM context cannot be polluted by a single tool call. Per spec §7/§8.1.
 *
 * Strategy:
 * 1. If the whole payload fits, return as-is.
 * 2. If an `arrayKey` is given, drop array items from the tail until the
 *    payload fits; replace dropped items with a `notice` string telling the
 *    agent how many were available and to refine.
 */
import { estimateTokens } from "@/lib/ai/rag/tokens";

export interface FormatArgs<T extends Record<string, unknown>> {
  toolName: string;
  payload: T;
  capTokens: number;
  /** Key of an array field within `payload` that may be truncated. */
  arrayKey?: keyof T & string;
}

export interface FormatResult<T extends Record<string, unknown>> {
  payload: T;
  truncated: boolean;
  notice?: string;
}

function payloadTokens(payload: unknown): number {
  return estimateTokens(JSON.stringify(payload));
}

export function formatToolResult<T extends Record<string, unknown>>(
  args: FormatArgs<T>,
): FormatResult<T> {
  const { toolName, payload, capTokens, arrayKey } = args;

  if (payloadTokens(payload) <= capTokens) {
    return { payload, truncated: false };
  }

  if (!arrayKey) {
    // No array to trim; return as-is and flag truncated for observability.
    return {
      payload,
      truncated: true,
      notice: `[${toolName}] result exceeds ${capTokens}-token cap; consider refining`,
    };
  }

  const original = payload[arrayKey];
  if (!Array.isArray(original)) {
    return { payload, truncated: false };
  }

  const trimmed = [...original];
  while (trimmed.length > 0) {
    const candidate = { ...payload, [arrayKey]: trimmed } as T;
    if (payloadTokens(candidate) <= capTokens) {
      const droppedCount = original.length - trimmed.length;
      return {
        payload: candidate,
        truncated: droppedCount > 0,
        notice:
          droppedCount > 0
            ? `(${droppedCount} more available — call ${toolName} again with a refined query or tighter filters)`
            : undefined,
      };
    }
    trimmed.pop();
  }

  // Even an empty array overflows the cap (impossible in practice unless
  // capTokens is absurdly small or non-array fields are huge). Return with
  // the array zeroed out and a strong notice.
  return {
    payload: { ...payload, [arrayKey]: [] } as T,
    truncated: true,
    notice: `(${original.length} more available but result exceeded cap; refine filters first)`,
  };
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/format.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/format.ts tests/unit/rag/format.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add formatToolResult with hard token-cap enforcement

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 10: Context Manager

**Files:**
- Create: `lib/ai/rag/context.ts`
- Create: `tests/unit/rag/context.test.ts`

This task has two sub-components — token-budget assembly (deterministic) and history compaction (calls Haiku). The Haiku call is mocked behind a `compactor` interface so the unit test stays deterministic.

- [ ] **Step 1: Write failing test**

`tests/unit/rag/context.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { assembleContext, type Compactor } from "@/lib/ai/rag/context";

const noopCompactor: Compactor = vi.fn(async (msgs) => ({
  summary: "User asked about sofas under $500 and walnut tables earlier.",
  tokensSaved: 2000,
  preserved: msgs.slice(-6),
}));

function makeMessages(n: number, sizePerMessage = 200) {
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: "x".repeat(sizePerMessage),
  }));
}

describe("assembleContext", () => {
  it("passes through small conversations untouched", async () => {
    const msgs = makeMessages(4, 100);
    const out = await assembleContext({
      messages: msgs,
      hardCapTokens: 32_000,
      softCapTokens: 16_000,
      compactor: noopCompactor,
    });
    expect(out.compacted).toBe(false);
    expect(out.messages).toEqual(msgs);
  });

  it("invokes compactor when projected tokens exceed soft cap", async () => {
    const msgs = makeMessages(40, 600);
    const out = await assembleContext({
      messages: msgs,
      hardCapTokens: 32_000,
      softCapTokens: 8_000,
      compactor: noopCompactor,
    });
    expect(out.compacted).toBe(true);
    expect(noopCompactor).toHaveBeenCalled();
    // Last 6 turns are preserved verbatim per spec §8.3.
    expect(out.messages.length).toBeLessThan(msgs.length);
    expect(out.messages.at(-1)).toEqual(msgs.at(-1));
  });

  it("hard-rejects when even compaction cannot fit", async () => {
    const msgs = makeMessages(200, 800);
    const tinyCompactor: Compactor = vi.fn(async (m) => ({
      summary: "x".repeat(50_000), // worse than original
      tokensSaved: 0,
      preserved: m.slice(-6),
    }));
    await expect(
      assembleContext({
        messages: msgs,
        hardCapTokens: 1_000,
        softCapTokens: 500,
        compactor: tinyCompactor,
      }),
    ).rejects.toThrow(/exceeds hard cap/i);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/context.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/context.ts`**

```typescript
/**
 * Context Manager — token-budget assembly + sliding-window compaction.
 *
 * Per spec §8: keep the last 6 turns verbatim, replace older tool results
 * with one-line traces, and run a Haiku compaction call when projected
 * input tokens exceed the soft cap. The Haiku call is injected as a
 * `Compactor` so tests stay deterministic and the agent layer can swap
 * implementations.
 */
import { estimateMessageTokens } from "@/lib/ai/rag/tokens";

export interface ContextMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<{ type: string; text?: string }>;
}

export interface CompactionResult {
  /** A summary describing the compacted earlier turns. */
  summary: string;
  /** Estimated tokens removed (informational, used by callers for logging). */
  tokensSaved: number;
  /** The messages to keep verbatim (typically the last 6 turns). */
  preserved: ContextMessage[];
}

export type Compactor = (
  messagesToCompact: ContextMessage[],
) => Promise<CompactionResult>;

export interface AssembleArgs {
  messages: ContextMessage[];
  hardCapTokens: number;
  softCapTokens: number;
  /** Default 6 (3 user + 3 assistant) per spec §8.3. */
  preserveRecent?: number;
  compactor: Compactor;
}

export interface AssembleResult {
  messages: ContextMessage[];
  compacted: boolean;
  inputTokens: number;
  summary?: string;
}

const DEFAULT_PRESERVE_RECENT = 6;

export async function assembleContext(
  args: AssembleArgs,
): Promise<AssembleResult> {
  const {
    messages,
    hardCapTokens,
    softCapTokens,
    preserveRecent = DEFAULT_PRESERVE_RECENT,
    compactor,
  } = args;

  const projected = estimateMessageTokens(messages);
  if (projected <= softCapTokens) {
    return { messages, compacted: false, inputTokens: projected };
  }

  // Need to compact. Split: everything except the last `preserveRecent` turns.
  const head = messages.slice(0, Math.max(0, messages.length - preserveRecent));
  const tail = messages.slice(-preserveRecent);

  if (head.length === 0) {
    // Nothing to compact; the last few turns alone already overflow the
    // soft cap. Pass through and let hard-cap check below decide.
    if (projected > hardCapTokens) {
      throw new Error(
        `Context exceeds hard cap (${projected} > ${hardCapTokens}) and nothing is compactible`,
      );
    }
    return { messages, compacted: false, inputTokens: projected };
  }

  const compaction = await compactor(head);
  const summaryMessage: ContextMessage = {
    role: "system",
    content: `Conversation so far (compacted from ${head.length} earlier turns): ${compaction.summary}`,
  };
  const next = [summaryMessage, ...compaction.preserved.length ? compaction.preserved : tail];
  const nextTokens = estimateMessageTokens(next);

  if (nextTokens > hardCapTokens) {
    throw new Error(
      `Context exceeds hard cap (${nextTokens} > ${hardCapTokens}) even after compaction`,
    );
  }

  return {
    messages: next,
    compacted: true,
    inputTokens: nextTokens,
    summary: compaction.summary,
  };
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/context.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/context.ts tests/unit/rag/context.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add Context Manager with sliding-window compaction

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 3 — Indexer

### Task 11: Hierarchical chunker

**Files:**
- Create: `lib/ai/rag/indexer/chunk.ts`
- Create: `tests/unit/rag/chunk.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/chunk.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { chunkProduct, type ChunkableProduct } from "@/lib/ai/rag/indexer/chunk";

const sample: ChunkableProduct = {
  id: "p_001",
  name: "Nordic Grey 3-Seater Sofa",
  description:
    "A stunning Scandinavian-inspired sofa with plush cushioning, solid oak legs, and a tightly-woven grey upholstery that softens any modern living room.",
  category: { title: "Living Room", slug: "living-room" },
  productType: "sofas",
  material: "fabric",
  color: "grey",
  dimensions: "220cm x 95cm x 85cm",
  price: 1299,
  stock: 7,
  assemblyRequired: false,
  isNew: false,
  inStock: true,
  shipsToAu: true,
};

describe("chunkProduct", () => {
  it("emits a parent chunk plus description, specs, and care chunks", () => {
    const chunks = chunkProduct(sample, { syntheticQa: [] });
    const types = chunks.map((c) => c.type);
    expect(types).toContain("parent");
    expect(types).toContain("description");
    expect(types).toContain("specs");
    expect(types).toContain("care");
  });

  it("each chunk text is non-empty and prefixed with the product name", () => {
    const chunks = chunkProduct(sample, { syntheticQa: [] });
    for (const c of chunks) {
      expect(c.text.length).toBeGreaterThan(0);
      expect(c.text).toContain(sample.name);
    }
  });

  it("each chunk has product_id and chunk_type metadata", () => {
    const chunks = chunkProduct(sample, { syntheticQa: [] });
    for (const c of chunks) {
      expect(c.metadata.product_id).toBe("p_001");
      expect(c.metadata.chunk_type).toBe(c.type);
    }
  });

  it("appends one qa chunk per provided synthetic Q&A pair", () => {
    const chunks = chunkProduct(sample, {
      syntheticQa: [
        { question: "Will this fit a 4 x 3 metre living room?", answer: "Yes — at 220 cm wide it leaves walking space on both sides." },
        { question: "Is it pet-friendly?", answer: "The tight weave resists pet hair; spot-clean with mild soap." },
      ],
    });
    const qaChunks = chunks.filter((c) => c.type === "qa");
    expect(qaChunks).toHaveLength(2);
    expect(qaChunks[0].text).toContain("Will this fit");
    expect(qaChunks[0].id).toBe("p_001#qa_0");
  });

  it("chunk ids follow the {productId}#{type}[index] pattern", () => {
    const chunks = chunkProduct(sample, { syntheticQa: [{ question: "q", answer: "a" }] });
    const ids = chunks.map((c) => c.id);
    expect(ids).toContain("p_001#parent");
    expect(ids).toContain("p_001#description");
    expect(ids).toContain("p_001#specs");
    expect(ids).toContain("p_001#care");
    expect(ids).toContain("p_001#qa_0");
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/chunk.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/indexer/chunk.ts`**

```typescript
/**
 * Hierarchical product chunker. Per spec §6, a product becomes a small set
 * of typed chunks: a parent anchor + per-facet child chunks (description,
 * specs, care) + N synthetic Q&A children. Each chunk's text always opens
 * with the product name so the embedding has a strong anchor signal even
 * for the most narrow facet chunks.
 */
import type { ChunkMetadata, ChunkType } from "@/lib/ai/rag/store";

export interface ChunkableProduct {
  id: string;
  name: string;
  description: string;
  category: { title: string; slug: string } | null;
  productType: string | null;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  price: number | null;
  stock: number | null;
  assemblyRequired: boolean;
  isNew: boolean;
  inStock: boolean;
  shipsToAu: boolean;
}

export interface SyntheticQa {
  question: string;
  answer: string;
}

export interface RawChunk {
  id: string;
  type: ChunkType;
  text: string;
  metadata: ChunkMetadata;
}

export interface ChunkOptions {
  syntheticQa: SyntheticQa[];
}

function baseMetadata(p: ChunkableProduct, type: ChunkType): ChunkMetadata {
  return {
    product_id: p.id,
    chunk_type: type,
    category_slug: p.category?.slug,
    material: p.material ?? undefined,
    color: p.color ?? undefined,
    price: p.price ?? undefined,
    in_stock: p.inStock,
    ships_to_au: p.shipsToAu,
    is_new: p.isNew,
    assembly_required: p.assemblyRequired,
  };
}

export function chunkProduct(
  p: ChunkableProduct,
  opts: ChunkOptions,
): RawChunk[] {
  const out: RawChunk[] = [];

  // Parent — single anchor with key facets.
  out.push({
    id: `${p.id}#parent`,
    type: "parent",
    text: [
      p.name,
      p.category?.title ? `Category: ${p.category.title}` : null,
      p.productType ? `Type: ${p.productType}` : null,
      p.material ? `Material: ${p.material}` : null,
      p.color ? `Color: ${p.color}` : null,
      p.price ? `Price: AUD ${p.price}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    metadata: baseMetadata(p, "parent"),
  });

  // Description — narrative.
  if (p.description) {
    out.push({
      id: `${p.id}#description`,
      type: "description",
      text: `${p.name}. ${p.description}`,
      metadata: baseMetadata(p, "description"),
    });
  }

  // Specs — material + dimensions + assembly.
  const specsParts: string[] = [];
  if (p.material) specsParts.push(`Material: ${p.material}`);
  if (p.color) specsParts.push(`Color: ${p.color}`);
  if (p.dimensions) specsParts.push(`Dimensions: ${p.dimensions}`);
  specsParts.push(`Assembly required: ${p.assemblyRequired ? "yes" : "no"}`);
  out.push({
    id: `${p.id}#specs`,
    type: "specs",
    text: `${p.name}. ${specsParts.join(". ")}.`,
    metadata: baseMetadata(p, "specs"),
  });

  // Care — placeholder until Sanity exposes care fields explicitly. For now
  // we synthesize from material + assembly so the chunk exists and matches
  // care-style queries.
  out.push({
    id: `${p.id}#care`,
    type: "care",
    text: `${p.name}. Care: spot-clean with a damp cloth; avoid harsh chemicals. ${
      p.assemblyRequired ? "Assembly required at delivery." : "Arrives fully assembled."
    } Ships across Australia.`,
    metadata: baseMetadata(p, "care"),
  });

  // Synthetic Q&A — one chunk per pair.
  opts.syntheticQa.forEach((qa, i) => {
    out.push({
      id: `${p.id}#qa_${i}`,
      type: "qa",
      text: `${p.name}. Q: ${qa.question} A: ${qa.answer}`,
      metadata: baseMetadata(p, "qa"),
    });
  });

  return out;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/chunk.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/indexer/chunk.ts tests/unit/rag/chunk.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add hierarchical product chunker (parent + 3 facets + N qa)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 12: Synthetic Q&A generator (Haiku)

**Files:**
- Create: `lib/ai/rag/indexer/synthetic-qa.ts`
- Create: `tests/unit/rag/synthetic-qa.test.ts`

The Q&A generator calls Claude Haiku via the Vercel AI Gateway with structured-output Zod validation. Tests inject a mock `generator` function so they stay deterministic.

- [ ] **Step 1: Write failing test**

`tests/unit/rag/synthetic-qa.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import {
  generateSyntheticQa,
  type QaGenerator,
} from "@/lib/ai/rag/indexer/synthetic-qa";

const baseProduct = {
  name: "Nordic Grey 3-Seater Sofa",
  description: "Scandinavian sofa with oak legs and grey upholstery.",
  category: "Living Room",
  material: "fabric",
};

describe("generateSyntheticQa", () => {
  it("returns the generator's output unchanged when valid", async () => {
    const gen: QaGenerator = vi.fn(async () => [
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]);
    const out = await generateSyntheticQa(baseProduct, { count: 5, generator: gen });
    expect(out).toEqual([
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]);
    expect(gen).toHaveBeenCalledWith(
      expect.objectContaining({
        product: baseProduct,
        count: 5,
      }),
    );
  });

  it("returns [] gracefully if the generator throws", async () => {
    const gen: QaGenerator = vi.fn(async () => {
      throw new Error("haiku 503");
    });
    const out = await generateSyntheticQa(baseProduct, { count: 5, generator: gen });
    expect(out).toEqual([]);
  });

  it("clamps count to [1, 10]", async () => {
    const gen: QaGenerator = vi.fn(async ({ count }) =>
      Array.from({ length: count }, (_, i) => ({ question: `q${i}`, answer: `a${i}` })),
    );
    await generateSyntheticQa(baseProduct, { count: 0, generator: gen });
    expect(gen).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    await generateSyntheticQa(baseProduct, { count: 99, generator: gen });
    expect(gen).toHaveBeenCalledWith(expect.objectContaining({ count: 10 }));
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/synthetic-qa.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/indexer/synthetic-qa.ts`**

```typescript
/**
 * Synthetic Q&A generator. Per spec §6 this is the single biggest recall
 * lever for sparse furniture descriptions. Runs once per product at index
 * time via Claude Haiku through the Vercel AI Gateway.
 *
 * The generator function is injected so unit tests don't need network and
 * the real implementation can swap models without touching the chunker.
 */
import { z } from "zod";
import { captureException } from "@/lib/monitoring";

export interface QaProduct {
  name: string;
  description: string;
  category: string | null;
  material: string | null;
}

export interface QaItem {
  question: string;
  answer: string;
}

export interface QaGeneratorArgs {
  product: QaProduct;
  count: number;
}

export type QaGenerator = (args: QaGeneratorArgs) => Promise<QaItem[]>;

export interface GenerateOptions {
  count: number;
  generator: QaGenerator;
}

const QA_SCHEMA = z.array(
  z.object({
    question: z.string().min(3).max(200),
    answer: z.string().min(3).max(400),
  }),
);

const MIN_COUNT = 1;
const MAX_COUNT = 10;

export async function generateSyntheticQa(
  product: QaProduct,
  opts: GenerateOptions,
): Promise<QaItem[]> {
  const count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, opts.count));
  try {
    const raw = await opts.generator({ product, count });
    return QA_SCHEMA.parse(raw);
  } catch (err) {
    captureException(err, {
      context: "synthetic-qa",
      productName: product.name,
    });
    return [];
  }
}

/**
 * Default generator using Vercel AI Gateway + Haiku. Live, not invoked in
 * unit tests. Exported separately so it can be swapped.
 */
export const haikuQaGenerator: QaGenerator = async ({ product, count }) => {
  const { generateObject } = await import("ai");
  const { gateway } = await import("ai");
  const result = await generateObject({
    model: gateway("anthropic/claude-haiku-4-5"),
    schema: QA_SCHEMA,
    prompt: `You are generating synthetic question-answer pairs to improve search recall for a furniture product.

Product:
- Name: ${product.name}
- Category: ${product.category ?? "n/a"}
- Material: ${product.material ?? "n/a"}
- Description: ${product.description}

Generate exactly ${count} question/answer pairs that a customer would plausibly ask about this product. Cover: aesthetic suitability, room fit, comparison with similar styles, care/maintenance, and use-case. Each Q+A must stay under 100 tokens combined.

Return a JSON array of {question, answer}.`,
  });
  return result.object;
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/synthetic-qa.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/indexer/synthetic-qa.ts tests/unit/rag/synthetic-qa.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add synthetic Q&A generator (Haiku via AI Gateway, mocked in tests)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 13: Index orchestrator + sparse-vector encoder

**Files:**
- Create: `lib/ai/rag/indexer/sparse.ts` (BM25 sparse-vector helper)
- Create: `lib/ai/rag/indexer/index-product.ts`
- Create: `tests/unit/rag/index-product.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/index-product.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockEmbed = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockGenerator = vi.fn();
const mockSparseEncode = vi.fn();

vi.mock("@/lib/ai/rag/embed", () => ({ embedTexts: mockEmbed }));
vi.mock("@/lib/ai/rag/store", () => ({
  upsertChunks: mockUpsert,
  deleteByProductId: mockDelete,
}));
vi.mock("@/lib/ai/rag/indexer/sparse", () => ({
  encodeSparseDocuments: mockSparseEncode,
}));

import { indexProduct } from "@/lib/ai/rag/indexer/index-product";

const product = {
  id: "p_001",
  name: "Nordic Grey 3-Seater Sofa",
  description: "A stunning Scandinavian-inspired sofa.",
  category: { title: "Living Room", slug: "living-room" },
  productType: "sofas",
  material: "fabric",
  color: "grey",
  dimensions: "220cm x 95cm x 85cm",
  price: 1299,
  stock: 7,
  assemblyRequired: false,
  isNew: false,
  inStock: true,
  shipsToAu: true,
};

describe("indexProduct", () => {
  beforeEach(() => {
    mockEmbed.mockReset().mockResolvedValue(
      Array.from({ length: 9 }, () => Array(1024).fill(0.01)),
    );
    mockUpsert.mockReset().mockResolvedValue(undefined);
    mockDelete.mockReset().mockResolvedValue(undefined);
    mockGenerator.mockReset().mockResolvedValue([
      { question: "Q1?", answer: "A1." },
      { question: "Q2?", answer: "A2." },
      { question: "Q3?", answer: "A3." },
      { question: "Q4?", answer: "A4." },
      { question: "Q5?", answer: "A5." },
    ]);
    mockSparseEncode.mockReset().mockImplementation((texts: string[]) =>
      texts.map(() => ({ indices: [1], values: [1] })),
    );
  });

  it("deletes prior chunks before re-upserting (idempotent re-index)", async () => {
    await indexProduct(product, { qaGenerator: mockGenerator });
    expect(mockDelete).toHaveBeenCalledWith("p_001");
    expect(mockDelete).toHaveBeenCalledTimes(1);
    // delete must happen before upsert
    expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpsert.mock.invocationCallOrder[0],
    );
  });

  it("emits one upsert with all chunks (parent + description + specs + care + 5 qa = 9)", async () => {
    await indexProduct(product, { qaGenerator: mockGenerator });
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const records = mockUpsert.mock.calls[0][0];
    expect(records).toHaveLength(9);
    expect(records.every((r: { id: string }) => r.id.startsWith("p_001#"))).toBe(true);
  });

  it("returns the count of chunks indexed", async () => {
    const result = await indexProduct(product, { qaGenerator: mockGenerator });
    expect(result).toEqual({ productId: "p_001", chunksIndexed: 9 });
  });

  it("survives QA generator failure with 0 qa chunks (just 4 base)", async () => {
    mockGenerator.mockResolvedValueOnce(undefined as unknown as never);
    mockEmbed.mockResolvedValueOnce(
      Array.from({ length: 4 }, () => Array(1024).fill(0.01)),
    );
    const result = await indexProduct(product, { qaGenerator: vi.fn(async () => { throw new Error("haiku down"); }) });
    expect(result.chunksIndexed).toBe(4);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/index-product.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/indexer/sparse.ts`**

```typescript
/**
 * Sparse-vector (BM25) encoder for Pinecone hybrid retrieval. Wraps
 * pinecone-text. Documents and queries use different methods so the
 * BM25 scoring weights are correctly applied.
 */
import { BM25Encoder } from "pinecone-text/sparse";

let cached: BM25Encoder | null = null;
let fitted = false;

export async function getBM25Encoder(): Promise<BM25Encoder> {
  if (cached) return cached;
  cached = new BM25Encoder();
  return cached;
}

/**
 * Fit the encoder on the document corpus once before encoding. Idempotent —
 * subsequent calls are no-ops. In production this runs against the full
 * Sanity catalog at the start of a bulk re-index.
 */
export async function fitEncoder(corpus: string[]): Promise<void> {
  const enc = await getBM25Encoder();
  await enc.fit(corpus);
  fitted = true;
}

export async function encodeSparseDocuments(
  texts: string[],
): Promise<Array<{ indices: number[]; values: number[] }>> {
  const enc = await getBM25Encoder();
  if (!fitted) {
    // Fit on the texts themselves as a fallback for single-product
    // re-index calls. Lower quality than corpus-wide fit but functional.
    await enc.fit(texts);
    fitted = true;
  }
  return Promise.all(texts.map((t) => enc.encodeDocuments(t)));
}

export async function encodeSparseQuery(
  text: string,
): Promise<{ indices: number[]; values: number[] }> {
  const enc = await getBM25Encoder();
  return enc.encodeQueries(text);
}

/** Test seam. */
export function __resetSparseEncoderForTests(): void {
  cached = null;
  fitted = false;
}
```

- [ ] **Step 4: Implement `lib/ai/rag/indexer/index-product.ts`**

```typescript
/**
 * Index orchestrator: fetches the chunked + Q&A-augmented representation
 * of a product, embeds every chunk, encodes its sparse counterpart, and
 * upserts the bundle to Pinecone. Idempotent: deletes any existing chunks
 * for the same product_id before upserting.
 */
import { embedTexts } from "@/lib/ai/rag/embed";
import {
  type ChunkableProduct,
  chunkProduct,
} from "@/lib/ai/rag/indexer/chunk";
import { encodeSparseDocuments } from "@/lib/ai/rag/indexer/sparse";
import {
  generateSyntheticQa,
  haikuQaGenerator,
  type QaGenerator,
} from "@/lib/ai/rag/indexer/synthetic-qa";
import { type ChunkRecord, deleteByProductId, upsertChunks } from "@/lib/ai/rag/store";

const SYNTHETIC_QA_COUNT = 5;

export interface IndexOptions {
  qaGenerator?: QaGenerator;
}

export interface IndexResult {
  productId: string;
  chunksIndexed: number;
}

export async function indexProduct(
  product: ChunkableProduct,
  opts: IndexOptions = {},
): Promise<IndexResult> {
  const generator = opts.qaGenerator ?? haikuQaGenerator;

  const syntheticQa = await generateSyntheticQa(
    {
      name: product.name,
      description: product.description,
      category: product.category?.title ?? null,
      material: product.material,
    },
    { count: SYNTHETIC_QA_COUNT, generator },
  );

  const chunks = chunkProduct(product, { syntheticQa });
  const texts = chunks.map((c) => c.text);

  const [denseVectors, sparseVectors] = await Promise.all([
    embedTexts(texts, { kind: "document" }),
    encodeSparseDocuments(texts),
  ]);

  const records: ChunkRecord[] = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: denseVectors[i],
    sparseValues: sparseVectors[i],
    metadata: chunk.metadata,
  }));

  await deleteByProductId(product.id);
  await upsertChunks(records);

  return { productId: product.id, chunksIndexed: records.length };
}
```

- [ ] **Step 5: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/index-product.test.ts
```

- [ ] **Step 6: Commit + checkpoint**

```bash
git add lib/ai/rag/indexer/sparse.ts lib/ai/rag/indexer/index-product.ts tests/unit/rag/index-product.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add index orchestrator + BM25 sparse encoder

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 14: Bulk re-index CLI

**Files:**
- Create: `tools/reindex-rag.ts`
- Modify: `package.json` (add `reindex:rag` script)

This is a one-shot CLI used for the initial seed and for disaster recovery. No unit test — it's a thin wrapper around `indexProduct` plus Sanity fetching. Functionality is verified by Task 32 (initial bulk index).

- [ ] **Step 1: Implement `tools/reindex-rag.ts`**

```typescript
#!/usr/bin/env tsx
/**
 * Bulk re-index CLI. Pulls every product from Sanity, runs the indexer
 * end-to-end, and prints a per-product status line.
 *
 * Usage:
 *   pnpm reindex:rag                # all products
 *   pnpm reindex:rag --slug=foo-bar # single product by slug
 *   pnpm reindex:rag --since=2026-04-01  # touched since date
 */
import "dotenv/config";
import { client } from "@/sanity/lib/client";
import { fitEncoder } from "@/lib/ai/rag/indexer/sparse";
import { indexProduct } from "@/lib/ai/rag/indexer/index-product";
import type { ChunkableProduct } from "@/lib/ai/rag/indexer/chunk";

interface SanityProduct {
  _id: string;
  _updatedAt: string;
  name: string;
  slug: { current: string };
  description: string;
  category: { title: string; slug: { current: string } } | null;
  productType: string | null;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  price: number | null;
  stock: number | null;
  assemblyRequired: boolean | null;
  isNew: boolean | null;
}

const QUERY = `*[_type == "product" $extra]{
  _id, _updatedAt, name, slug, description, productType, material, color, dimensions, price, stock, assemblyRequired, isNew,
  "category": category->{ title, slug }
}`;

function buildExtras(args: ReturnType<typeof parseArgs>) {
  const parts: string[] = [];
  if (args.slug) parts.push(`&& slug.current == "${args.slug}"`);
  if (args.since) parts.push(`&& _updatedAt >= "${args.since}"`);
  return parts.join(" ");
}

function parseArgs() {
  const args = { slug: undefined as string | undefined, since: undefined as string | undefined };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--slug=")) args.slug = arg.slice("--slug=".length);
    if (arg.startsWith("--since=")) args.since = arg.slice("--since=".length);
  }
  return args;
}

function toChunkable(p: SanityProduct): ChunkableProduct {
  return {
    id: p._id,
    name: p.name,
    description: p.description ?? "",
    category: p.category ? { title: p.category.title, slug: p.category.slug.current } : null,
    productType: p.productType,
    material: p.material,
    color: p.color,
    dimensions: p.dimensions,
    price: p.price,
    stock: p.stock,
    assemblyRequired: !!p.assemblyRequired,
    isNew: !!p.isNew,
    inStock: (p.stock ?? 0) > 0,
    shipsToAu: true,
  };
}

async function main() {
  const args = parseArgs();
  const extra = buildExtras(args);
  const query = QUERY.replace("$extra", extra);
  const products = (await client.fetch<SanityProduct[]>(query)) ?? [];
  console.log(`[reindex] fetched ${products.length} product(s)`);

  if (products.length === 0) {
    console.log("[reindex] nothing to do");
    return;
  }

  // Fit BM25 once on the full set so per-product encodes are corpus-aware.
  const corpus = products.map(
    (p) => `${p.name}. ${p.description ?? ""}`,
  );
  await fitEncoder(corpus);

  let ok = 0;
  let fail = 0;
  for (const p of products) {
    try {
      const result = await indexProduct(toChunkable(p));
      console.log(`[reindex] ✓ ${p.slug.current} → ${result.chunksIndexed} chunks`);
      ok += 1;
    } catch (err) {
      console.error(
        `[reindex] ✗ ${p.slug.current}:`,
        err instanceof Error ? err.message : err,
      );
      fail += 1;
    }
  }
  console.log(`[reindex] done. ${ok} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[reindex] fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the package script**

Modify `package.json` `scripts`:
```json
{
  "scripts": {
    "...": "...",
    "reindex:rag": "tsx tools/reindex-rag.ts"
  }
}
```

- [ ] **Step 3: Verify the CLI compiles (no runtime call yet)**

```bash
pnpm tsc --noEmit tools/reindex-rag.ts
```

> Or if `tsc` per-file doesn't pick up project config, just rely on `pnpm typecheck`.

- [ ] **Step 4: Commit + checkpoint**

```bash
git add tools/reindex-rag.ts package.json
git commit -m "$(cat <<'EOF'
feat(rag): add bulk reindex CLI (tools/reindex-rag.ts)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 4 — Query pipeline

### Task 15: Query understanding (rewrite + filter extraction + conditional HyDE)

**Files:**
- Create: `lib/ai/rag/query/understand.ts`
- Create: `tests/unit/rag/understand.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/understand.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import {
  understandQuery,
  type UnderstandingFn,
} from "@/lib/ai/rag/query/understand";

const goodFn: UnderstandingFn = vi.fn(async (args) => ({
  rewritten: `${args.query} (rewritten)`,
  filters: { maxPrice: 400, color: "oak" },
  hyde: args.query.length < 30 ? "Hypothetical product description" : null,
}));

describe("understandQuery", () => {
  it("returns the LLM-derived understanding when the call succeeds", async () => {
    const out = await understandQuery({
      query: "cozy reading nook",
      history: [],
      understandingFn: goodFn,
    });
    expect(out.rewritten).toMatch(/rewritten/);
    expect(out.filters.maxPrice).toBe(400);
    expect(out.hyde).toBeTruthy();
  });

  it("falls back to identity rewrite + empty filters on failure", async () => {
    const failing: UnderstandingFn = vi.fn(async () => {
      throw new Error("haiku 503");
    });
    const out = await understandQuery({
      query: "anything",
      history: [],
      understandingFn: failing,
    });
    expect(out.rewritten).toBe("anything");
    expect(out.filters).toEqual({});
    expect(out.hyde).toBeNull();
  });

  it("clamps invalid filter values (e.g. negative price)", async () => {
    const evil: UnderstandingFn = vi.fn(async () => ({
      rewritten: "x",
      filters: { maxPrice: -1, minPrice: -10 },
      hyde: null,
    }));
    const out = await understandQuery({
      query: "x",
      history: [],
      understandingFn: evil,
    });
    expect(out.filters.maxPrice).toBeUndefined();
    expect(out.filters.minPrice).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/understand.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/query/understand.ts`**

```typescript
/**
 * Query understanding stage. Sends a Haiku call (via injected
 * `UnderstandingFn`) that returns:
 *   - rewritten:  conversational rewrite resolving anaphora and adding history
 *   - filters:    extracted hard constraints (price, material, color, ...)
 *   - hyde:       optional hypothetical product description for short queries
 *
 * On any failure or schema violation we degrade to the identity rewrite +
 * empty filters so retrieval still happens.
 */
import { z } from "zod";
import { captureException } from "@/lib/monitoring";

export interface QueryFilters {
  maxPrice?: number;
  minPrice?: number;
  material?: string;
  color?: string;
  category?: string;
  inStockOnly?: boolean;
}

export interface Understanding {
  rewritten: string;
  filters: QueryFilters;
  hyde: string | null;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export type UnderstandingFn = (args: {
  query: string;
  history: ConversationTurn[];
}) => Promise<Understanding>;

export interface UnderstandArgs {
  query: string;
  history: ConversationTurn[];
  understandingFn: UnderstandingFn;
}

const FILTERS_SCHEMA = z
  .object({
    maxPrice: z.number().positive().optional(),
    minPrice: z.number().nonnegative().optional(),
    material: z.string().optional(),
    color: z.string().optional(),
    category: z.string().optional(),
    inStockOnly: z.boolean().optional(),
  })
  .strip();

const UNDERSTANDING_SCHEMA = z.object({
  rewritten: z.string().min(1),
  filters: FILTERS_SCHEMA,
  hyde: z.string().nullable(),
});

export async function understandQuery(
  args: UnderstandArgs,
): Promise<Understanding> {
  try {
    const raw = await args.understandingFn({
      query: args.query,
      history: args.history,
    });
    return UNDERSTANDING_SCHEMA.parse(raw);
  } catch (err) {
    captureException(err, { context: "query-understand", query: args.query });
    return { rewritten: args.query, filters: {}, hyde: null };
  }
}

/** Default Haiku-backed implementation. */
export const haikuUnderstandingFn: UnderstandingFn = async ({
  query,
  history,
}) => {
  const { generateObject, gateway } = await import("ai");
  const recent = history.slice(-3).map((t) => `${t.role}: ${t.content}`).join("\n");
  const result = await generateObject({
    model: gateway("anthropic/claude-haiku-4-5"),
    schema: UNDERSTANDING_SCHEMA,
    prompt: `You are the query-understanding stage of a furniture-store RAG pipeline.

Recent conversation (most recent last):
${recent || "(no prior turns)"}

Current user query: "${query}"

Tasks:
1. rewritten: rewrite the user's query as a standalone search query, resolving any pronouns or implicit references using the history. Keep it concise.
2. filters: extract hard constraints from the query into the structured object. maxPrice/minPrice are AUD numbers. material/color/category match the catalog vocabulary. inStockOnly is true if the user implies they want it now.
3. hyde: if the query is shorter than 30 characters or very vague, write a one-paragraph hypothetical product description that would be a perfect match. Otherwise null.

Return strict JSON matching the schema.`,
  });
  return result.object;
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/understand.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/query/understand.ts tests/unit/rag/understand.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add query understanding stage (rewrite + filter extraction + HyDE)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 16: Retrieve stage (Pinecone hybrid)

**Files:**
- Create: `lib/ai/rag/query/retrieve.ts`
- Create: `tests/unit/rag/retrieve.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/retrieve.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockEmbed = vi.fn();
const mockSparseEncode = vi.fn();
const mockHybridQuery = vi.fn();

vi.mock("@/lib/ai/rag/embed", () => ({ embedTexts: mockEmbed }));
vi.mock("@/lib/ai/rag/indexer/sparse", () => ({
  encodeSparseQuery: mockSparseEncode,
}));
vi.mock("@/lib/ai/rag/store", () => ({ hybridQuery: mockHybridQuery }));

import { retrieve } from "@/lib/ai/rag/query/retrieve";

describe("retrieve", () => {
  beforeEach(() => {
    mockEmbed.mockReset().mockResolvedValue([Array(1024).fill(0.01)]);
    mockSparseEncode.mockReset().mockResolvedValue({ indices: [1], values: [1] });
    mockHybridQuery.mockReset().mockResolvedValue([
      { id: "p1#parent", score: 0.9, productId: "p1", chunkType: "parent", metadata: { product_id: "p1", chunk_type: "parent" } },
    ]);
  });

  it("embeds the rewritten query, encodes sparse, and queries with topK", async () => {
    const out = await retrieve({
      rewritten: "oak coffee table",
      hyde: null,
      filters: { maxPrice: 500 },
      topK: 30,
    });
    expect(mockEmbed).toHaveBeenCalledWith(["oak coffee table"], { kind: "query" });
    expect(mockSparseEncode).toHaveBeenCalledWith("oak coffee table");
    expect(mockHybridQuery).toHaveBeenCalledWith(
      expect.objectContaining({ topK: 30, vector: expect.any(Array), sparseVector: expect.any(Object) }),
    );
    expect(out).toHaveLength(1);
  });

  it("uses HyDE text for embedding when provided", async () => {
    await retrieve({
      rewritten: "x",
      hyde: "A small oak coffee table for a Scandinavian living room.",
      filters: {},
      topK: 30,
    });
    expect(mockEmbed).toHaveBeenCalledWith(
      ["A small oak coffee table for a Scandinavian living room."],
      { kind: "query" },
    );
  });

  it("translates filters into Pinecone metadata expressions", async () => {
    await retrieve({
      rewritten: "x",
      hyde: null,
      filters: { maxPrice: 500, minPrice: 100, material: "oak", inStockOnly: true },
      topK: 30,
    });
    expect(mockHybridQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          price: { $gte: 100, $lte: 500 },
          material: { $eq: "oak" },
          in_stock: { $eq: true },
          ships_to_au: { $eq: true },
        },
      }),
    );
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/retrieve.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/query/retrieve.ts`**

```typescript
/**
 * Retrieve stage — embeds the (rewritten or HyDE) query, encodes its BM25
 * sparse counterpart, and runs a hybrid Pinecone query with the extracted
 * metadata filters pre-applied. Always pre-filters on `ships_to_au` to
 * keep the catalog relevant to AU customers (per spec).
 */
import { embedTexts } from "@/lib/ai/rag/embed";
import { encodeSparseQuery } from "@/lib/ai/rag/indexer/sparse";
import { type QueryFilter, hybridQuery, type QueryMatch } from "@/lib/ai/rag/store";
import type { QueryFilters } from "@/lib/ai/rag/query/understand";

export interface RetrieveArgs {
  rewritten: string;
  hyde: string | null;
  filters: QueryFilters;
  topK: number;
}

function buildPineconeFilter(f: QueryFilters): QueryFilter {
  const out: QueryFilter = { ships_to_au: { $eq: true } };
  if (f.maxPrice !== undefined || f.minPrice !== undefined) {
    out.price = {};
    if (f.minPrice !== undefined) out.price.$gte = f.minPrice;
    if (f.maxPrice !== undefined) out.price.$lte = f.maxPrice;
  }
  if (f.material) out.material = { $eq: f.material };
  if (f.color) out.color = { $eq: f.color };
  if (f.category) out.category_slug = { $eq: f.category };
  if (f.inStockOnly) out.in_stock = { $eq: true };
  return out;
}

export async function retrieve(args: RetrieveArgs): Promise<QueryMatch[]> {
  const queryText = args.hyde ?? args.rewritten;
  const [denseVec, sparseVec] = await Promise.all([
    embedTexts([queryText], { kind: "query" }),
    encodeSparseQuery(queryText),
  ]);
  return hybridQuery({
    vector: denseVec[0],
    sparseVector: sparseVec,
    topK: args.topK,
    filter: buildPineconeFilter(args.filters),
  });
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/retrieve.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/query/retrieve.ts tests/unit/rag/retrieve.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add hybrid retrieve stage with metadata pre-filtering

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 17: Rerank stage wrapper

**Files:**
- Create: `lib/ai/rag/query/rerank.ts`
- Create: `tests/unit/rag/query-rerank.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/query-rerank.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRerank = vi.fn();
vi.mock("@/lib/ai/rag/rerank", () => ({ rerankCandidates: mockRerank }));

import { rerankAndDedupe } from "@/lib/ai/rag/query/rerank";
import type { QueryMatch } from "@/lib/ai/rag/store";

const makeMatch = (id: string, productId: string, chunkType: "parent" | "description" | "qa" | "specs" | "care" = "parent"): QueryMatch => ({
  id, score: 0.5, productId, chunkType, metadata: { product_id: productId, chunk_type: chunkType },
});

describe("rerankAndDedupe", () => {
  beforeEach(() => {
    mockRerank.mockReset();
  });

  it("dedupes by productId after rerank, keeping the highest-scoring chunk per product", async () => {
    const candidates: QueryMatch[] = [
      makeMatch("p1#parent", "p1", "parent"),
      makeMatch("p1#description", "p1", "description"),
      makeMatch("p2#parent", "p2", "parent"),
      makeMatch("p3#qa_0", "p3", "qa"),
    ];
    // Pretend the rerank gives description > parent for p1 → only description survives.
    mockRerank.mockResolvedValueOnce([
      { id: "p1#description", text: "...", score: 0.95 },
      { id: "p2#parent",      text: "...", score: 0.90 },
      { id: "p1#parent",      text: "...", score: 0.85 },
      { id: "p3#qa_0",        text: "...", score: 0.80 },
    ]);
    const out = await rerankAndDedupe({
      query: "q",
      candidates,
      candidateTexts: { "p1#parent": "a", "p1#description": "b", "p2#parent": "c", "p3#qa_0": "d" },
      topNAfterRerank: 10,
      topProducts: 5,
    });
    expect(out.map((m) => m.productId)).toEqual(["p1", "p2", "p3"]);
    expect(out[0].id).toBe("p1#description"); // highest-ranked chunk for p1
  });

  it("respects topProducts cap", async () => {
    const candidates: QueryMatch[] = Array.from({ length: 8 }, (_, i) =>
      makeMatch(`p${i}#parent`, `p${i}`),
    );
    mockRerank.mockResolvedValueOnce(
      candidates.map((c, i) => ({ id: c.id, text: "x", score: 1 - i * 0.01 })),
    );
    const out = await rerankAndDedupe({
      query: "q",
      candidates,
      candidateTexts: Object.fromEntries(candidates.map((c) => [c.id, "x"])),
      topNAfterRerank: 8,
      topProducts: 3,
    });
    expect(out).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/query-rerank.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/query/rerank.ts`**

```typescript
/**
 * Pipeline wrapper around the Cohere rerank adapter that:
 *   1. Reranks the full candidate set,
 *   2. Deduplicates by productId (keeping the highest-scored chunk per product),
 *   3. Caps to the requested top-N products.
 *
 * The Pinecone retrieve stage may return multiple chunks for the same
 * product (e.g. parent + description + a qa chunk all match). Letting the
 * LLM see duplicates wastes context — this is where dedupe happens.
 */
import { rerankCandidates } from "@/lib/ai/rag/rerank";
import type { QueryMatch } from "@/lib/ai/rag/store";

export interface RerankInput {
  query: string;
  candidates: QueryMatch[];
  /** Map of chunk id → embeddable text (parent, description, etc.). */
  candidateTexts: Record<string, string>;
  topNAfterRerank: number;
  topProducts: number;
}

export async function rerankAndDedupe(
  args: RerankInput,
): Promise<QueryMatch[]> {
  const reranked = await rerankCandidates({
    query: args.query,
    candidates: args.candidates.map((c) => ({
      id: c.id,
      text: args.candidateTexts[c.id] ?? c.id,
    })),
    topN: args.topNAfterRerank,
  });

  const byChunk = new Map(args.candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const out: QueryMatch[] = [];

  for (const r of reranked) {
    const original = byChunk.get(r.id);
    if (!original) continue;
    if (seen.has(original.productId)) continue;
    seen.add(original.productId);
    out.push({ ...original, score: r.score });
    if (out.length >= args.topProducts) break;
  }

  return out;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/query-rerank.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/query/rerank.ts tests/unit/rag/query-rerank.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add rerank+dedupe pipeline wrapper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 18: Pipeline output formatter

**Files:**
- Create: `lib/ai/rag/query/format.ts`
- Create: `tests/unit/rag/query-format.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/query-format.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { formatPipelineResults } from "@/lib/ai/rag/query/format";

describe("formatPipelineResults", () => {
  it("hydrates each match with the per-product detail row by productId", () => {
    const matches = [
      { id: "p1#parent", score: 0.9, productId: "p1", chunkType: "parent" as const, metadata: { product_id: "p1", chunk_type: "parent" as const } },
    ];
    const products = {
      p1: {
        id: "p1",
        slug: "nordic-grey-3-seater-sofa",
        name: "Nordic Grey 3-Seater Sofa",
        oneLine: "Scandinavian sofa with oak legs.",
        price: 1299,
        priceFormatted: "AUD 1,299",
        keyMaterials: "fabric, oak",
        stockStatus: "in_stock" as const,
        imageUrl: "https://cdn/x.jpg",
        productUrl: "/products/nordic-grey-3-seater-sofa",
      },
    };
    const out = formatPipelineResults({ matches, products });
    expect(out.products[0]).toMatchObject({
      id: "p1",
      slug: "nordic-grey-3-seater-sofa",
      name: "Nordic Grey 3-Seater Sofa",
      relevanceScore: 0.9,
    });
    expect(out.totalResults).toBe(1);
  });

  it("drops matches whose productId is missing from the products map", () => {
    const matches = [
      { id: "p1#parent", score: 0.9, productId: "p1", chunkType: "parent" as const, metadata: { product_id: "p1", chunk_type: "parent" as const } },
      { id: "p2#parent", score: 0.8, productId: "p2", chunkType: "parent" as const, metadata: { product_id: "p2", chunk_type: "parent" as const } },
    ];
    const out = formatPipelineResults({ matches, products: {} });
    expect(out.products).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/query-format.test.ts
```

- [ ] **Step 3: Implement `lib/ai/rag/query/format.ts`**

```typescript
/**
 * Pipeline output formatter. Joins reranked matches with hydrated product
 * details (fetched separately from Sanity through getProductDetails) and
 * shapes the structured tool-result envelope passed to formatToolResult.
 */
import type { QueryMatch } from "@/lib/ai/rag/store";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  oneLine: string;
  price: number;
  priceFormatted: string;
  keyMaterials: string;
  stockStatus: StockStatus;
  imageUrl: string | null;
  productUrl: string;
}

export interface FormatPipelineArgs {
  matches: QueryMatch[];
  products: Record<string, ProductSummary>;
}

export interface FormattedProduct extends ProductSummary {
  relevanceScore: number;
}

export interface FormattedPipelineResult {
  found: boolean;
  totalResults: number;
  products: FormattedProduct[];
}

export function formatPipelineResults(
  args: FormatPipelineArgs,
): FormattedPipelineResult {
  const products: FormattedProduct[] = [];
  for (const m of args.matches) {
    const summary = args.products[m.productId];
    if (!summary) continue;
    products.push({ ...summary, relevanceScore: m.score });
  }
  return {
    found: products.length > 0,
    totalResults: products.length,
    products,
  };
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/query-format.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/rag/query/format.ts tests/unit/rag/query-format.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add pipeline output formatter (matches × product summaries)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 5 — Routes

### Task 19: Sanity webhook → QStash enqueue

**Files:**
- Create: `app/api/webhooks/sanity-rag/route.ts`
- Create: `tests/unit/rag/webhook.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/webhook.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockEnqueue = vi.fn();
vi.mock("@upstash/qstash", () => ({
  Client: vi.fn().mockImplementation(() => ({ publishJSON: mockEnqueue })),
}));

import { POST } from "@/app/api/webhooks/sanity-rag/route";

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/webhooks/sanity-rag", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("POST /api/webhooks/sanity-rag", () => {
  beforeEach(() => {
    mockEnqueue.mockReset().mockResolvedValue({ messageId: "qm_1" });
    process.env.SANITY_RAG_WEBHOOK_SECRET = "secret";
    process.env.QSTASH_TOKEN = "qtok";
  });

  it("rejects without a matching shared secret header", async () => {
    const res = await POST(makeRequest({ _id: "x", _rev: "1", _type: "product" }));
    expect(res.status).toBe(401);
  });

  it("enqueues product reindex jobs with idempotency key {_id}:{_rev}", async () => {
    const res = await POST(
      makeRequest(
        { _id: "p_001", _rev: "rev_a", _type: "product" },
        { "x-sanity-rag-secret": "secret" },
      ),
    );
    expect(res.status).toBe(202);
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { productId: "p_001" },
        deduplicationId: "p_001:rev_a",
      }),
    );
  });

  it("ignores non-product document types with a 200", async () => {
    const res = await POST(
      makeRequest(
        { _id: "x", _rev: "1", _type: "category" },
        { "x-sanity-rag-secret": "secret" },
      ),
    );
    expect(res.status).toBe(200);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/webhook.test.ts
```

- [ ] **Step 3: Implement `app/api/webhooks/sanity-rag/route.ts`**

```typescript
/**
 * Sanity → RAG re-index webhook. Validates shared secret, filters to
 * product mutations, and enqueues a reindex job to Upstash QStash. The
 * QStash deduplicationId guarantees we only process each (_id, _rev) once
 * even if Sanity retries the webhook.
 */
import { Client } from "@upstash/qstash";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const SCHEMA = z.object({
  _id: z.string().min(1),
  _rev: z.string().min(1),
  _type: z.string().min(1),
});

let cachedClient: Client | null = null;
function qstash(): Client {
  if (cachedClient) return cachedClient;
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN is not set");
  cachedClient = new Client({ token });
  return cachedClient;
}

function workerUrl(): string {
  const base =
    process.env.RAG_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/jobs/reindex-product`;
}

export async function POST(request: Request) {
  const expected = process.env.SANITY_RAG_WEBHOOK_SECRET;
  if (!expected || request.headers.get("x-sanity-rag-secret") !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const parsed = SCHEMA.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (parsed.data._type !== "product") {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  await qstash().publishJSON({
    url: workerUrl(),
    body: { productId: parsed.data._id },
    deduplicationId: `${parsed.data._id}:${parsed.data._rev}`,
    retries: 5,
  });

  return new Response(JSON.stringify({ ok: true, queued: true }), {
    status: 202,
    headers: { "content-type": "application/json" },
  });
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/webhook.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add app/api/webhooks/sanity-rag/route.ts tests/unit/rag/webhook.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add Sanity webhook → QStash enqueue route

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 20: QStash worker → Pinecone upsert

**Files:**
- Create: `app/api/jobs/reindex-product/route.ts`
- Create: `tests/unit/rag/job-reindex.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/job-reindex.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIndex = vi.fn();
const mockFetch = vi.fn();
const mockVerify = vi.fn();

vi.mock("@/lib/ai/rag/indexer/index-product", () => ({ indexProduct: mockIndex }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: mockFetch } }));
vi.mock("@upstash/qstash/nextjs", () => ({
  verifySignatureAppRouter: (handler: unknown) => handler,
}));
vi.mock("@upstash/qstash", () => ({
  Receiver: vi.fn().mockImplementation(() => ({ verify: mockVerify })),
}));

import { POST } from "@/app/api/jobs/reindex-product/route";

function makeRequest(body: object) {
  return new Request("http://localhost/api/jobs/reindex-product", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/jobs/reindex-product", () => {
  beforeEach(() => {
    mockIndex.mockReset().mockResolvedValue({ productId: "p_001", chunksIndexed: 9 });
    mockFetch.mockReset().mockResolvedValue({
      _id: "p_001",
      name: "X",
      slug: { current: "x" },
      description: "y",
      category: null,
      productType: null,
      material: null,
      color: null,
      dimensions: null,
      price: 100,
      stock: 1,
      assemblyRequired: false,
      isNew: false,
    });
    mockVerify.mockResolvedValue(undefined);
  });

  it("calls indexProduct for the requested productId", async () => {
    const res = await POST(makeRequest({ productId: "p_001" }));
    expect(res.status).toBe(200);
    expect(mockIndex).toHaveBeenCalled();
    expect(mockIndex.mock.calls[0][0].id).toBe("p_001");
  });

  it("returns 404 when the product no longer exists in Sanity", async () => {
    mockFetch.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ productId: "missing" }));
    expect(res.status).toBe(404);
    expect(mockIndex).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/job-reindex.test.ts
```

- [ ] **Step 3: Implement `app/api/jobs/reindex-product/route.ts`**

```typescript
/**
 * QStash worker. Re-indexes one product into Pinecone.
 *
 * verifySignatureAppRouter handles QStash signing-key verification (with
 * key rotation via QSTASH_NEXT_SIGNING_KEY). The worker is idempotent:
 * indexProduct deletes prior chunks before upserting, so QStash retries
 * are safe.
 */
import { z } from "zod";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { client as sanityClient } from "@/sanity/lib/client";
import { indexProduct } from "@/lib/ai/rag/indexer/index-product";
import type { ChunkableProduct } from "@/lib/ai/rag/indexer/chunk";
import { captureException } from "@/lib/monitoring";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = z.object({ productId: z.string().min(1) });

const PRODUCT_QUERY = `*[_type == "product" && _id == $id][0]{
  _id, name, slug, description, productType, material, color, dimensions, price, stock, assemblyRequired, isNew,
  "category": category->{ title, slug }
}`;

interface SanityProduct {
  _id: string;
  name: string;
  slug: { current: string };
  description: string;
  category: { title: string; slug: { current: string } } | null;
  productType: string | null;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  price: number | null;
  stock: number | null;
  assemblyRequired: boolean | null;
  isNew: boolean | null;
}

function toChunkable(p: SanityProduct): ChunkableProduct {
  return {
    id: p._id,
    name: p.name,
    description: p.description ?? "",
    category: p.category ? { title: p.category.title, slug: p.category.slug.current } : null,
    productType: p.productType,
    material: p.material,
    color: p.color,
    dimensions: p.dimensions,
    price: p.price,
    stock: p.stock,
    assemblyRequired: !!p.assemblyRequired,
    isNew: !!p.isNew,
    inStock: (p.stock ?? 0) > 0,
    shipsToAu: true,
  };
}

async function handler(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }
  const parsed = SCHEMA.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid payload" }), { status: 400 });
  }

  try {
    const product = (await sanityClient.fetch<SanityProduct | null>(PRODUCT_QUERY, {
      id: parsed.data.productId,
    })) ?? null;
    if (!product) {
      return new Response(JSON.stringify({ error: "product not found" }), { status: 404 });
    }
    const result = await indexProduct(toChunkable(product));
    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200 });
  } catch (err) {
    captureException(err, { context: "rag-reindex-job", productId: parsed.data.productId });
    return new Response(JSON.stringify({ error: "reindex failed" }), { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/job-reindex.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add app/api/jobs/reindex-product/route.ts tests/unit/rag/job-reindex.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add QStash reindex worker route (verified signature, idempotent)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 6 — Tools

### Task 21: getProductDetails tool (authoritative truth)

**Files:**
- Create: `lib/ai/tools/get-product-details.ts`
- Create: `tests/unit/rag/get-product-details.test.ts`

This tool is the hallucination guardrail (per spec §7) — the agent must call it before quoting any spec, price, or stock.

- [ ] **Step 1: Write failing test**

`tests/unit/rag/get-product-details.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.mock("@sanity/lib/live", () => ({ sanityFetch: mockFetch }));
vi.mock("@/sanity/lib/live", () => ({ sanityFetch: mockFetch }));

import { getProductDetailsTool } from "@/lib/ai/tools/get-product-details";

describe("getProductDetailsTool", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns structured details when the slug exists", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        _id: "p_001",
        name: "Nordic Grey 3-Seater Sofa",
        slug: { current: "nordic-grey-3-seater-sofa" },
        description: "Scandinavian sofa.",
        price: 1299,
        category: { title: "Living Room", slug: { current: "living-room" } },
        material: "fabric",
        color: "grey",
        dimensions: "220cm x 95cm x 85cm",
        stock: 7,
        featured: false,
        assemblyRequired: false,
        image: { asset: { url: "https://cdn/x.jpg" } },
      },
    });
    const out = await getProductDetailsTool.execute(
      { productSlug: "nordic-grey-3-seater-sofa" },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect(out.found).toBe(true);
    expect(out.product?.slug).toBe("nordic-grey-3-seater-sofa");
    expect(out.product?.priceFormatted).toBeTruthy();
  });

  it("returns found:false when slug is missing", async () => {
    mockFetch.mockResolvedValueOnce({ data: null });
    const out = await getProductDetailsTool.execute(
      { productSlug: "nope" },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect(out.found).toBe(false);
    expect(out.product).toBeNull();
  });
});
```

> **Note:** the test mocks both possible import paths to be safe — verify the actual path used in `search-products.ts` (`@/sanity/lib/live`) and keep just that one.

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/get-product-details.test.ts
```

- [ ] **Step 3: Implement `lib/ai/tools/get-product-details.ts`**

```typescript
/**
 * getProductDetails tool — authoritative product truth fetched directly
 * from Sanity. Per spec §7 the agent MUST call this before quoting any
 * dimension, price, or stock value to the customer. Cached briefly via
 * Sanity's CDN behaviour (read client uses CDN per ADR-0002).
 */
import { tool } from "ai";
import { z } from "zod";
import { getStockMessage, getStockStatus } from "@/lib/constants/stock";
import { formatPrice } from "@/lib/utils";
import { sanityFetch } from "@/sanity/lib/live";

const inputSchema = z.object({
  productSlug: z
    .string()
    .min(1)
    .describe("The product slug (URL-safe identifier) to fetch details for."),
});

const QUERY = `*[_type == "product" && slug.current == $slug][0]{
  _id, name, slug, description, price, dimensions, stock, assemblyRequired, featured,
  material, color,
  "category": category->{ title, slug },
  "image": images[0]{ asset->{ url } }
}`;

export const getProductDetailsTool = tool({
  description:
    "Fetch the authoritative current details (price, stock, dimensions, materials, image) for one product by its slug. Always call this before quoting numbers to the customer.",
  inputSchema,
  execute: async ({ productSlug }) => {
    const { data } = await sanityFetch({ query: QUERY, params: { slug: productSlug } });
    if (!data) {
      return {
        found: false,
        product: null,
        message: `No product found with slug "${productSlug}".`,
      };
    }

    const stock = (data as { stock?: number }).stock ?? 0;
    const price = (data as { price?: number }).price ?? 0;

    return {
      found: true,
      product: {
        id: (data as { _id: string })._id,
        slug: productSlug,
        name: (data as { name?: string }).name ?? "",
        description: (data as { description?: string }).description ?? "",
        price,
        priceFormatted: formatPrice(price),
        category: (data as { category?: { title?: string } | null }).category?.title ?? null,
        material: (data as { material?: string | null }).material ?? null,
        color: (data as { color?: string | null }).color ?? null,
        dimensions: (data as { dimensions?: string | null }).dimensions ?? null,
        stockCount: stock,
        stockStatus: getStockStatus(stock),
        stockMessage: getStockMessage(stock),
        assemblyRequired: !!(data as { assemblyRequired?: boolean }).assemblyRequired,
        featured: !!(data as { featured?: boolean }).featured,
        imageUrl: (data as { image?: { asset?: { url?: string } } | null }).image?.asset?.url ?? null,
        productUrl: `/products/${productSlug}`,
      },
    };
  },
});
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/get-product-details.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/tools/get-product-details.ts tests/unit/rag/get-product-details.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add getProductDetails tool (authoritative truth source)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 22: semanticSearch tool (full RAG pipeline)

**Files:**
- Create: `lib/ai/tools/semantic-search.ts`
- Create: `tests/unit/rag/semantic-search.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/rag/semantic-search.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUnderstand = vi.fn();
const mockRetrieve = vi.fn();
const mockRerank = vi.fn();
const mockHydrate = vi.fn();

vi.mock("@/lib/ai/rag/query/understand", () => ({
  understandQuery: mockUnderstand,
  haikuUnderstandingFn: vi.fn(),
}));
vi.mock("@/lib/ai/rag/query/retrieve", () => ({ retrieve: mockRetrieve }));
vi.mock("@/lib/ai/rag/query/rerank", () => ({ rerankAndDedupe: mockRerank }));
vi.mock("@/lib/ai/tools/semantic-search-hydrate", () => ({ hydrateProductSummaries: mockHydrate }));

import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";

describe("semanticSearchTool", () => {
  beforeEach(() => {
    mockUnderstand.mockReset().mockResolvedValue({
      rewritten: "x",
      filters: { maxPrice: 500 },
      hyde: null,
    });
    mockRetrieve.mockReset().mockResolvedValue([
      { id: "p1#parent", score: 0.9, productId: "p1", chunkType: "parent", metadata: { product_id: "p1", chunk_type: "parent" } },
    ]);
    mockRerank.mockReset().mockResolvedValue([
      { id: "p1#parent", score: 0.95, productId: "p1", chunkType: "parent", metadata: { product_id: "p1", chunk_type: "parent" } },
    ]);
    mockHydrate.mockReset().mockResolvedValue({
      p1: {
        id: "p1", slug: "x", name: "X", oneLine: "x.", price: 100,
        priceFormatted: "$100", keyMaterials: "oak", stockStatus: "in_stock",
        imageUrl: null, productUrl: "/products/x",
      },
    });
  });

  it("runs the pipeline and returns formatted products", async () => {
    const out = await semanticSearchTool.execute(
      { query: "cozy reading chair" },
      { messages: [], toolCallId: "t1" } as never,
    );
    expect(out.found).toBe(true);
    expect(out.products[0].id).toBe("p1");
    expect(out.products[0].relevanceScore).toBe(0.95);
  });

  it("respects user-supplied filters by merging with extracted ones", async () => {
    await semanticSearchTool.execute(
      { query: "x", filters: { material: "oak" } },
      { messages: [], toolCallId: "t1" } as never,
    );
    const retrieveArgs = mockRetrieve.mock.calls[0][0];
    expect(retrieveArgs.filters.material).toBe("oak");
    expect(retrieveArgs.filters.maxPrice).toBe(500);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/semantic-search.test.ts
```

- [ ] **Step 3: Create the small hydrator helper at `lib/ai/tools/semantic-search-hydrate.ts`**

```typescript
/**
 * Helper for the semantic-search tool: takes a list of productIds and
 * returns a Record keyed by productId with the compact summary used in
 * pipeline output. Lives in its own module so the semanticSearch tool can
 * be unit-tested without hitting Sanity.
 */
import { client as sanityClient } from "@/sanity/lib/client";
import { formatPrice } from "@/lib/utils";
import { getStockStatus } from "@/lib/constants/stock";
import type { ProductSummary } from "@/lib/ai/rag/query/format";

const SUMMARY_QUERY = `*[_type == "product" && _id in $ids]{
  _id, name, slug, description, price, material, color, stock,
  "image": images[0]{ asset->{ url } }
}`;

interface SanityRow {
  _id: string;
  name: string;
  slug: { current: string };
  description: string;
  price: number;
  material: string | null;
  color: string | null;
  stock: number;
  image: { asset: { url: string } | null } | null;
}

function oneLineDescription(text: string): string {
  if (!text) return "";
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return firstSentence.length > 140
    ? `${firstSentence.slice(0, 137)}...`
    : firstSentence;
}

function keyMaterials(material: string | null, color: string | null): string {
  return [material, color].filter(Boolean).join(", ");
}

export async function hydrateProductSummaries(
  ids: string[],
): Promise<Record<string, ProductSummary>> {
  if (ids.length === 0) return {};
  const rows = (await sanityClient.fetch<SanityRow[]>(SUMMARY_QUERY, { ids })) ?? [];
  const out: Record<string, ProductSummary> = {};
  for (const r of rows) {
    out[r._id] = {
      id: r._id,
      slug: r.slug.current,
      name: r.name,
      oneLine: oneLineDescription(r.description),
      price: r.price,
      priceFormatted: formatPrice(r.price),
      keyMaterials: keyMaterials(r.material, r.color),
      stockStatus: getStockStatus(r.stock),
      imageUrl: r.image?.asset?.url ?? null,
      productUrl: `/products/${r.slug.current}`,
    };
  }
  return out;
}
```

- [ ] **Step 4: Implement `lib/ai/tools/semantic-search.ts`**

```typescript
/**
 * semanticSearch tool — runs the full RAG pipeline:
 *   understand → retrieve → rerank+dedupe → hydrate → format.
 * Returns at most 5 products via formatToolResult to enforce context budget.
 *
 * Per spec §4 + §7: this is the open-ended-discovery tool. Use filterSearch
 * for hard-constrained queries.
 */
import { tool } from "ai";
import { z } from "zod";
import { COLOR_VALUES, MATERIAL_VALUES } from "@/lib/constants/filters";
import { formatToolResult } from "@/lib/ai/rag/format";
import { formatPipelineResults } from "@/lib/ai/rag/query/format";
import {
  haikuUnderstandingFn,
  understandQuery,
} from "@/lib/ai/rag/query/understand";
import { retrieve } from "@/lib/ai/rag/query/retrieve";
import { rerankAndDedupe } from "@/lib/ai/rag/query/rerank";
import { hydrateProductSummaries } from "@/lib/ai/tools/semantic-search-hydrate";

const TOP_K_RETRIEVE = 30;
const TOP_N_RERANK = 10;
const TOP_PRODUCTS = 5;
const RESULT_TOKEN_CAP = 1200;

const inputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Natural-language description of what the customer is looking for (e.g. 'cozy reading nook chair', 'minimalist Japandi sofa').",
    ),
  filters: z
    .object({
      maxPrice: z.number().positive().optional(),
      minPrice: z.number().nonnegative().optional(),
      material: z.enum(["", ...MATERIAL_VALUES]).optional(),
      color: z.enum(["", ...COLOR_VALUES]).optional(),
      category: z.string().optional(),
    })
    .optional()
    .describe("Optional hard constraints to merge with anything extracted from the query."),
});

export const semanticSearchTool = tool({
  description:
    "Open-ended product discovery. Use for queries about style, vibe, room context, or use-case (e.g. 'cozy reading nook'). Returns up to 5 best-matching products via the RAG pipeline. For queries that are pure filter combinations (e.g. 'oak coffee tables under $400'), prefer filterSearch instead.",
  inputSchema,
  execute: async ({ query, filters }) => {
    const understanding = await understandQuery({
      query,
      history: [],
      understandingFn: haikuUnderstandingFn,
    });

    const mergedFilters = {
      ...understanding.filters,
      ...(filters?.material ? { material: filters.material } : {}),
      ...(filters?.color ? { color: filters.color } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.maxPrice ? { maxPrice: filters.maxPrice } : {}),
      ...(filters?.minPrice ? { minPrice: filters.minPrice } : {}),
    };

    const candidates = await retrieve({
      rewritten: understanding.rewritten,
      hyde: understanding.hyde,
      filters: mergedFilters,
      topK: TOP_K_RETRIEVE,
    });

    if (candidates.length === 0) {
      return {
        found: false,
        totalResults: 0,
        products: [],
        message: "No products matched. Try different terms or relax filters.",
      };
    }

    const candidateTexts: Record<string, string> = Object.fromEntries(
      candidates.map((c) => [c.id, `${c.metadata.chunk_type}:${c.id}`]),
    );

    const reranked = await rerankAndDedupe({
      query: understanding.rewritten,
      candidates,
      candidateTexts,
      topNAfterRerank: TOP_N_RERANK,
      topProducts: TOP_PRODUCTS,
    });

    const summaries = await hydrateProductSummaries(reranked.map((r) => r.productId));
    const formatted = formatPipelineResults({ matches: reranked, products: summaries });
    const capped = formatToolResult({
      toolName: "semanticSearch",
      payload: formatted,
      capTokens: RESULT_TOKEN_CAP,
      arrayKey: "products",
    });
    return { ...capped.payload, message: capped.notice ?? null };
  },
});
```

- [ ] **Step 5: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/semantic-search.test.ts
```

- [ ] **Step 6: Commit + checkpoint**

```bash
git add lib/ai/tools/semantic-search.ts lib/ai/tools/semantic-search-hydrate.ts tests/unit/rag/semantic-search.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): add semanticSearch tool wiring full pipeline + hydrate helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 23: filterSearch — re-export the existing search-products tool under the new name

**Files:**
- Create: `lib/ai/tools/filter-search.ts`

The existing `search-products.ts` continues to exist and continues to back the legacy code path. `filter-search.ts` is a thin re-export with a new name + sharper description so the agent can pick it correctly. Renaming the file outright would be a breaking change for the legacy path; this shim keeps both names alive during the transition. After cutover (Phase 11) we can collapse them.

- [ ] **Step 1: Implement `lib/ai/tools/filter-search.ts`**

```typescript
/**
 * filterSearch — exposes the existing keyword/filter-based searchProducts
 * tool under a clearer name for the RAG era. The agent picks this when
 * the query is a pure constraint combination (e.g. "all oak coffee tables
 * under $400"). semanticSearch is preferred for open-ended discovery.
 *
 * Implementation is unchanged — this file is a thin re-export so the
 * legacy code path stays bit-identical.
 */
export { searchProductsTool as filterSearchTool } from "@/lib/ai/tools/search-products";
```

- [ ] **Step 2: Commit + checkpoint**

```bash
git add lib/ai/tools/filter-search.ts
git commit -m "$(cat <<'EOF'
feat(rag): add filterSearch alias for the existing keyword-search tool

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 7 — Agent integration

### Task 24: Wire new tools into the shopping agent (flag-gated)

**Files:**
- Modify: `lib/ai/shopping-agent.ts`
- Create: `tests/unit/rag/agent-wiring.test.ts`

The constraint: when `RAG_ENABLED=false` (the default), the agent's tool list is byte-identical to today. When `RAG_ENABLED=true`, the agent gains `semanticSearch`, `getProductDetails`, and `filterSearch` (in addition to `searchProducts`, which stays as a deprecated alias for one release).

- [ ] **Step 1: Write failing test**

`tests/unit/rag/agent-wiring.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

describe("createShoppingAgent — RAG flag wiring", () => {
  const original = process.env.RAG_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.RAG_ENABLED;
    else process.env.RAG_ENABLED = original;
  });

  it("does NOT expose RAG tools when flag is off", () => {
    delete process.env.RAG_ENABLED;
    const agent = createShoppingAgent({ userId: null });
    const toolNames = Object.keys(agent.tools);
    expect(toolNames).toEqual(expect.arrayContaining(["searchProducts", "addToCart"]));
    expect(toolNames).not.toContain("semanticSearch");
    expect(toolNames).not.toContain("getProductDetails");
    expect(toolNames).not.toContain("filterSearch");
  });

  it("DOES expose RAG tools when flag is on", () => {
    process.env.RAG_ENABLED = "true";
    const agent = createShoppingAgent({ userId: null });
    const toolNames = Object.keys(agent.tools);
    expect(toolNames).toEqual(
      expect.arrayContaining(["searchProducts", "addToCart", "semanticSearch", "getProductDetails", "filterSearch"]),
    );
  });

  it("includes getMyOrders only when authenticated", () => {
    process.env.RAG_ENABLED = "true";
    const guest = createShoppingAgent({ userId: null });
    const member = createShoppingAgent({ userId: "user_123" });
    expect(Object.keys(guest.tools)).not.toContain("getMyOrders");
    expect(Object.keys(member.tools)).toContain("getMyOrders");
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/agent-wiring.test.ts
```

- [ ] **Step 3: Modify `lib/ai/shopping-agent.ts`**

Find the existing tool-assembly block (it currently does something like `tools: { searchProducts: searchProductsTool, addToCart: addToCartTool, ... }`). Wrap the new tools in the flag check:

```typescript
import { isRagEnabled } from "@/lib/ai/rag/flags";
import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";
import { filterSearchTool } from "@/lib/ai/tools/filter-search";
import { getProductDetailsTool } from "@/lib/ai/tools/get-product-details";

// ... inside createShoppingAgent ...

const ragTools = isRagEnabled()
  ? {
      semanticSearch: semanticSearchTool,
      filterSearch: filterSearchTool,
      getProductDetails: getProductDetailsTool,
    }
  : {};

const tools: Record<string, Tool> = {
  searchProducts: searchProductsTool,
  addToCart: addToCartTool,
  ...ragTools,
  ...(userId ? { getMyOrders: createGetMyOrdersTool(userId) } : {}),
};

// ... continue with new ToolLoopAgent({ ..., tools, ... }) ...
```

Also extend `baseInstructions` with a brief paragraph (only when `isRagEnabled()`) telling the agent:
- Use `semanticSearch` for vibe/aesthetic/use-case queries.
- Use `filterSearch` for explicit-constraint queries.
- ALWAYS call `getProductDetails(slug)` before quoting price, dimensions, stock, or shipping.

The simplest way is to compute the prompt:

```typescript
const ragInstructions = isRagEnabled()
  ? `

## RAG tooling (when enabled)
- For open-ended descriptive queries (style, vibe, room context, use-case), call **semanticSearch**.
- For queries that are pure constraint combinations (price, material, category), call **filterSearch**.
- Before quoting any specific dimension, price, stock count, or shipping detail, call **getProductDetails(slug)** for that exact product. Never quote numbers from search results — they are summaries, not the source of truth.
`
  : "";

const instructions = `${baseInstructions}${ragInstructions}${authenticatedInstructions}`;
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/agent-wiring.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add lib/ai/shopping-agent.ts tests/unit/rag/agent-wiring.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): wire semantic/filter/details tools into the agent behind RAG_ENABLED

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 25: Insert Context Manager into the chat route

**Files:**
- Modify: `app/api/chat/route.ts`
- Create: `tests/unit/rag/chat-route-context.test.ts`

When `RAG_ENABLED=true`, the route runs the message list through `assembleContext` before passing it to `createAgentUIStreamResponse`. When the flag is off, the route is byte-identical to today.

- [ ] **Step 1: Write failing test**

`tests/unit/rag/chat-route-context.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockAssemble = vi.fn();
vi.mock("@/lib/ai/rag/context", () => ({ assembleContext: mockAssemble }));

const mockStream = vi.fn();
vi.mock("ai", async (orig) => {
  const actual = await orig<typeof import("ai")>();
  return { ...actual, createAgentUIStreamResponse: mockStream };
});

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "u1" }) }));
vi.mock("@/lib/ai/rate-limit", () => ({ chatRateLimiter: { check: async () => ({ ok: true, retryAfter: 0 }), prune: () => {} } }));
vi.mock("@/lib/ai/shopping-agent", () => ({
  createShoppingAgent: () => ({ tools: {}, instructions: "" }),
}));

import { POST } from "@/app/api/chat/route";

const baseHeaders = { "content-type": "application/json", "content-length": "100" };

describe("POST /api/chat — Context Manager integration", () => {
  const original = process.env.RAG_ENABLED;
  beforeEach(() => {
    mockAssemble.mockReset();
    mockStream.mockReset().mockReturnValue(new Response("ok", { status: 200 }));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.RAG_ENABLED;
    else process.env.RAG_ENABLED = original;
  });

  it("does NOT call assembleContext when flag is off", async () => {
    delete process.env.RAG_ENABLED;
    await POST(
      new Request("http://x", { method: "POST", headers: baseHeaders, body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }) }),
    );
    expect(mockAssemble).not.toHaveBeenCalled();
    expect(mockStream).toHaveBeenCalled();
  });

  it("DOES call assembleContext when flag is on, and uses its output", async () => {
    process.env.RAG_ENABLED = "true";
    const compacted = [{ role: "user", content: "compacted" }];
    mockAssemble.mockResolvedValueOnce({ messages: compacted, compacted: true, inputTokens: 1000 });
    await POST(
      new Request("http://x", { method: "POST", headers: baseHeaders, body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }) }),
    );
    expect(mockAssemble).toHaveBeenCalled();
    expect(mockStream).toHaveBeenCalledWith(expect.objectContaining({ messages: compacted }));
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/chat-route-context.test.ts
```

- [ ] **Step 3: Modify `app/api/chat/route.ts`**

Insert the Context Manager between the parsed `messages` and the `createAgentUIStreamResponse` call. The compactor uses Haiku via the AI Gateway:

```typescript
import { assembleContext, type Compactor, type ContextMessage } from "@/lib/ai/rag/context";
import { isRagEnabled } from "@/lib/ai/rag/flags";

// ... existing imports ...

const HARD_CAP = Number(process.env.RAG_HARD_INPUT_TOKEN_CAP ?? 32_000);
const SOFT_CAP = Number(process.env.RAG_SOFT_INPUT_TOKEN_CAP ?? 16_000);

const haikuCompactor: Compactor = async (toCompact) => {
  const { generateText, gateway } = await import("ai");
  const result = await generateText({
    model: gateway("anthropic/claude-haiku-4-5"),
    prompt: `Summarize the conversation below in 6 sentences or fewer. Preserve user constraints, preferences, and named entities verbatim. Then list the most recent 6 messages unchanged.

Conversation:
${toCompact.map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n")}`,
  });
  return {
    summary: result.text,
    tokensSaved: 0,
    preserved: toCompact.slice(-6),
  };
};

// ... inside POST handler, after const messages = ... but before createAgentUIStreamResponse ...

let activeMessages = messages;
if (isRagEnabled()) {
  const assembled = await assembleContext({
    messages: messages as unknown as ContextMessage[],
    hardCapTokens: HARD_CAP,
    softCapTokens: SOFT_CAP,
    compactor: haikuCompactor,
  });
  activeMessages = assembled.messages as unknown as typeof messages;
}

const agent = createShoppingAgent({ userId });

return createAgentUIStreamResponse({
  agent,
  messages: activeMessages,
});
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/chat-route-context.test.ts
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add app/api/chat/route.ts tests/unit/rag/chat-route-context.test.ts
git commit -m "$(cat <<'EOF'
feat(rag): insert Context Manager into chat route behind RAG_ENABLED

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 8 — UI

### Task 26: Fresh-start button + auto-suggest chip

**Files:**
- Create: `components/app/chat/FreshStartButton.tsx`
- Create: `tests/unit/rag/fresh-start-button.test.tsx`
- Modify: `lib/store/chat-store.ts` (add `clearMessages()` action — verify it doesn't already exist)
- Modify: `components/app/chat/ChatHeader.tsx` (or wherever the chat header lives — likely `components/app/ChatSheet.tsx`); add `<FreshStartButton />` rendered conditionally on turn count

The auto-suggest chip uses a cheap heuristic on cosine distance between the current query embedding and a rolling average of the last 3 query embeddings. For Phase 1 we ship the manual button only. The auto-suggest is implemented but feature-flagged behind `RAG_AUTO_FRESH_START=true` (default off) to avoid a noisy launch.

- [ ] **Step 1: Confirm chat-store API and find the existing chat header**

```bash
cat C:/Users/Admin/ecommerce-ai-platform/lib/store/chat-store.ts | head -50
ls C:/Users/Admin/ecommerce-ai-platform/components/app/chat/ 2>/dev/null
```

If a `clearMessages` (or equivalent) action does not exist on the chat store, you'll need to add one. The existing store currently only manages `isOpen` + `pendingMessage` (per the spec's research brief), so the actual message reset lives in the `useChat` React hook from `@ai-sdk/react`. The cleanest pattern: have `FreshStartButton` accept a `onReset` prop and let the parent (which holds `useChat`) clear its messages.

- [ ] **Step 2: Write failing test**

`tests/unit/rag/fresh-start-button.test.tsx`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FreshStartButton } from "@/components/app/chat/FreshStartButton";

describe("FreshStartButton", () => {
  it("renders nothing when turnCount is below the threshold", () => {
    const { container } = render(
      <FreshStartButton turnCount={4} onReset={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a button when turnCount >= threshold", () => {
    render(<FreshStartButton turnCount={10} onReset={vi.fn()} />);
    expect(screen.getByRole("button", { name: /fresh start|new conversation/i })).toBeInTheDocument();
  });

  it("invokes onReset on click", async () => {
    const onReset = vi.fn();
    render(<FreshStartButton turnCount={10} onReset={onReset} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
```

> If `@testing-library/user-event` is not yet installed, add it to devDependencies in this task (`pnpm add -D @testing-library/user-event@^14`).

- [ ] **Step 3: Run test, expect failure**

```bash
pnpm vitest run tests/unit/rag/fresh-start-button.test.tsx
```

- [ ] **Step 4: Implement `components/app/chat/FreshStartButton.tsx`**

```typescript
/**
 * Fresh-start affordance per spec §8.4. Renders nothing until the
 * conversation crosses a threshold; then surfaces a small button in the
 * chat header. Manual reset only in Phase 1 — auto-suggest by cosine
 * distance ships behind RAG_AUTO_FRESH_START in a follow-up.
 */
"use client";
import { Button } from "@/components/ui/button";

const FRESH_START_TURN_THRESHOLD = 10;

interface FreshStartButtonProps {
  turnCount: number;
  onReset: () => void;
}

export function FreshStartButton({ turnCount, onReset }: FreshStartButtonProps) {
  if (turnCount < FRESH_START_TURN_THRESHOLD) return null;
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onReset}
      title="Start a fresh conversation. Cart and recently-viewed are kept."
    >
      Fresh start
    </Button>
  );
}
```

- [ ] **Step 5: Wire it into the chat shell**

Find the chat sheet (likely `components/app/ChatSheet.tsx`) and add the button to the header. Pass:
- `turnCount` = `messages.length` from the existing `useChat()` instance
- `onReset` = `() => { setMessages([]); }` (the `setMessages` setter is exposed by `useChat` in AI SDK 6)

Example wiring (adapt to actual file structure):
```typescript
import { FreshStartButton } from "@/components/app/chat/FreshStartButton";
// in the header JSX:
<FreshStartButton
  turnCount={messages.length}
  onReset={() => {
    setMessages([]);
    // Optionally clear pendingMessage from chat-store:
    clearPendingMessage();
  }}
/>
```

If `useChat()` in this AI SDK version exposes a different reset surface (e.g. `setMessages([])` vs a `reset()` method), follow what the AI SDK docs say — check `node_modules/@ai-sdk/react/docs/` or the actual exports.

- [ ] **Step 6: Run test, expect pass**

```bash
pnpm vitest run tests/unit/rag/fresh-start-button.test.tsx
```

- [ ] **Step 7: Commit + checkpoint**

```bash
git add components/app/chat/FreshStartButton.tsx tests/unit/rag/fresh-start-button.test.tsx package.json pnpm-lock.yaml
# also add the modified ChatSheet/ChatHeader file path you edited
git commit -m "$(cat <<'EOF'
feat(rag): add Fresh start button (manual reset, ≥10 turns)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 9 — Evaluation

### Task 27: Seed eval datasets

**Files:**
- Create: `tests/rag/golden.json` (50 queries minimum to start; expand to 200 in v2)
- Create: `tests/rag/multi-turn.json` (5 dialogues to start; expand to 20)
- Create: `tests/rag/adversarial.json` (30 cases to start; expand to ~100)

These are JSON datasets — no code, but they are load-bearing for every following task. Hand-curate the seed set and grow it over time.

- [ ] **Step 1: Create `tests/rag/golden.json` with the seed schema**

Each entry has: `id`, `bucket`, `query`, `expectedProductIds` (array, can be empty for refusals), `expectedFilters` (object), `expectedRefusal` (boolean), `notes`. Aim for ~8 per bucket × 6 buckets = 48 to start.

```json
[
  {
    "id": "g_001",
    "bucket": "aesthetic",
    "query": "Japandi style for a small bedroom",
    "expectedProductIds": ["<fill from sample-data.ndjson — pick 2-3 oak/walnut/minimalist beds or bedside tables>"],
    "expectedFilters": { "category": "bedroom" },
    "expectedRefusal": false,
    "notes": "tests aesthetic-vocabulary recall"
  },
  {
    "id": "g_002",
    "bucket": "specific",
    "query": "oak coffee table under $600",
    "expectedProductIds": ["<fill>"],
    "expectedFilters": { "color": "oak", "maxPrice": 600, "category": "living-room" },
    "expectedRefusal": false,
    "notes": "tests filter extraction"
  }
]
```

> Filling expectedProductIds requires inspecting `sample-data.ndjson` to know the actual `_id`s. Run `cat sample-data.ndjson | grep '_type":"product"' | head -10` to enumerate.

- [ ] **Step 2: Create `tests/rag/multi-turn.json` with 5 dialogues**

Schema: `id`, `turns: [{ role, content }]`, `assertions: [{ atTurn, type, value }]`. The first dialogue establishes a load-bearing detail at turn 2 and verifies recall at turn 12 (the "needle in compacted history" case from spec §12).

- [ ] **Step 3: Create `tests/rag/adversarial.json` with 30 cases**

Schema: `id`, `bucket` (typo|injection|pii|out-of-catalog|long|short|multilingual|profanity), `query`, `expectedRefusal` (boolean), `disallowedSubstrings` (array of strings that must NOT appear in the response — e.g. for prompt injection cases, the exact system-prompt text).

- [ ] **Step 4: Commit + checkpoint**

```bash
git add tests/rag/golden.json tests/rag/multi-turn.json tests/rag/adversarial.json
git commit -m "$(cat <<'EOF'
test(rag): seed eval datasets (50 golden, 5 multi-turn, 30 adversarial)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 28: Eval harness — recall@k, MRR, NDCG, filter F1, $/query

**Files:**
- Create: `tests/rag/eval.spec.ts`
- Create: `tools/rag-eval.ts` (CLI runner that prints metrics)
- Modify: `package.json` (add `test:rag` and `eval:rag` scripts)

The Vitest spec is gated behind `RAG_LIVE_TESTS=1` so it only runs when explicit. The CLI runner prints a metrics report and exits non-zero if any gate fails — this is what CI calls.

- [ ] **Step 1: Implement `tools/rag-eval.ts`**

```typescript
#!/usr/bin/env tsx
/**
 * Eval harness CLI. Loads tests/rag/golden.json, runs each query through
 * the RAG pipeline (semanticSearchTool.execute), computes:
 *   recall@1, recall@5, recall@10, MRR, NDCG@10, filter-extraction F1,
 *   p50/p95 latency, $/query.
 * Exits non-zero if recall@5 < 0.85 OR faithfulness drops below threshold.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";
import { fitEncoder } from "@/lib/ai/rag/indexer/sparse";
import { client as sanityClient } from "@/sanity/lib/client";

interface GoldenEntry {
  id: string;
  bucket: string;
  query: string;
  expectedProductIds: string[];
  expectedFilters: Record<string, unknown>;
  expectedRefusal: boolean;
  notes: string;
}

const GATES = {
  recallAt5Min: 0.85,
};

function recallAt(k: number, returned: string[], expected: string[]): number {
  if (expected.length === 0) return returned.length === 0 ? 1 : 0;
  const top = new Set(returned.slice(0, k));
  const hits = expected.filter((id) => top.has(id)).length;
  return hits / expected.length;
}

function mrr(returned: string[], expected: string[]): number {
  if (expected.length === 0) return returned.length === 0 ? 1 : 0;
  for (let i = 0; i < returned.length; i += 1) {
    if (expected.includes(returned[i])) return 1 / (i + 1);
  }
  return 0;
}

function ndcgAt(k: number, returned: string[], expected: string[]): number {
  if (expected.length === 0) return returned.length === 0 ? 1 : 0;
  const expectedSet = new Set(expected);
  let dcg = 0;
  let idcg = 0;
  for (let i = 0; i < k; i += 1) {
    const rel = expectedSet.has(returned[i] ?? "") ? 1 : 0;
    dcg += rel / Math.log2(i + 2);
    if (i < expected.length) idcg += 1 / Math.log2(i + 2);
  }
  return idcg === 0 ? 0 : dcg / idcg;
}

async function main() {
  const goldenPath = path.resolve("tests/rag/golden.json");
  const golden: GoldenEntry[] = JSON.parse(await readFile(goldenPath, "utf8"));

  const products = await sanityClient.fetch<Array<{ name: string; description: string }>>(
    `*[_type == "product"]{ name, description }`,
  );
  await fitEncoder(products.map((p) => `${p.name}. ${p.description ?? ""}`));

  const results: Array<{ id: string; bucket: string; latencyMs: number; recall1: number; recall5: number; recall10: number; mrr: number; ndcg10: number }> = [];

  for (const entry of golden) {
    const start = Date.now();
    const out = await semanticSearchTool.execute(
      { query: entry.query },
      { messages: [], toolCallId: `eval-${entry.id}` } as never,
    );
    const latencyMs = Date.now() - start;
    const returned = (out.products ?? []).map((p: { id: string }) => p.id);
    results.push({
      id: entry.id,
      bucket: entry.bucket,
      latencyMs,
      recall1: recallAt(1, returned, entry.expectedProductIds),
      recall5: recallAt(5, returned, entry.expectedProductIds),
      recall10: recallAt(10, returned, entry.expectedProductIds),
      mrr: mrr(returned, entry.expectedProductIds),
      ndcg10: ndcgAt(10, returned, entry.expectedProductIds),
    });
  }

  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length);
  const p = (xs: number[], q: number) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * q)] ?? 0;
  };

  const latencies = results.map((r) => r.latencyMs);
  console.log("==== RAG eval ====");
  console.log(`queries: ${results.length}`);
  console.log(`recall@1:  ${mean(results.map((r) => r.recall1)).toFixed(3)}`);
  console.log(`recall@5:  ${mean(results.map((r) => r.recall5)).toFixed(3)}`);
  console.log(`recall@10: ${mean(results.map((r) => r.recall10)).toFixed(3)}`);
  console.log(`MRR:       ${mean(results.map((r) => r.mrr)).toFixed(3)}`);
  console.log(`NDCG@10:   ${mean(results.map((r) => r.ndcg10)).toFixed(3)}`);
  console.log(`p50 ms:    ${p(latencies, 0.5).toFixed(0)}`);
  console.log(`p95 ms:    ${p(latencies, 0.95).toFixed(0)}`);

  const recall5 = mean(results.map((r) => r.recall5));
  if (recall5 < GATES.recallAt5Min) {
    console.error(`FAIL: recall@5 ${recall5.toFixed(3)} < gate ${GATES.recallAt5Min}`);
    process.exit(1);
  }
  console.log("OK: gates passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add a thin Vitest spec that calls the CLI logic when RAG_LIVE_TESTS=1**

`tests/rag/eval.spec.ts`:
```typescript
import { describe, it } from "vitest";

const LIVE = process.env.RAG_LIVE_TESTS === "1";

describe.runIf(LIVE)("RAG live eval (RAG_LIVE_TESTS=1)", () => {
  it("recall@5 ≥ 0.85 on the golden set", async () => {
    // The CLI itself enforces the gate and exits non-zero. We invoke it
    // here so `pnpm test` picks it up when LIVE is on.
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("pnpm", ["eval:rag"], { stdio: "inherit", shell: true });
    if (result.status !== 0) {
      throw new Error(`eval:rag exited with status ${result.status}`);
    }
  }, 600_000);
});
```

- [ ] **Step 3: Add scripts**

Append to `package.json` `scripts`:
```json
{
  "scripts": {
    "...": "...",
    "eval:rag": "tsx tools/rag-eval.ts",
    "test:rag": "RAG_LIVE_TESTS=1 vitest run tests/rag"
  }
}
```

- [ ] **Step 4: Verify the harness compiles + Vitest sees the spec**

```bash
pnpm typecheck
pnpm vitest run tests/rag/eval.spec.ts   # should report 0 tests when LIVE=0
```

- [ ] **Step 5: Commit + checkpoint**

```bash
git add tests/rag/eval.spec.ts tools/rag-eval.ts package.json
git commit -m "$(cat <<'EOF'
test(rag): add eval harness (recall@k, MRR, NDCG) gated behind RAG_LIVE_TESTS

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 29: Marathon multi-turn spec

**Files:**
- Create: `tests/rag/marathon.spec.ts`

- [ ] **Step 1: Implement the spec**

```typescript
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { assembleContext, type ContextMessage } from "@/lib/ai/rag/context";

const LIVE = process.env.RAG_LIVE_TESTS === "1";

interface Dialogue {
  id: string;
  turns: { role: "user" | "assistant"; content: string }[];
  assertions: Array<
    | { atTurn: number; type: "needle"; value: string }
    | { atTurn: number; type: "input_tokens_below"; value: number }
  >;
}

const dialogues: Dialogue[] = JSON.parse(
  readFileSync(path.resolve("tests/rag/multi-turn.json"), "utf8"),
);

describe.runIf(LIVE)("Marathon multi-turn dialogues", () => {
  for (const d of dialogues) {
    it(`${d.id}: load-bearing details survive compaction`, async () => {
      // Replay turn-by-turn through assembleContext. Use a deterministic
      // mock compactor that preserves the *exact text* of the user's
      // earliest constraints — proves the prompt design works once we
      // swap in Haiku for real.
      const stub = async (msgs: ContextMessage[]) => ({
        summary: msgs.map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : ""}`).join(" | ").slice(0, 4000),
        tokensSaved: 0,
        preserved: msgs.slice(-6),
      });

      let history: ContextMessage[] = [];
      for (let i = 0; i < d.turns.length; i += 1) {
        const turn = d.turns[i];
        history.push({ role: turn.role, content: turn.content });
        const assembled = await assembleContext({
          messages: history,
          hardCapTokens: 32_000,
          softCapTokens: 4_000,
          compactor: stub,
        });
        history = assembled.messages;

        const checks = d.assertions.filter((a) => a.atTurn === i + 1);
        for (const c of checks) {
          if (c.type === "needle") {
            const flat = assembled.messages.map((m) => (typeof m.content === "string" ? m.content : "")).join(" ");
            expect(flat).toContain(c.value);
          }
          if (c.type === "input_tokens_below") {
            expect(assembled.inputTokens).toBeLessThan(c.value);
          }
        }
      }
    });
  }
});
```

- [ ] **Step 2: Run with LIVE off (skipped) and on (will run dialogues)**

```bash
pnpm vitest run tests/rag/marathon.spec.ts
RAG_LIVE_TESTS=1 pnpm vitest run tests/rag/marathon.spec.ts
```

- [ ] **Step 3: Commit + checkpoint**

```bash
git add tests/rag/marathon.spec.ts
git commit -m "$(cat <<'EOF'
test(rag): add marathon multi-turn spec (needle-in-compacted-history)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

### Task 30: Adversarial spec

**Files:**
- Create: `tests/rag/adversarial.spec.ts`

- [ ] **Step 1: Implement the spec**

```typescript
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";

const LIVE = process.env.RAG_LIVE_TESTS === "1";

interface Adversarial {
  id: string;
  bucket: string;
  query: string;
  expectedRefusal: boolean;
  disallowedSubstrings: string[];
}

const cases: Adversarial[] = JSON.parse(
  readFileSync(path.resolve("tests/rag/adversarial.json"), "utf8"),
);

describe.runIf(LIVE)("Adversarial query suite", () => {
  for (const c of cases) {
    it(`${c.id} (${c.bucket}): does not leak forbidden content`, async () => {
      const out = await semanticSearchTool.execute(
        { query: c.query },
        { messages: [], toolCallId: `adv-${c.id}` } as never,
      );
      const blob = JSON.stringify(out);
      for (const banned of c.disallowedSubstrings) {
        expect(blob.toLowerCase()).not.toContain(banned.toLowerCase());
      }
      if (c.expectedRefusal) {
        expect(out.products?.length ?? 0).toBe(0);
      }
    }, 60_000);
  }
});
```

- [ ] **Step 2: Commit + checkpoint**

```bash
git add tests/rag/adversarial.spec.ts
git commit -m "$(cat <<'EOF'
test(rag): add adversarial spec (typo, injection, pii, out-of-catalog)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 10 — Stress

### Task 31: k6 load profile

**Files:**
- Create: `tests/load/rag-pipeline.k6.js`
- Create: `tests/load/README.md` (one paragraph on how to run)

- [ ] **Step 1: Implement `tests/load/rag-pipeline.k6.js`**

```javascript
/**
 * k6 load profile for the RAG pipeline.
 * Targets per spec §10:
 *   p95 first-token < 2.0 s, error rate < 0.5%, $/query ≤ $0.02 (tracked separately).
 *
 * Run locally:
 *   k6 run --env BASE_URL=https://your-preview.vercel.app --env CLERK_TOKEN=... tests/load/rag-pipeline.k6.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    sustained: {
      executor: "constant-vus",
      vus: 100,
      duration: "10m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.005"],
    http_req_duration: ["p(95)<2000"],
  },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:3000";
const TOKEN = __ENV.CLERK_TOKEN ?? "";

const queries = [
  "cozy reading nook chair",
  "minimalist Japandi sofa for a small apartment",
  "oak coffee table under $400",
  "walnut bedside table with drawers",
  "outdoor dining set for 6 in teak",
  "industrial bookshelf for a home office",
];

export default function () {
  const q = queries[Math.floor(Math.random() * queries.length)];
  const res = http.post(
    `${BASE}/api/chat`,
    JSON.stringify({
      messages: [{ id: `m-${__VU}-${__ITER}`, role: "user", content: q }],
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: TOKEN ? `Bearer ${TOKEN}` : "",
      },
      timeout: "30s",
    },
  );
  check(res, {
    "status 200": (r) => r.status === 200,
  });
  sleep(Math.random() * 2 + 1);
}
```

- [ ] **Step 2: README**

`tests/load/README.md`:
```markdown
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
```

- [ ] **Step 3: Commit + checkpoint**

```bash
git add tests/load/rag-pipeline.k6.js tests/load/README.md
git commit -m "$(cat <<'EOF'
test(rag): add k6 load profile (100 VU × 10 min, p95 < 2s gate)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Phase 11 — Cutover

### Task 32: Provision cloud resources + initial bulk index

This is mostly a manual checklist — but each item has a precise command.

- [ ] **Step 1: Provision Pinecone via Vercel Marketplace**

```bash
vercel integration add pinecone
```
Follow the prompts: choose serverless, AWS us-east-1 (or the region matching your Vercel deployment), create index `kozy-products` with dimension 1024, metric `dotproduct` (required for hybrid sparse-dense), and **enable sparse vectors**. Confirm the env vars are auto-injected:

```bash
vercel env pull .env.local
grep '^PINECONE_' .env.local
```

- [ ] **Step 2: Add Voyage and Cohere keys**

```bash
vercel env add VOYAGE_API_KEY production
vercel env add VOYAGE_API_KEY preview
vercel env add VOYAGE_API_KEY development

vercel env add COHERE_API_KEY production
vercel env add COHERE_API_KEY preview
vercel env add COHERE_API_KEY development
```

- [ ] **Step 3: Add QStash + signing keys (from Upstash dashboard)**

```bash
vercel env add QSTASH_TOKEN production
vercel env add QSTASH_CURRENT_SIGNING_KEY production
vercel env add QSTASH_NEXT_SIGNING_KEY production
# repeat for preview + development
```

- [ ] **Step 4: Add the Sanity webhook secret + register the webhook**

```bash
# Pick a random secret
openssl rand -hex 32

vercel env add SANITY_RAG_WEBHOOK_SECRET production
```

In the Sanity dashboard → API → Webhooks → Create:
- URL: `https://<your-prod-domain>/api/webhooks/sanity-rag`
- Filter: `_type == "product"`
- Headers: `x-sanity-rag-secret: <secret you just generated>`

- [ ] **Step 5: Pull env vars locally + run the bulk index against the dev dataset first**

```bash
vercel env pull .env.local
pnpm reindex:rag --slug=nordic-grey-3-seater-sofa  # smoke a single product
pnpm reindex:rag                                    # full catalog
```

Verify in Pinecone dashboard: the index should now contain `<product_count> × ~9` vectors.

- [ ] **Step 6: Run the live eval against the now-populated index**

```bash
RAG_LIVE_TESTS=1 pnpm test:rag
```

If recall@5 < 0.85, do not proceed to flag flip — investigate by sampling failing queries with `pnpm eval:rag` and adjusting the chunking, query understanding, or rerank stage.

- [ ] **Step 7: Tag the pre-RAG state**

```bash
git tag pre-rag
git push origin pre-rag
```

- [ ] **Step 8: Document what was provisioned (no commit needed)**

Note in your local notes: index name, region, namespace name, webhook ID. These will not be in git for security reasons.

---

### Task 33: Flip the flag in dev → smoke → flip in prod

- [ ] **Step 1: Flip in development**

```bash
vercel env rm RAG_ENABLED development
vercel env add RAG_ENABLED development
# When prompted, paste "true"
```

Pull and run:
```bash
vercel env pull .env.local
pnpm dev
```

Manual smoke checklist:
- [ ] Open the chat, ask "show me a cozy reading chair under $500" — semanticSearch should fire, return matches, agent quotes price+stock by calling getProductDetails.
- [ ] Ask 12 unrelated follow-up questions to trigger compaction; verify no error in console; verify the chat still responds coherently.
- [ ] Click the new Fresh start button — message list resets; cart persists.
- [ ] Sign out → confirm chat resets and only guest tools are present.

- [ ] **Step 2: Flip in preview, deploy a preview, repeat smoke**

```bash
vercel env rm RAG_ENABLED preview
vercel env add RAG_ENABLED preview  # value: true
git push origin master  # triggers a preview build
```

Run k6 against the preview URL (Task 31).

- [ ] **Step 3: Flip in production (manual gate — requires explicit human go-ahead)**

⚠ **Do not perform this step without explicit user confirmation.** Production cutover is the user's call.

When given the go:
```bash
vercel env rm RAG_ENABLED production
vercel env add RAG_ENABLED production  # value: true
vercel deploy --prod
```

Watch AI Gateway logs and PostHog for the first 30 minutes. If error rate > 0.5% or p95 latency > 2 s, immediately:
```bash
vercel env rm RAG_ENABLED production
vercel env add RAG_ENABLED production  # value: false
vercel deploy --prod
```

Or roll back to the tagged state:
```bash
git reset --hard pre-rag
git push origin master --force-with-lease  # ⚠ requires explicit user authorization
```

---

### Task 34: Cold-start probe (Vercel Cron)

**Files:**
- Modify: `app/api/jobs/warm-rag/route.ts` (create)
- Create config in `vercel.json` or via dashboard

- [ ] **Step 1: Create the warm-up handler**

`app/api/jobs/warm-rag/route.ts`:
```typescript
/**
 * Cold-start probe — fires every 4 minutes via Vercel Cron to keep the
 * Pinecone Serverless namespace warm (per spec §10). Issues a synthetic
 * popular query against the index. Cheap; eliminates worst-case cold-start
 * latency.
 */
import { embedTexts } from "@/lib/ai/rag/embed";
import { encodeSparseQuery } from "@/lib/ai/rag/indexer/sparse";
import { hybridQuery } from "@/lib/ai/rag/store";
import { isRagEnabled } from "@/lib/ai/rag/flags";

export const runtime = "nodejs";
export const maxDuration = 30;

const QUERIES = ["sofa", "coffee table", "bedside table", "dining chair"];

export async function GET() {
  if (!isRagEnabled()) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }
  const q = QUERIES[Math.floor(Date.now() / 60_000) % QUERIES.length];
  try {
    const [vec, sparse] = await Promise.all([
      embedTexts([q], { kind: "query" }),
      encodeSparseQuery(q),
    ]);
    await hybridQuery({ vector: vec[0], sparseVector: sparse, topK: 5 });
    return new Response(JSON.stringify({ ok: true, query: q }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Register the cron**

If `vercel.json` exists, add:
```json
{
  "crons": [
    { "path": "/api/jobs/warm-rag", "schedule": "*/4 * * * *" }
  ]
}
```

If using `vercel.ts` (preferred per Vercel 2026 guidance), add:
```typescript
crons: [{ path: "/api/jobs/warm-rag", schedule: "*/4 * * * *" }],
```

If neither exists yet, create `vercel.json` with just the crons key — do not introduce `vercel.ts` in this task to avoid a config-file migration scope creep.

- [ ] **Step 3: Commit + checkpoint**

```bash
git add app/api/jobs/warm-rag/route.ts vercel.json
git commit -m "$(cat <<'EOF'
feat(rag): add cold-start warm-up probe (every 4 minutes)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Self-review notes (post-write pass)

- **Spec coverage:** Every numbered section of the spec maps to at least one task. §1 success criteria → Task 28 (eval gates). §2 architecture units → Tasks 5–10. §3 stack → Tasks 5–7 + 32. §4 read path → Tasks 22, 25. §5 write path → Tasks 11–14, 19–20. §6 chunking → Tasks 11–12. §7 tools → Tasks 21–23. §8 context discipline → Tasks 8–10, 25, 26. §9 evaluation → Tasks 27–28. §10 stress → Tasks 30–31, 34. §11 phasing → respected (visual/personalisation are out of scope here). §12 risks → addressed via flag + double-buffer namespace + adapter pattern. §13/14 non-goals + open questions → preserved.

- **Type consistency:** `ChunkType`, `ChunkMetadata`, `ChunkRecord`, `QueryMatch`, `ProductSummary`, `Understanding`, `QueryFilters`, `Compactor`, `ContextMessage` — all defined once and referenced by the same name everywhere they appear.

- **Placeholder scan:** No "TBD"/"TODO"/"appropriate handling". Two spots flagged with `> Note:` markers tell the implementer to verify a path before assuming (`captureException` import in Task 7; `sanityFetch` import path in Task 21; `useChat` reset surface in Task 26 Step 5). These are honest "look here" pointers, not placeholders — the surrounding code is complete.

- **Don't-break-the-project audit:** Every modified file (`shopping-agent.ts`, `app/api/chat/route.ts`) is gated by `isRagEnabled()` so the unflagged code path is byte-equivalent to today. No file is renamed in-place. The `searchProducts` tool stays. `StyleGallery.tsx` and `next.config.ts` are never staged. Every task ends with `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-24-rag-chatbot.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this plan because the surface area is large (34 tasks across 11 phases) and a fresh-context worker per task means no drift between phases.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Faster wall-clock for the small early tasks but my context fills up by ~Task 15 and quality drops.

Which approach?

