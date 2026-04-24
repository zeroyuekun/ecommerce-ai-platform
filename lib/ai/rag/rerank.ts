/**
 * Cohere Rerank adapter. Pure read-path; if Cohere is unavailable we fall
 * back to the input order so the rest of the pipeline keeps working at a
 * graceful quality degradation (per spec §12).
 *
 * SDK notes (cohere-ai v7):
 * - Rerank is accessed via `client.v2.rerank()`, not `client.rerank()`.
 * - `documents` is `string[]` in the v2 API (not objects).
 * - The canonical model identifier is `rerank-v3.5` (comment in V2RerankRequest
 *   reads "eg `rerank-v3.5`"); `rerank-english-v3.5` is the v1/legacy name.
 */
import { CohereClient } from "cohere-ai";
import { captureException } from "@/lib/monitoring";

const MODEL = "rerank-v3.5";

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
    captureException(err, {
      extra: { context: "rerank", query, candidateCount: candidates.length },
    });
    return candidates.slice(0, topN).map((c) => ({ ...c, score: 0 }));
  }
}

export function __resetRerankerForTests(): void {
  cached = null;
}
