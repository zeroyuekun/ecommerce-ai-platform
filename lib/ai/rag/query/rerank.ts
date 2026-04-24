/**
 * Pipeline wrapper around the Cohere rerank adapter that:
 *   1. Reranks the full candidate set (Cohere) OR preserves Pinecone
 *      similarity scores when no COHERE_API_KEY is configured.
 *   2. Deduplicates by productId (keeping the highest-scored chunk per product).
 *   3. Caps to the requested top-N products.
 *
 * Graceful-degradation note: when Cohere is unavailable at runtime the
 * adapter returns candidates with score 0 (see rerank.ts). That would
 * destroy the ranking signal entirely — so we detect the missing-key
 * case up-front and skip rerank, preserving Pinecone's native similarity
 * scores instead. The full pipeline still works; it's just missing the
 * ~10-15% precision boost Cohere would add.
 */
import { rerankCandidates } from "@/lib/ai/rag/rerank";
import type { QueryMatch } from "@/lib/ai/rag/store";

export interface RerankInput {
  query: string;
  candidates: QueryMatch[];
  candidateTexts: Record<string, string>;
  topNAfterRerank: number;
  topProducts: number;
}

function dedupeByProductId(
  scored: Array<{ id: string; score: number }>,
  byChunk: Map<string, QueryMatch>,
  topProducts: number,
): QueryMatch[] {
  const seen = new Set<string>();
  const out: QueryMatch[] = [];
  for (const r of scored) {
    const original = byChunk.get(r.id);
    if (!original) continue;
    if (seen.has(original.productId)) continue;
    seen.add(original.productId);
    out.push({ ...original, score: r.score });
    if (out.length >= topProducts) break;
  }
  return out;
}

export async function rerankAndDedupe(
  args: RerankInput,
): Promise<QueryMatch[]> {
  const byChunk = new Map(args.candidates.map((c) => [c.id, c]));

  // If Cohere isn't configured, preserve Pinecone similarity scores and
  // dedupe directly. Better signal than the rerank adapter's score-0
  // fallback would give us.
  if (!process.env.COHERE_API_KEY) {
    const scored = args.candidates
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, args.topNAfterRerank)
      .map((c) => ({ id: c.id, score: c.score }));
    return dedupeByProductId(scored, byChunk, args.topProducts);
  }

  const reranked = await rerankCandidates({
    query: args.query,
    candidates: args.candidates.map((c) => ({
      id: c.id,
      text: args.candidateTexts[c.id] ?? c.id,
    })),
    topN: args.topNAfterRerank,
  });
  return dedupeByProductId(reranked, byChunk, args.topProducts);
}
