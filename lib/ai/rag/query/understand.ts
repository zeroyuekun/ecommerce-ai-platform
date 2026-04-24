/**
 * Query understanding stage. Sends a Haiku call (via injected
 * `UnderstandingFn`) that returns:
 *   - rewritten:  conversational rewrite resolving anaphora and adding history
 *   - filters:    extracted hard constraints (price, material, color, ...)
 *   - hyde:       optional hypothetical product description for short queries
 *
 * On any failure or schema violation we degrade to the identity rewrite +
 * empty filters so retrieval still happens.
 */
import { z } from "zod";
import { captureException } from "@/lib/monitoring";

export interface QueryFilters {
  maxPrice?: number;
  minPrice?: number;
  material?: string;
  color?: string;
  category?: string;
  inStockOnly?: boolean;
}

export interface Understanding {
  rewritten: string;
  filters: QueryFilters;
  hyde: string | null;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export type UnderstandingFn = (args: {
  query: string;
  history: ConversationTurn[];
}) => Promise<Understanding>;

export interface UnderstandArgs {
  query: string;
  history: ConversationTurn[];
  understandingFn: UnderstandingFn;
}

const FILTERS_SCHEMA = z
  .object({
    maxPrice: z.number().positive().optional(),
    minPrice: z.number().nonnegative().optional(),
    material: z.string().optional(),
    color: z.string().optional(),
    category: z.string().optional(),
    inStockOnly: z.boolean().optional(),
  })
  .strip();

const UNDERSTANDING_SCHEMA = z.object({
  rewritten: z.string().min(1),
  filters: FILTERS_SCHEMA,
  hyde: z.string().nullable(),
});

export async function understandQuery(args: UnderstandArgs): Promise<Understanding> {
  try {
    const raw = await args.understandingFn({
      query: args.query,
      history: args.history,
    });
    return UNDERSTANDING_SCHEMA.parse(raw);
  } catch (err) {
    captureException(err, { extra: { context: "query-understand", query: args.query } });
    return { rewritten: args.query, filters: {}, hyde: null };
  }
}

/** Default Haiku-backed implementation. */
export const haikuUnderstandingFn: UnderstandingFn = async ({ query, history }) => {
  const { gateway, generateObject } = await import("ai");
  const recent = history.slice(-3).map((t) => `${t.role}: ${t.content}`).join("\n");
  const result = await generateObject({
    model: gateway("anthropic/claude-haiku-4.5"),
    schema: UNDERSTANDING_SCHEMA,
    prompt: `You are the query-understanding stage of a furniture-store RAG pipeline.

Recent conversation (most recent last):
${recent || "(no prior turns)"}

Current user query: "${query}"

Tasks:
1. rewritten: rewrite the user's query as a standalone search query, resolving any pronouns or implicit references using the history. Keep it concise.
2. filters: extract hard constraints from the query into the structured object. maxPrice/minPrice are AUD numbers. material/color/category match the catalog vocabulary. inStockOnly is true if the user implies they want it now.
3. hyde: if the query is shorter than 30 characters or very vague, write a one-paragraph hypothetical product description that would be a perfect match. Otherwise null.

Return strict JSON matching the schema.`,
  });
  return result.object;
};
