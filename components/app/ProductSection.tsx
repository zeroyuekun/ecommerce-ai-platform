"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";
import { SortSelect } from "./SortSelect";
import type {
  ALL_CATEGORIES_QUERY_RESULT,
  FILTER_PRODUCTS_BY_NAME_QUERY_RESULT,
} from "@/sanity.types";

interface ProductSectionProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
  products: FILTER_PRODUCTS_BY_NAME_QUERY_RESULT;
  searchQuery: string;
}

export function ProductSection({
  categories,
  products,
  searchQuery,
}: ProductSectionProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <div className="flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            {filtersOpen ? "Hide Filter" : "Filter"}
          </button>

          <span className="text-[11px] tracking-wide text-zinc-400 dark:text-zinc-500">
            {products.length} {products.length === 1 ? "Result" : "Results"}
            {searchQuery && (
              <span>
                {" "}
                for &ldquo;
                <span className="text-zinc-600 dark:text-zinc-300">
                  {searchQuery}
                </span>
                &rdquo;
              </span>
            )}
          </span>
        </div>

        <SortSelect />
      </div>

      <div className="h-px bg-zinc-200/80 dark:bg-zinc-700/50" />

      {/* Main content: sidebar + grid */}
      <div className="flex gap-10 pt-8">
        {/* Left sidebar filters */}
        {filtersOpen && (
          <aside className="hidden w-[240px] shrink-0 lg:block">
            <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
              <ProductFilters categories={categories} />
            </div>
          </aside>
        )}

        {/* Product Grid */}
        <div className="flex-1">
          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  );
}
