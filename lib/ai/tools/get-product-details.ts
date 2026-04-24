/**
 * getProductDetails tool — authoritative product truth fetched directly
 * from Sanity. Per spec §7 the agent MUST call this before quoting any
 * dimension, price, or stock value to the customer.
 */
import { tool } from "ai";
import { z } from "zod";
import { getStockMessage, getStockStatus } from "@/lib/constants/stock";
import { formatPrice } from "@/lib/utils";
import { sanityFetch } from "@/sanity/lib/live";

const inputSchema = z.object({
  productSlug: z
    .string()
    .min(1)
    .describe("The product slug (URL-safe identifier) to fetch details for."),
});

const QUERY = `*[_type == "product" && slug.current == $slug][0]{
  _id, name, slug, description, price, dimensions, stock, assemblyRequired, featured,
  material, color,
  "category": category->{ title, slug },
  "image": images[0]{ asset->{ url } }
}`;

export const getProductDetailsTool = tool({
  description:
    "Fetch the authoritative current details (price, stock, dimensions, materials, image) for one product by its slug. Always call this before quoting numbers to the customer.",
  inputSchema,
  execute: async ({ productSlug }) => {
    const { data } = await sanityFetch({ query: QUERY, params: { slug: productSlug } });
    if (!data) {
      return {
        found: false,
        product: null,
        message: `No product found with slug "${productSlug}".`,
      };
    }

    const stock = (data as { stock?: number }).stock ?? 0;
    const price = (data as { price?: number }).price ?? 0;

    return {
      found: true,
      product: {
        id: (data as { _id: string })._id,
        slug: productSlug,
        name: (data as { name?: string }).name ?? "",
        description: (data as { description?: string }).description ?? "",
        price,
        priceFormatted: formatPrice(price),
        category: (data as { category?: { title?: string } | null }).category?.title ?? null,
        material: (data as { material?: string | null }).material ?? null,
        color: (data as { color?: string | null }).color ?? null,
        dimensions: (data as { dimensions?: string | null }).dimensions ?? null,
        stockCount: stock,
        stockStatus: getStockStatus(stock),
        stockMessage: getStockMessage(stock),
        assemblyRequired: !!(data as { assemblyRequired?: boolean }).assemblyRequired,
        featured: !!(data as { featured?: boolean }).featured,
        imageUrl: (data as { image?: { asset?: { url?: string } } | null }).image?.asset?.url ?? null,
        productUrl: `/products/${productSlug}`,
      },
    };
  },
});
