/**
 * filterSearch — keyword + hard-constraint search over the catalog. Same
 * Sanity query as the legacy `searchProducts` tool, but with a deliberately
 * STRIPPED response shape: no price, no dimensions, no stock count, no
 * stock message. Just summary fields the LLM can use to describe options.
 *
 * Why stripped: spec §7 + §8.6 require that price/dimensions/stock only
 * reach the LLM via `getProductDetails(slug)`, the authoritative-truth
 * tool. Returning numeric fields here would let the model quote them
 * directly, defeating the anti-hallucination guardrail.
 */
import { tool } from "ai";
import { z } from "zod";
import { COLOR_VALUES, MATERIAL_VALUES } from "@/lib/constants/filters";
import { getStockStatus } from "@/lib/constants/stock";
import { captureException } from "@/lib/monitoring";
import { AI_SEARCH_PRODUCTS_QUERY } from "@/lib/sanity/queries/products";
import { sanityFetch } from "@/sanity/lib/live";
import type { AI_SEARCH_PRODUCTS_QUERYResult } from "@/sanity.types";

const inputSchema = z.object({
  query: z
    .string()
    .optional()
    .default("")
    .describe(
      "Search term to match product name, description, or category (e.g., 'oak table', 'leather sofa', 'dining').",
    ),
  category: z
    .string()
    .optional()
    .default("")
    .describe(
      "Filter by category slug: living-room, bedroom, dining-room, office-storage, outdoor, kids, baby, lighting-decor, youth, furniture-sets.",
    ),
  material: z
    .enum(["", ...MATERIAL_VALUES])
    .optional()
    .default("")
    .describe("Filter by material type."),
  color: z
    .enum(["", ...COLOR_VALUES])
    .optional()
    .default("")
    .describe("Filter by color."),
  minPrice: z
    .number()
    .optional()
    .default(0)
    .describe("Minimum price in AUD (0 = no minimum)."),
  maxPrice: z
    .number()
    .optional()
    .default(0)
    .describe("Maximum price in AUD (0 = no maximum)."),
});

export interface FilterSearchSummary {
  id: string;
  slug: string | null;
  name: string | null;
  category: string | null;
  material: string | null;
  color: string | null;
  /** Coarse stock signal only — "in_stock" / "low_stock" / "out_of_stock". No counts. */
  stockStatus: ReturnType<typeof getStockStatus>;
  productUrl: string | null;
  imageUrl: string | null;
}

export type FilterSearchResult =
  | { found: false; message: string; products: FilterSearchSummary[] }
  | {
      found: true;
      totalResults: number;
      products: FilterSearchSummary[];
      hint: string;
    };

/** Concrete tool type with a non-optional, non-streaming execute signature. */
type ConcreteFilterSearchTool = Omit<ReturnType<typeof tool>, "execute"> & {
  execute: (
    input: z.infer<typeof inputSchema>,
    options: never,
  ) => Promise<FilterSearchResult>;
};

const _filterSearchTool = tool({
  description:
    "Filter the catalog by hard constraints (category, material, color, price range). Returns SUMMARIES ONLY — no price, dimensions, or stock counts. For those, call getProductDetails(slug). Use this for queries like 'all oak coffee tables' or 'sofas under $1000'. For open-ended style/vibe queries, use semanticSearch instead.",
  inputSchema,
  execute: async ({ query, category, material, color, minPrice, maxPrice }) => {
    try {
      const { data: products } = await sanityFetch({
        query: AI_SEARCH_PRODUCTS_QUERY,
        params: {
          searchQuery: query || "",
          categorySlug: category || "",
          material: material || "",
          color: color || "",
          minPrice: minPrice || 0,
          maxPrice: maxPrice || 0,
        },
      });

      if (products.length === 0) {
        return {
          found: false,
          message: "No products matched. Try different terms or relax filters.",
          products: [] as FilterSearchSummary[],
        };
      }

      const summaries: FilterSearchSummary[] = (
        products as AI_SEARCH_PRODUCTS_QUERYResult
      ).map((p) => ({
        id: p._id,
        slug: p.slug ?? null,
        name: p.name ?? null,
        category: p.category?.title ?? null,
        material: p.material ?? null,
        color: p.color ?? null,
        stockStatus: getStockStatus(p.stock),
        productUrl: p.slug ? `/products/${p.slug}` : null,
        imageUrl: p.image?.asset?.url ?? null,
      }));

      return {
        found: true,
        totalResults: summaries.length,
        products: summaries,
        hint: "Summaries only. Call getProductDetails(slug) for price, dimensions, or exact stock before quoting any number.",
      };
    } catch (err) {
      captureException(err, {
        extra: { context: "filter-search", query, category },
      });
      return {
        found: false,
        message: "Search failed. Please try again.",
        products: [] as FilterSearchSummary[],
      };
    }
  },
}) as unknown as ConcreteFilterSearchTool;

export const filterSearchTool = _filterSearchTool;
