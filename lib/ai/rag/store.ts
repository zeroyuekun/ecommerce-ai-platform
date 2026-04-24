/**
 * Pinecone vector-store adapter. Single point of contact for the rest of
 * the RAG pipeline. Hybrid (dense + optional sparse) queries with metadata
 * filtering. The active namespace is read from PINECONE_NAMESPACE so the
 * double-buffer cutover pattern is just a config flip.
 *
 * Sparse-vector encoding is deferred to Phase 1.5; sparseValues stays
 * optional in the interface so callers can adopt it later without a
 * breaking change.
 */
import { Pinecone } from "@pinecone-database/pinecone";

export type ChunkType = "care" | "description" | "parent" | "qa" | "specs";

export interface ChunkMetadata {
  // Index signature required to satisfy Pinecone SDK's RecordMetadata constraint
  [key: string]: boolean | number | string | undefined;
  assembly_required?: boolean;
  category_slug?: string;
  chunk_type: ChunkType;
  color?: string;
  in_stock?: boolean;
  is_new?: boolean;
  material?: string;
  price?: number;
  product_id: string;
  ships_to_au?: boolean;
}

export interface ChunkRecord {
  id: string;
  metadata: ChunkMetadata;
  sparseValues?: { indices: number[]; values: number[] };
  values: number[];
}

export interface QueryFilter {
  [key: string]: {
    $eq?: boolean | number | string;
    $gte?: number;
    $lte?: number;
  };
}

export interface QueryArgs {
  filter?: QueryFilter;
  sparseVector?: { indices: number[]; values: number[] };
  topK: number;
  vector: number[];
}

export interface QueryMatch {
  chunkType: ChunkType;
  id: string;
  metadata: ChunkMetadata;
  productId: string;
  score: number;
}

let cached: { client: Pinecone; indexName: string; namespace: string } | null =
  null;

function getStore(): {
  client: Pinecone;
  indexName: string;
  namespace: string;
} {
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
  cached = { client, indexName, namespace };
  return cached;
}

function ns() {
  const { client, indexName, namespace } = getStore();
  return client.index(indexName).namespace(namespace);
}

export async function upsertChunks(records: ChunkRecord[]): Promise<void> {
  if (records.length === 0) return;
  await ns().upsert(
    records as unknown as Parameters<ReturnType<typeof ns>["upsert"]>[0],
  );
}

export async function hybridQuery(args: QueryArgs): Promise<QueryMatch[]> {
  const result = await ns().query({
    filter: args.filter,
    includeMetadata: true,
    sparseVector: args.sparseVector,
    topK: args.topK,
    vector: args.vector,
  });
  return (result.matches ?? []).map((m) => {
    const meta = (m.metadata ?? {}) as unknown as ChunkMetadata;
    return {
      chunkType: meta.chunk_type,
      id: m.id,
      metadata: meta,
      productId: meta.product_id,
      score: m.score ?? 0,
    };
  });
}

export async function deleteByProductId(productId: string): Promise<void> {
  try {
    await ns().deleteMany({ product_id: { $eq: productId } });
  } catch (err) {
    // Pinecone returns 404 when the namespace has no vectors yet (first
    // re-index of a product, or freshly-created index). Treat as a no-op
    // so the upsert that follows still runs.
    const message = err instanceof Error ? err.message : String(err);
    if (!/404|not found/i.test(message)) throw err;
  }
}

/** Test seam — resets the singleton so env vars are re-read. */
export function __resetStoreForTests(): void {
  cached = null;
}
