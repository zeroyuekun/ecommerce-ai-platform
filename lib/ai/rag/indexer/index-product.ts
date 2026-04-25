/**
 * Index orchestrator: chunks a product, optionally augments with synthetic
 * Q&A, embeds every chunk via Voyage, and upserts the bundle to Pinecone.
 * Idempotent: deletes any existing chunks for the same product_id before
 * upserting.
 *
 * Phase 1: dense-only retrieval. Sparse encoding (BM25) is deferred to
 * Phase 1.5 — the store adapter keeps `sparseValues` optional so this
 * upgrade is purely additive.
 */
import { embedTexts } from "@/lib/ai/rag/embed";
import {
  type ChunkableProduct,
  chunkProduct,
} from "@/lib/ai/rag/indexer/chunk";
import {
  generateSyntheticQa,
  haikuQaGenerator,
  type QaGenerator,
} from "@/lib/ai/rag/indexer/synthetic-qa";
import {
  type ChunkRecord,
  deleteByProductId,
  upsertChunks,
} from "@/lib/ai/rag/store";

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
  const denseVectors = await embedTexts(texts, { kind: "document" });

  const records: ChunkRecord[] = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: denseVectors[i],
    // Persist the chunk text alongside the vector so the reranker can score
    // on real document content (C3 fix, 2026-04-25). Cap at 8KB defensively
    // to stay well below Pinecone's 40KB metadata limit even if a future
    // chunker accidentally produces a very long body.
    metadata: { ...chunk.metadata, text: chunk.text.slice(0, 8000) },
  }));

  await deleteByProductId(product.id);
  await upsertChunks(records);

  return { productId: product.id, chunksIndexed: records.length };
}
