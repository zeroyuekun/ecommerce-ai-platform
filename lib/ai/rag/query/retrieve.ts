/**
 * Retrieve stage — embeds the (rewritten or HyDE) query and runs a Pinecone
 * query with the extracted metadata filters pre-applied. Always pre-filters
 * on `ships_to_au` to keep the catalog relevant to AU customers.
 *
 * Phase 1: dense-only (sparse deferred to Phase 1.5). The store adapter
 * accepts an optional sparse vector so this is a forward-compatible upgrade.
 */
import { embedTexts } from "@/lib/ai/rag/embed";
import type { QueryFilters } from "@/lib/ai/rag/query/understand";
import {
  hybridQuery,
  type QueryFilter,
  type QueryMatch,
} from "@/lib/ai/rag/store";

export interface RetrieveArgs {
  rewritten: string;
  hyde: string | null;
  filters: QueryFilters;
  topK: number;
}

function buildPineconeFilter(f: QueryFilters): QueryFilter {
  const out: QueryFilter = { ships_to_au: { $eq: true } };
  if (f.maxPrice !== undefined || f.minPrice !== undefined) {
    out.price = {};
    if (f.minPrice !== undefined) out.price.$gte = f.minPrice;
    if (f.maxPrice !== undefined) out.price.$lte = f.maxPrice;
  }
  if (f.material) out.material = { $eq: f.material };
  if (f.color) out.color = { $eq: f.color };
  if (f.category) out.category_slug = { $eq: f.category };
  if (f.inStockOnly) out.in_stock = { $eq: true };
  return out;
}

export async function retrieve(args: RetrieveArgs): Promise<QueryMatch[]> {
  const queryText = args.hyde ?? args.rewritten;
  const denseVec = await embedTexts([queryText], { kind: "query" });
  return hybridQuery({
    vector: denseVec[0],
    topK: args.topK,
    filter: buildPineconeFilter(args.filters),
  });
}
