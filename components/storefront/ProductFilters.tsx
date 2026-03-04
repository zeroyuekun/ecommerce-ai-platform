"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { COLORS, MATERIALS, PRODUCT_TYPES } from "@/lib/constants/filters";
import type { ALL_CATEGORIES_QUERY_RESULT } from "@/sanity.types";

interface ProductFiltersProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-zinc-200 py-4 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "";
  const currentProductType = searchParams.get("productType") ?? "";
  const currentColor = searchParams.get("color") ?? "";
  const currentMaterial = searchParams.get("material") ?? "";

  const urlMinPrice = Number(searchParams.get("minPrice")) || 0;
  const urlMaxPrice = Number(searchParams.get("maxPrice")) || 5000;
  const currentInStock = searchParams.get("inStock") === "true";

  const [priceRange, setPriceRange] = useState<[number, number]>([
    urlMinPrice,
    urlMaxPrice,
  ]);

  useEffect(() => {
    setPriceRange([urlMinPrice, urlMaxPrice]);
  }, [urlMinPrice, urlMaxPrice]);

  const hasActiveFilters = !!(
    currentCategory || currentProductType || currentColor || currentMaterial ||
    urlMinPrice > 0 || urlMaxPrice < 5000 || currentInStock
  );

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === 0) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleClearFilters = () => {
    router.push("/", { scroll: false });
  };

  return (
    <div className="sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <FilterSection title="Category">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParams({ category: null })}
            className={`block w-full text-left text-sm transition-colors ${
              !currentCategory
                ? "font-medium text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category._id}
              type="button"
              onClick={() => updateParams({ category: category.slug })}
              className={`block w-full text-left text-sm transition-colors ${
                currentCategory === category.slug
                  ? "font-medium text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {category.title}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Type */}
      <FilterSection title="Type">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParams({ productType: null })}
            className={`block w-full text-left text-sm transition-colors ${
              !currentProductType
                ? "font-medium text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            All
          </button>
          {PRODUCT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateParams({ productType: type.value })}
              className={`block w-full text-left text-sm transition-colors ${
                currentProductType === type.value
                  ? "font-medium text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Color */}
      <FilterSection title="Colour">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParams({ color: null })}
            className={`block w-full text-left text-sm transition-colors ${
              !currentColor
                ? "font-medium text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            All
          </button>
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => updateParams({ color: color.value })}
              className={`block w-full text-left text-sm transition-colors ${
                currentColor === color.value
                  ? "font-medium text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {color.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Material */}
      <FilterSection title="Material">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParams({ material: null })}
            className={`block w-full text-left text-sm transition-colors ${
              !currentMaterial
                ? "font-medium text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
          >
            All
          </button>
          {MATERIALS.map((material) => (
            <button
              key={material.value}
              type="button"
              onClick={() => updateParams({ material: material.value })}
              className={`block w-full text-left text-sm transition-colors ${
                currentMaterial === material.value
                  ? "font-medium text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {material.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title={`Price: $${priceRange[0]} – $${priceRange[1]}`}>
        <Slider
          min={0}
          max={5000}
          step={100}
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          onValueCommit={([min, max]) =>
            updateParams({
              minPrice: min > 0 ? min : null,
              maxPrice: max < 5000 ? max : null,
            })
          }
          className="mt-1"
        />
      </FilterSection>

      {/* In Stock */}
      <FilterSection title="Availability" defaultOpen={false}>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={currentInStock}
            onChange={(e) =>
              updateParams({ inStock: e.target.checked ? "true" : null })
            }
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
          />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            In stock only
          </span>
        </label>
      </FilterSection>

    </div>
  );
}
