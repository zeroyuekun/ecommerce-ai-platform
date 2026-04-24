/**
 * Voyage embedding adapter. Wraps the Voyage REST API directly to avoid the
 * voyageai SDK's ESM packaging bug (0.2.1 ships unextensioned imports that
 * Next.js can't resolve). Defaults: voyage-3-large, 1024d, int8.
 *
 * Per spec §3 — Anthropic-recommended embedding partner. Matryoshka means
 * the dimension can be reduced later without re-embedding.
 */
export type EmbedKind = "document" | "query";

export interface EmbedOptions {
  kind: EmbedKind;
}

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-large";
const DIMENSION = 1024;
const DTYPE = "int8" as const;

interface VoyageResponse {
  data?: Array<{ embedding?: number[] }>;
}

let cachedApiKey: string | null = null;
function getApiKey(): string {
  if (cachedApiKey) return cachedApiKey;
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");
  cachedApiKey = apiKey;
  return cachedApiKey;
}

export async function embedTexts(
  texts: string[],
  { kind }: EmbedOptions,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        input: texts,
        model: MODEL,
        input_type: kind,
        output_dimension: DIMENSION,
        output_dtype: DTYPE,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const json = (await response.json()) as VoyageResponse;
    return (json.data ?? []).map((row) => row.embedding ?? []);
  } catch (err) {
    throw new Error(
      `Voyage embedding failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Test seam — clears the cached key so tests can re-stub env. */
export function __resetEmbedClientForTests(): void {
  cachedApiKey = null;
}
