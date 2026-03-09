"use client";

import { useState, useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
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

/**
 * Scroll trap — same pattern as product detail page.
 * Filter sidebar scrolls first; products stay still.
 * Once filters hit bottom/top, the page scrolls normally.
 */
function useScrollTrap(ref: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;

    const onWheel = (e: WheelEvent) => {
      const el = ref.current;
      if (!el) return;
      if (window.innerWidth < 1024) return;

      // Check if filter is visible in viewport
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = scrollHeight - clientHeight;

      // No overflow — nothing to trap
      if (maxScroll <= 0) return;

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop >= maxScroll - 1;

      // At boundary in scroll direction → let page scroll
      if ((e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop)) return;

      // Filter can still scroll → consume event, scroll filter
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [ref, active]);
}

export function ProductSection({
  categories,
  products,
  searchQuery,
}: ProductSectionProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const filterRef = useRef<HTMLDivElement>(null);

  useScrollTrap(filterRef, filtersOpen);

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
      <div className="flex items-start gap-10 pt-8">
        {/* Left sidebar filters — sticky with independent scroll */}
        {filtersOpen && (
          <aside className="hidden w-[240px] shrink-0 lg:block">
            <div
              ref={filterRef}
              className="lg:sticky lg:top-[calc(4rem+41px+1rem)] lg:self-start lg:max-h-[calc(100vh-4rem-41px-2rem)] lg:overflow-y-auto scrollbar-hide"
            >
              <ProductFilters categories={categories} />
            </div>
          </aside>
        )}

        {/* Product Grid — scrolls naturally */}
        <div className="flex-1">
          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  );
}
