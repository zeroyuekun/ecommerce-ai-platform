import { tool } from "ai";
import { z } from "zod";
import { sanityFetch } from "@/sanity/lib/live";
import { defineQuery } from "next-sanity";
import { formatPrice } from "@/lib/utils";
import { getStockStatus } from "@/lib/constants/stock";

const PRODUCT_BY_SLUG_QUERY = defineQuery(`*[
  _type == "product"
  && slug.current == $slug
][0] {
  _id,
  name,
  "slug": slug.current,
  price,
  stock,
  "imageUrl": images[0].asset->url
}`);

const PRODUCT_BY_NAME_QUERY = defineQuery(`*[
  _type == "product"
  && name match $name + "*"
] | order(name asc) [0] {
  _id,
  name,
  "slug": slug.current,
  price,
  stock,
  "imageUrl": images[0].asset->url
}`);

export interface AddToCartResult {
  success: boolean;
  message: string;
  cartItem?: {
    productId: string;
    name: string;
    price: number;
    priceFormatted: string;
    quantity: number;
    image?: string;
    slug: string;
  };
}

const addToCartSchema = z.object({
  productSlug: z
    .string()
    .optional()
    .default("")
    .describe(
      "The product slug (e.g., 'osaka-buffet-natural'). Preferred over name for exact matching."
    ),
  productName: z
    .string()
    .optional()
    .default("")
    .describe(
      "The product name to search for (e.g., 'Osaka Buffet'). Used if slug is not available."
    ),
  quantity: z
    .number()
    .optional()
    .default(1)
    .describe("Number of items to add (default: 1)"),
});

export const addToCartTool = tool({
  description:
    "Add a product to the customer's shopping cart. Use this when the user asks to add an item to their cart. Requires either a product slug or name.",
  inputSchema: addToCartSchema,
  execute: async ({ productSlug, productName, quantity }) => {
    console.log("[AddToCart] Request:", { productSlug, productName, quantity });

    try {
      let product = null;

      // Try slug first (exact match), fall back to name search
      if (productSlug) {
        const { data } = await sanityFetch({
          query: PRODUCT_BY_SLUG_QUERY,
          params: { slug: productSlug },
        });
        product = data;
      }

      if (!product && productName) {
        const { data } = await sanityFetch({
          query: PRODUCT_BY_NAME_QUERY,
          params: { name: productName },
        });
        product = data;
      }

      if (!product) {
        return {
          success: false,
          message: `Could not find product "${productName || productSlug}". Try searching for it first.`,
        } satisfies AddToCartResult;
      }

      // Check stock
      const stockStatus = getStockStatus(product.stock);
      if (stockStatus === "out_of_stock") {
        return {
          success: false,
          message: `${product.name} is currently out of stock.`,
        } satisfies AddToCartResult;
      }

      if (product.stock != null && quantity > product.stock) {
        return {
          success: false,
          message: `Only ${product.stock} units of ${product.name} available. Requested: ${quantity}.`,
        } satisfies AddToCartResult;
      }

      return {
        success: true,
        message: `Added ${quantity}x ${product.name} to your cart.`,
        cartItem: {
          productId: product._id,
          name: product.name ?? "Unknown Product",
          price: product.price ?? 0,
          priceFormatted: product.price ? formatPrice(product.price) : "$0.00",
          quantity,
          image: product.imageUrl ?? undefined,
          slug: product.slug ?? "",
        },
      } satisfies AddToCartResult;
    } catch (error) {
      console.error("[AddToCart] Error:", error);
      return {
        success: false,
        message: "Something went wrong while adding to cart. Please try again.",
      } satisfies AddToCartResult;
    }
  },
});
