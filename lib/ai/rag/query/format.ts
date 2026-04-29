/**
 * Pipeline output formatter. Joins reranked matches with hydrated product
 * details (fetched separately from Sanity through getProductDetails) and
 * shapes the structured tool-result envelope passed to formatToolResult.
 */
import type { QueryMatch } from "@/lib/ai/rag/store";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  oneLine: string;
  keyMaterials: string;
  stockStatus: StockStatus;
  imageUrl: string | null;
  productUrl: string;
}

export interface FormatPipelineArgs {
  matches: QueryMatch[];
  products: Record<string, ProductSummary>;
}

export interface FormattedProduct extends ProductSummary {
  relevanceScore: number;
}

export interface FormattedPipelineResult {
  found: boolean;
  totalResults: number;
  products: FormattedProduct[];
}

export function formatPipelineResults(
  args: FormatPipelineArgs,
): FormattedPipelineResult {
  const products: FormattedProduct[] = [];
  for (const m of args.matches) {
    const summary = args.products[m.productId];
    if (!summary) continue;
    products.push({ ...summary, relevanceScore: m.score });
  }
  return {
    found: products.length > 0,
    totalResults: products.length,
    products,
  };
}
