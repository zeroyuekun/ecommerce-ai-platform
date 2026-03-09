"use server";

import { sanityFetch } from "@/sanity/lib/live";
import { PRODUCTS_BY_IDS_FULL_QUERY } from "@/lib/sanity/queries/products";

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const { data } = await sanityFetch({
    query: PRODUCTS_BY_IDS_FULL_QUERY,
    params: { ids },
  });

  // Preserve the order of IDs (most recently viewed first)
  const productMap = new Map(data.map((p) => [p._id, p]));
  return ids.map((id) => productMap.get(id)).filter(Boolean) as typeof data;
}
