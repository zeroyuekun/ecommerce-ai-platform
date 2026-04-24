/**
 * Embedding adapter. Uses Pinecone Inference (multilingual-e5-large @ 1024d)
 * so we don't need a separate embedding-vendor signup. The Pinecone free
 * tier includes inference.
 *
 * Public interface (embedTexts, __resetEmbedClientForTests) is unchanged
 * from the prior Voyage implementation — swap is one file by design
 * (per ADR-0005 migration path).
 */
export type EmbedKind = "document" | "query";

export interface EmbedOptions {
  kind: EmbedKind;
}

const ENDPOINT = "https://api.pinecone.io/embed";
const MODEL = "multilingual-e5-large";
const API_VERSION = "2024-10";

interface PineconeEmbedResponse {
  data?: Array<{ values?: number[] }>;
}

let cachedApiKey: string | null = null;
function getApiKey(): string {
  if (cachedApiKey) return cachedApiKey;
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error("PINECONE_API_KEY is not set");
  cachedApiKey = apiKey;
  return cachedApiKey;
}

function inputType(kind: EmbedKind): "passage" | "query" {
  return kind === "document" ? "passage" : "query";
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
        "Api-Key": getApiKey(),
        "X-Pinecone-API-Version": API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        parameters: {
          input_type: inputType(kind),
          truncate: "END",
        },
        inputs: texts.map((text) => ({ text })),
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const json = (await response.json()) as PineconeEmbedResponse;
    return (json.data ?? []).map((row) => row.values ?? []);
  } catch (err) {
    throw new Error(
      `Pinecone embedding failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Test seam — clears the cached key so tests can re-stub env. */
export function __resetEmbedClientForTests(): void {
  cachedApiKey = null;
}
