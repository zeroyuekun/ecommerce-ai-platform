/**
 * Pipeline wrapper around the Cohere rerank adapter that:
 *   1. Reranks the full candidate set,
 *   2. Deduplicates by productId (keeping the highest-scored chunk per product),
 *   3. Caps to the requested top-N products.
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
