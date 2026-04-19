import { tool } from "ai";
import { z } from "zod";
import { getStockMessage, getStockStatus } from "@/lib/constants/stock";
import { embedText } from "@/lib/search/embed";
import { getSearchIndex } from "@/lib/search/index";
import { PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products-by-ids";
import { formatPrice } from "@/lib/utils";
import { sanityFetch } from "@/sanity/lib/live";

const schema = z.object({
  query: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "Qualitative description of what the customer wants, e.g. 'cozy nook for a studio apartment', 'mid-century feel for a bedroom'",
    ),
  topK: z.number().int().min(1).max(20).optional().default(8),
});

interface HydratedProduct {
  _id: string;
  name: string | null;
  slug: string | null;
  price: number;
  stock: number;
  category?: { title?: string; slug?: string } | null;
  material?: string | null;
  color?: string | null;
}

export const semanticSearchTool = tool({
  description:
    "Semantic search for products by vibe/feel/context. Use when the customer describes how they want a space to feel or the situation the product is for, not when they name a specific product type or hard filter. Returns meaningfully ranked products.",
  inputSchema: schema,
  execute: async ({ query, topK }) => {
    try {
      const vector = await embedText(query);
      const index = getSearchIndex();
      const results = await index.query(vector, { topK });

      if (results.length === 0) {
        return {
          found: false,
          message: "No products found semantically matching that description.",
          products: [],
          query,
        };
      }

      const ids = results.map((r) => r.id);
      const { data } = await sanityFetch({
        query: PRODUCTS_BY_IDS_QUERY,
        params: { ids },
      });
      const byId = new Map(
        (data as Array<{ _id: string } & Record<string, unknown>>).map((d) => [
          d._id,
          d as unknown as HydratedProduct,
        ]),
      );

      const products = results
        .map((r) => {
          const doc = byId.get(r.id);
          if (!doc) return null;
          return {
            id: doc._id,
            name: doc.name,
            slug: doc.slug,
            price: doc.price,
            priceFormatted: formatPrice(doc.price),
            category: doc.category?.title ?? null,
            material: doc.material ?? null,
            color: doc.color ?? null,
            stockStatus: getStockStatus(doc.stock),
            stockMessage: getStockMessage(doc.stock),
            score: r.score,
            productUrl: doc.slug ? `/products/${doc.slug}` : null,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      return {
        found: products.length > 0,
        message: `Found ${products.length} products matching the vibe.`,
        products,
        query,
      };
    } catch (err) {
      console.error("[semanticSearch] failed:", err);
      return {
        found: false,
        message: "Semantic search is temporarily unavailable.",
        products: [],
        query,
      };
    }
  },
});
