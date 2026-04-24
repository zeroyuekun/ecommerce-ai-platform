/**
 * Helper for the semantic-search tool: takes a list of productIds and
 * returns a Record keyed by productId with the compact summary used in
 * pipeline output. Lives in its own module so the semanticSearch tool can
 * be unit-tested without hitting Sanity.
 */
import type { ProductSummary } from "@/lib/ai/rag/query/format";
import { getStockStatus } from "@/lib/constants/stock";
import { formatPrice } from "@/lib/utils";
import { client as sanityClient } from "@/sanity/lib/client";

const SUMMARY_QUERY = `*[_type == "product" && _id in $ids]{
  _id, name, slug, description, price, material, color, stock,
  "image": images[0]{ asset->{ url } }
}`;

interface SanityRow {
  _id: string;
  name: string;
  slug: { current: string };
  description: string;
  price: number;
  material: string | null;
  color: string | null;
  stock: number;
  image: { asset: { url: string } | null } | null;
}

function oneLineDescription(text: string): string {
  if (!text) return "";
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return firstSentence.length > 140
    ? `${firstSentence.slice(0, 137)}...`
    : firstSentence;
}

function keyMaterials(material: string | null, color: string | null): string {
  return [material, color].filter(Boolean).join(", ");
}

export async function hydrateProductSummaries(
  ids: string[],
): Promise<Record<string, ProductSummary>> {
  if (ids.length === 0) return {};
  const rows =
    (await sanityClient.fetch<SanityRow[]>(SUMMARY_QUERY, { ids })) ?? [];
  const out: Record<string, ProductSummary> = {};
  for (const r of rows) {
    const rawStatus = getStockStatus(r.stock);
    const stockStatus =
      rawStatus === "unknown" ? ("out_of_stock" as const) : rawStatus;
    out[r._id] = {
      id: r._id,
      slug: r.slug.current,
      name: r.name,
      oneLine: oneLineDescription(r.description),
      price: r.price,
      priceFormatted: formatPrice(r.price),
      keyMaterials: keyMaterials(r.material, r.color),
      stockStatus,
      imageUrl: r.image?.asset?.url ?? null,
      productUrl: `/products/${r.slug.current}`,
    };
  }
  return out;
}
