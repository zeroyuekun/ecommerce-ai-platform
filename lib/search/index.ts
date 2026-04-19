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
