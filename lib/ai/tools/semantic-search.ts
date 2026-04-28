/**
 * semanticSearch tool — runs the full RAG pipeline:
 *   understand → retrieve → rerank+dedupe → hydrate → format.
 * Returns at most 5 products via formatToolResult to enforce context budget.
 *
 * Pulls conversation history from the AI SDK ToolCallOptions so that
 * Haiku query-understanding can resolve anaphora ("the blue one",
 * "show me more like the second one"). Spec §4 step [2].
 */
import { tool } from "ai";
import { z } from "zod";
import { formatToolResult } from "@/lib/ai/rag/format";
import type { FormattedProduct } from "@/lib/ai/rag/query/format";
import { formatPipelineResults } from "@/lib/ai/rag/query/format";
import { rerankAndDedupe } from "@/lib/ai/rag/query/rerank";
import { retrieve } from "@/lib/ai/rag/query/retrieve";
import type { ConversationTurn } from "@/lib/ai/rag/query/understand";
import {
  haikuUnderstandingFn,
  understandQuery,
} from "@/lib/ai/rag/query/understand";
import { emitTrace, TraceBuilder } from "@/lib/ai/rag/trace";
import { hydrateProductSummaries } from "@/lib/ai/tools/semantic-search-hydrate";
import { redactPII } from "@/lib/monitoring";

export type SemanticSearchResult = {
  found: boolean;
  totalResults: number;
  products: FormattedProduct[];
  message: string | null;
};

/**
 * Subset of the AI SDK's ToolCallOptions we actually consume. Kept narrow
 * (rather than `never`) so we can read `messages` and so the test ergonomics
 * stay reasonable. See node_modules/@ai-sdk/provider-utils ToolExecutionOptions.
 */
export interface SemanticSearchToolOptions {
  toolCallId: string;
  messages?: unknown[];
  abortSignal?: AbortSignal;
}

/** Concrete tool type with a non-optional, non-streaming execute signature. */
type ConcreteSemanticSearchTool = Omit<ReturnType<typeof tool>, "execute"> & {
  execute: (
    input: z.infer<typeof inputSchema>,
    options: SemanticSearchToolOptions,
  ) => Promise<SemanticSearchResult>;
};

const TOP_K_RETRIEVE = 30;
const TOP_N_RERANK = 10;
const TOP_PRODUCTS = 5;
const RESULT_TOKEN_CAP = 1200;
/** Spec §8.3 — Haiku rewrite only needs the last few turns for anaphora. */
const HISTORY_TURNS_FOR_REWRITE = 6;

function flattenContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const p = part as { type?: string; text?: string };
      return p.type === "text" && typeof p.text === "string" ? p.text : "";
    })
    .filter(Boolean)
    .join(" ");
}

export function extractHistory(messages: unknown): ConversationTurn[] {
  if (!Array.isArray(messages)) return [];
  const out: ConversationTurn[] = [];
  for (const m of messages.slice(-HISTORY_TURNS_FOR_REWRITE)) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    if (role !== "user" && role !== "assistant") continue;
    const text = flattenContent((m as { content?: unknown }).content);
    if (text) out.push({ role, content: text });
  }
  return out;
}

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
  execute: async (
    { query, filters },
    options,
  ): Promise<SemanticSearchResult> => {
    const history = extractHistory(
      (options as SemanticSearchToolOptions | undefined)?.messages,
    );
    const builder = new TraceBuilder(redactPII(query), history.length);

    try {
      const tUnderstand = Date.now();
      const understanding = await understandQuery({
        query,
        history,
        understandingFn: haikuUnderstandingFn,
      });
      builder.setUnderstand({
        rewritten: understanding.rewritten,
        hyde: understanding.hyde,
        // QueryFilters is a narrow concrete type; trace.understand.filters is
        // deliberately wide (Record<string, unknown>) for forward compatibility.
        filters: understanding.filters as Record<string, unknown>,
        fellBack: understanding.fellBack,
        durationMs: Date.now() - tUnderstand,
      });

      const mergedFilters = {
        ...understanding.filters,
        ...(filters?.material ? { material: filters.material } : {}),
        ...(filters?.color ? { color: filters.color } : {}),
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.maxPrice ? { maxPrice: filters.maxPrice } : {}),
        ...(filters?.minPrice ? { minPrice: filters.minPrice } : {}),
      };

      const tRetrieve = Date.now();
      const candidates = await retrieve({
        rewritten: understanding.rewritten,
        hyde: understanding.hyde,
        filters: mergedFilters,
        topK: TOP_K_RETRIEVE,
      }).catch((err: unknown) => {
        builder.setError(
          "retrieve",
          err instanceof Error ? err.message : String(err),
        );
        throw err;
      });
      builder.setRetrieve({
        topK: TOP_K_RETRIEVE,
        candidateCount: candidates.length,
        candidates: candidates.map((c) => ({
          id: c.id,
          productId: c.productId,
          score: c.score,
          chunkType: c.chunkType,
          text: c.metadata.text ?? `${c.chunkType}:${c.id}`,
        })),
        durationMs: Date.now() - tRetrieve,
      });

      if (candidates.length === 0) {
        builder.setRerank({
          backend: "fallback",
          topN: 0,
          results: [],
          durationMs: 0,
        });
        builder.setPicked({ productIds: [] });
        return {
          found: false,
          totalResults: 0,
          products: [],
          message: "No products matched. Try different terms or relax filters.",
        };
      }

      const candidateTexts: Record<string, string> = Object.fromEntries(
        candidates.map((c) => [
          c.id,
          c.metadata.text ?? `${c.metadata.chunk_type}:${c.id}`,
        ]),
      );

      const tRerank = Date.now();
      const reranked = await rerankAndDedupe({
        query: understanding.rewritten,
        candidates,
        candidateTexts,
        topNAfterRerank: TOP_N_RERANK,
        topProducts: TOP_PRODUCTS,
      }).catch((err: unknown) => {
        builder.setError(
          "rerank",
          err instanceof Error ? err.message : String(err),
        );
        throw err;
      });
      const rerankBackend: "cohere" | "fallback" = process.env.COHERE_API_KEY
        ? "cohere"
        : "fallback";
      const rerankResults = reranked.map((r) => {
        const id =
          (r as { chunkId?: string; productId?: string }).chunkId ??
          (r as { productId: string }).productId;
        return { id, score: r.score };
      });
      builder.setRerank({
        backend: rerankBackend,
        topN: TOP_N_RERANK,
        results: rerankResults,
        durationMs: Date.now() - tRerank,
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

      builder.setPicked({
        productIds: reranked.map((r) => r.productId),
      });

      return {
        ...(capped.payload as unknown as Omit<SemanticSearchResult, "message">),
        message: capped.notice ?? null,
      };
    } finally {
      // Fire-and-forget by design: emitTrace handles its own errors via
      // captureException, so trace failures never surface to the chat path.
      void emitTrace(builder.build());
    }
  },
}) as unknown as ConcreteSemanticSearchTool;

/** The semanticSearch AI tool, fully typed with a concrete execute signature. */
export const semanticSearchTool = _semanticSearchTool;
