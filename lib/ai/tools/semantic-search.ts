/**
 * semanticSearch tool — runs the full RAG pipeline:
 *   understand → retrieve → rerank+dedupe → hydrate → format.
 * Returns at most 5 products via formatToolResult to enforce context budget.
 */
import { tool } from "ai";
import { z } from "zod";
import { formatToolResult } from "@/lib/ai/rag/format";
import type { FormattedProduct } from "@/lib/ai/rag/query/format";
import { formatPipelineResults } from "@/lib/ai/rag/query/format";
import { rerankAndDedupe } from "@/lib/ai/rag/query/rerank";
import { retrieve } from "@/lib/ai/rag/query/retrieve";
import {
  haikuUnderstandingFn,
  understandQuery,
} from "@/lib/ai/rag/query/understand";
import { hydrateProductSummaries } from "@/lib/ai/tools/semantic-search-hydrate";

export type SemanticSearchResult = {
  found: boolean;
  totalResults: number;
  products: FormattedProduct[];
  message: string | null;
};

/** Concrete tool type with a non-optional, non-streaming execute signature. */
type ConcreteSemanticSearchTool = Omit<ReturnType<typeof tool>, "execute"> & {
  execute: (
    input: z.infer<typeof inputSchema>,
    options: never,
  ) => Promise<SemanticSearchResult>;
};

const TOP_K_RETRIEVE = 30;
const TOP_N_RERANK = 10;
const TOP_PRODUCTS = 5;
const RESULT_TOKEN_CAP = 1200;

const inputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Natural-language description of what the customer is looking for (e.g. 'cozy reading nook chair', 'minimalist Japandi sofa').",
    ),
  filters: z
    .object({
      maxPrice: z.number().positive().optional(),
      minPrice: z.number().nonnegative().optional(),
      material: z.string().optional(),
      color: z.string().optional(),
      category: z.string().optional(),
    })
    .optional()
    .describe(
      "Optional hard constraints to merge with anything extracted from the query.",
    ),
});

const _semanticSearchTool = tool({
  description:
    "Open-ended product discovery. Use for queries about style, vibe, room context, or use-case (e.g. 'cozy reading nook'). Returns up to 5 best-matching products via the RAG pipeline. For queries that are pure filter combinations (e.g. 'oak coffee tables under $400'), prefer filterSearch instead.",
  inputSchema,
  execute: async ({ query, filters }): Promise<SemanticSearchResult> => {
    const understanding = await understandQuery({
      query,
      history: [],
      understandingFn: haikuUnderstandingFn,
    });

    const mergedFilters = {
      ...understanding.filters,
      ...(filters?.material ? { material: filters.material } : {}),
      ...(filters?.color ? { color: filters.color } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.maxPrice ? { maxPrice: filters.maxPrice } : {}),
      ...(filters?.minPrice ? { minPrice: filters.minPrice } : {}),
    };

    const candidates = await retrieve({
      rewritten: understanding.rewritten,
      hyde: understanding.hyde,
      filters: mergedFilters,
      topK: TOP_K_RETRIEVE,
    });

    if (candidates.length === 0) {
      return {
        found: false,
        totalResults: 0,
        products: [],
        message: "No products matched. Try different terms or relax filters.",
      };
    }

    const candidateTexts: Record<string, string> = Object.fromEntries(
      candidates.map((c) => [c.id, `${c.metadata.chunk_type}:${c.id}`]),
    );

    const reranked = await rerankAndDedupe({
      query: understanding.rewritten,
      candidates,
      candidateTexts,
      topNAfterRerank: TOP_N_RERANK,
      topProducts: TOP_PRODUCTS,
    });

    const summaries = await hydrateProductSummaries(
      reranked.map((r) => r.productId),
    );
    const formatted = formatPipelineResults({
      matches: reranked,
      products: summaries,
    });
    const capped = formatToolResult({
      toolName: "semanticSearch",
      payload: formatted as unknown as Record<string, unknown>,
      capTokens: RESULT_TOKEN_CAP,
      arrayKey: "products",
    });
    return {
      ...(capped.payload as unknown as Omit<SemanticSearchResult, "message">),
      message: capped.notice ?? null,
    };
  },
}) as unknown as ConcreteSemanticSearchTool;

/** The semanticSearch AI tool, fully typed with a concrete execute signature. */
export const semanticSearchTool = _semanticSearchTool;
