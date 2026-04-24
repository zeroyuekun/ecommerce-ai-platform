/**
 * filterSearch — exposes the existing keyword/filter-based searchProducts
 * tool under a clearer name for the RAG era. The agent picks this when
 * the query is a pure constraint combination (e.g. "all oak coffee tables
 * under $400"). semanticSearch is preferred for open-ended discovery.
 *
 * Implementation is unchanged — this file is a thin re-export so the
 * legacy code path stays bit-identical.
 */
export { searchProductsTool as filterSearchTool } from "@/lib/ai/tools/search-products";
