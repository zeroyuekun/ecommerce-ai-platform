/**
 * Synthetic Q&A generator. Per spec §6 this is the single biggest recall
 * lever for sparse furniture descriptions. Runs once per product at index
 * time via Claude Haiku through the Vercel AI Gateway.
 *
 * The generator function is injected so unit tests don't need network and
 * the real implementation can swap models without touching the chunker.
 */
import { z } from "zod";
import { captureException } from "@/lib/monitoring";

export interface QaProduct {
  name: string;
  description: string;
  category: string | null;
  material: string | null;
}

export interface QaItem {
  question: string;
  answer: string;
}

export interface QaGeneratorArgs {
  product: QaProduct;
  count: number;
}

export type QaGenerator = (args: QaGeneratorArgs) => Promise<QaItem[]>;

export interface GenerateOptions {
  count: number;
  generator: QaGenerator;
}

const QA_SCHEMA = z.array(
  z.object({
    question: z.string().min(1).max(200),
    answer: z.string().min(1).max(400),
  }),
);

const MIN_COUNT = 1;
const MAX_COUNT = 10;

export async function generateSyntheticQa(
  product: QaProduct,
  opts: GenerateOptions,
): Promise<QaItem[]> {
  const count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, opts.count));
  try {
    const raw = await opts.generator({ product, count });
    return QA_SCHEMA.parse(raw);
  } catch (err) {
    captureException(err, { extra: { context: "synthetic-qa", productName: product.name } });
    return [];
  }
}

/**
 * Default generator using Vercel AI Gateway + Haiku. Live, not invoked in
 * unit tests. Exported separately so it can be swapped.
 */
export const haikuQaGenerator: QaGenerator = async ({ product, count }) => {
  const { gateway, generateObject } = await import("ai");
  const result = await generateObject({
    model: gateway("anthropic/claude-haiku-4.5"),
    schema: QA_SCHEMA,
    prompt: `You are generating synthetic question-answer pairs to improve search recall for a furniture product.

Product:
- Name: ${product.name}
- Category: ${product.category ?? "n/a"}
- Material: ${product.material ?? "n/a"}
- Description: ${product.description}

Generate exactly ${count} question/answer pairs that a customer would plausibly ask about this product. Cover: aesthetic suitability, room fit, comparison with similar styles, care/maintenance, and use-case. Each Q+A must stay under 100 tokens combined.

Return a JSON array of {question, answer}.`,
  });
  return result.object;
};
