"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";
import { SORT_OPTIONS } from "@/lib/constants/filters";
import type {
  ALL_CATEGORIES_QUERY_RESULT,
  FILTER_PRODUCTS_BY_NAME_QUERY_RESULT,
} from "@/sanity.types";

interface ProductSectionProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
  products: FILTER_PRODUCTS_BY_NAME_QUERY_RESULT;
  searchQuery: string;
  showFilters?: boolean;
  showToolbar?: boolean;
}

export function ProductSection({
  categories,
  products,
  searchQuery,
  showFilters = false,
  showToolbar = false,
}: ProductSectionProps) {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "name";

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "Sort";

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`?${params.toString()}`, { scroll: false });
    setSortOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar: results count + view toggles + sort */}
      {showToolbar && <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {products.length} {products.length === 1 ? "product" : "products"}
          {searchQuery && (
            <span>
              {" "}
              for &quot;<span className="font-medium text-zinc-900 dark:text-zinc-100">{searchQuery}</span>&quot;
            </span>
          )}
        </p>

        <div className="flex items-center gap-3">
          {/* Grid view icon (4 squares) */}
          <button
            type="button"
            onClick={() => setLayout("grid")}
            aria-label="Grid view"
            className={`transition-colors ${
              layout === "grid"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11.5" y="1" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="1" y="11.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          {/* List view icon (1 big square) */}
          <button
            type="button"
            onClick={() => setLayout("list")}
            aria-label="List view"
            className={`transition-colors ${
              layout === "list"
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          {/* Sort dropdown */}
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              SORT
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
            </button>

            {sortOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSort(option.value)}
                    className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                      currentSort === option.value
                        ? "font-medium text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>}

      {/* Main content area */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar Filters - only shown when showFilters is true */}
        {showFilters && (
          <aside className="w-full shrink-0 lg:w-64">
            <ProductFilters categories={categories} />
          </aside>
        )}

        {/* Product Grid */}
        <main className="flex-1">
          <ProductGrid products={products} layout={layout} />
        </main>
      </div>
    </div>
  );
}
