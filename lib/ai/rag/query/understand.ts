/**
 * Query understanding stage. Sends a Haiku call (via injected
 * `UnderstandingFn`) that returns:
 *   - rewritten:  conversational rewrite resolving anaphora and adding history
 *   - filters:    extracted hard constraints (price, material, color, ...)
 *   - hyde:       optional hypothetical product description for short queries
 *
 * On any failure, schema violation, or values outside the catalog
 * vocabulary we degrade to the identity rewrite + empty filters so
 * retrieval still happens.
 */
import { z } from "zod";
import { COLOR_VALUES, MATERIAL_VALUES } from "@/lib/constants/filters";
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
  fellBack: boolean;
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

/** Catalog category slugs. Keep in sync with the Sanity `category` schema. */
const CATEGORY_SLUGS = [
  "living-room",
  "bedroom",
  "dining-room",
  "office-storage",
  "lighting-decor",
  "outdoor",
  "kids",
  "youth",
  "baby",
  "furniture-sets",
] as const;

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

/**
 * Post-process extracted filters to drop any values that aren't in the
 * catalog vocabulary. Haiku may produce plausible-sounding natural-language
 * values ("chair", "coffee table", "oak" as material) that don't match our
 * enum slugs — silently ignoring those is better than returning zero results.
 */
function sanitizeFilters(filters: QueryFilters): QueryFilters {
  const out: QueryFilters = {};
  if (typeof filters.maxPrice === "number" && filters.maxPrice > 0) {
    out.maxPrice = filters.maxPrice;
  }
  if (typeof filters.minPrice === "number" && filters.minPrice >= 0) {
    out.minPrice = filters.minPrice;
  }
  if (typeof filters.inStockOnly === "boolean") {
    out.inStockOnly = filters.inStockOnly;
  }
  if (
    filters.material &&
    (MATERIAL_VALUES as readonly string[]).includes(filters.material)
  ) {
    out.material = filters.material;
  }
  if (
    filters.color &&
    (COLOR_VALUES as readonly string[]).includes(filters.color)
  ) {
    out.color = filters.color;
  }
  if (
    filters.category &&
    (CATEGORY_SLUGS as readonly string[]).includes(filters.category)
  ) {
    out.category = filters.category;
  }
  return out;
}

export async function understandQuery(
  args: UnderstandArgs,
): Promise<Understanding> {
  try {
    const raw = await args.understandingFn({
      query: args.query,
      history: args.history,
    });
    const parsed = UNDERSTANDING_SCHEMA.parse(raw);
    return {
      rewritten: parsed.rewritten,
      filters: sanitizeFilters(parsed.filters),
      hyde: parsed.hyde,
      fellBack: false,
    };
  } catch (err) {
    captureException(err, {
      extra: { context: "query-understand", query: args.query },
    });
    return { rewritten: args.query, filters: {}, hyde: null, fellBack: true };
  }
}

/** Default Haiku-backed implementation. */
export const haikuUnderstandingFn: UnderstandingFn = async ({
  query,
  history,
}) => {
  const { gateway, generateObject } = await import("ai");
  const recent = history
    .slice(-3)
    .map((t) => `${t.role}: ${t.content}`)
    .join("\n");
  const result = await generateObject({
    model: gateway("anthropic/claude-haiku-4.5"),
    schema: UNDERSTANDING_SCHEMA,
    prompt: `You are the query-understanding stage of a furniture-store RAG pipeline.

Recent conversation (most recent last):
${recent || "(no prior turns)"}

Current user query: "${query}"

Catalog vocabulary (valid enum values — any extracted filter MUST be one of these or omitted):
- material: ${MATERIAL_VALUES.join(", ")}
- color:    ${COLOR_VALUES.join(", ")}  (note: oak and walnut are COLORS, not materials)
- category: ${CATEGORY_SLUGS.join(", ")}

Tasks:
1. rewritten: rewrite the user's query as a standalone search query, resolving any pronouns or implicit references using the history. Keep it concise.
2. filters: extract hard constraints from the query. maxPrice/minPrice are AUD numbers. material/color/category MUST match the catalog vocabulary above — if the user's word doesn't map to any valid value, OMIT that filter entirely. Do NOT invent category names; "chair" is not a category (try to pick living-room / office-storage / outdoor based on context, or omit). inStockOnly is true if the user implies they want it now.
3. hyde: if the query is shorter than 30 characters or very vague, write a one-paragraph hypothetical product description that would be a perfect match. Otherwise null.

Return strict JSON matching the schema.`,
  });
  return { ...result.object, fellBack: false };
};
