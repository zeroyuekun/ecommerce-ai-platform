/**
 * Voyage embedding adapter. Wraps the Voyage SDK so the rest of the RAG
 * pipeline never imports it directly. Defaults: voyage-3-large, 1024d, int8.
 *
 * Per spec §3 — Anthropic-recommended embedding partner. Matryoshka means
 * the dimension can be reduced later without re-embedding.
 *
 * SDK shape (voyageai@0.2.x):
 *   - Client class:  VoyageAIClient({ apiKey })
 *   - Embed method:  client.embed({ input, model, inputType?, outputDimension?, outputDtype? })
 *   - inputType:     "document" | "query"  (plain string literals)
 *   - outputDtype:   "float" | "int8" | "uint8" | "binary" | "ubinary"
 *   - Response:      { data?: Array<{ embedding?: number[] }> }
 */
import { VoyageAIClient } from "voyageai";

export type EmbedKind = "document" | "query";

export interface EmbedOptions {
  kind: EmbedKind;
}

const MODEL = "voyage-3-large";
const DIMENSION = 1024;
const OUTPUT_DTYPE = "int8" as const;

let cachedClient: VoyageAIClient | null = null;

function getClient(): VoyageAIClient {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");
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
      outputDtype: OUTPUT_DTYPE,
    });
    return (response.data ?? []).map((row) => row.embedding ?? []);
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
