import { embed, embedMany } from "ai";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIM = 1536;
const BATCH_MAX = 50;

export async function embedText(text: string): Promise<number[]> {
  if (text.length === 0) {
    throw new Error("embedText: empty input");
  }
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const chunks: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_MAX) {
    const slice = texts.slice(i, i + BATCH_MAX);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: slice,
    });
    chunks.push(...embeddings);
  }
  return chunks;
}
