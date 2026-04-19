"use client";

import { Check, Minus, Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Slider } from "@/components/ui/slider";
import { COLOR_SWATCHES, COLORS, MATERIALS } from "@/lib/constants/filters";
import { subcategoriesMap } from "@/lib/constants/subcategories";
import type { ALL_CATEGORIES_QUERY_RESULT } from "@/sanity.types";

interface ProductFiltersProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
}

function MultiFilterGroup({
  label,
  values,
  onChange,
  options,
  defaultOpen = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: { value: string; label: string; className?: string }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [localValues, setLocalValues] = useState(values);

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const hasSelections = localValues.length > 0;

  const toggle = (optionValue: string) => {
    const next = localValues.includes(optionValue)
      ? localValues.filter((v) => v !== optionValue)
      : [...localValues, optionValue];
    setLocalValues(next);
    onChange(next);
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
      >
        <span className="flex items-center gap-2">
          {label}
          {hasSelections && (
            <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
              ({values.length})
            </span>
          )}
        </span>
        {open ? (
          <Minus
            className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
            strokeWidth={1.5}
          />
        ) : (
          <Plus
            className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
            strokeWidth={1.5}
          />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-1 pb-5">
          {options.map((option) => {
            const isSelected = localValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className="flex items-center gap-2.5 py-1 text-left"
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                      : "border-zinc-300 bg-transparent dark:border-zinc-600"
                  }`}
                >
                  {isSelected && (
                    <Check
                      className="h-2.5 w-2.5 text-white dark:text-zinc-900"
                      strokeWidth={2.5}
                    />
                  )}
                </span>
                <span
                  className={`text-[11px] tracking-[0.05em] transition-colors ${option.className ?? ""} ${
                    isSelected
                      ? "font-medium text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ColorSwatchGroup({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [localValues, setLocalValues] = useState(values);

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const toggle = (colorValue: string) => {
    const next = localValues.includes(colorValue)
      ? localValues.filter((v) => v !== colorValue)
      : [...localValues, colorValue];
    setLocalValues(next);
    onChange(next);
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
      >
        <span className="flex items-center gap-2">
          Colour
          {values.length > 0 && (
            <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
              ({values.length})
            </span>
          )}
        </span>
        {open ? (
          <Minus
            className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
            strokeWidth={1.5}
          />
        ) : (
          <Plus
            className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
            strokeWidth={1.5}
          />
        )}
      </button>

      {open && (
        <div className="pb-5">
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map((color) => {
              const hex = COLOR_SWATCHES[color.value];
              const isActive = localValues.includes(color.value);
              const isWhite = color.value === "white";

              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => toggle(color.value)}
                  title={color.label}
                  className={`group/swatch relative h-6 w-6 rounded-full transition-all ${
                    isActive
                      ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-950"
                      : isWhite
                        ? "ring-1 ring-zinc-300 hover:ring-zinc-400 dark:ring-zinc-600"
                        : "hover:ring-2 hover:ring-zinc-300 hover:ring-offset-1 dark:hover:ring-zinc-600"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentCategories =
    searchParams.get("category")?.split(",").filter(Boolean) ?? [];
  const currentSearch = searchParams.get("q") ?? "";
  const currentTypes =
    searchParams.get("type")?.split(",").filter(Boolean) ?? [];
  const currentColors =
    searchParams.get("color")?.split(",").filter(Boolean) ?? [];
  const currentMaterials =
    searchParams.get("material")?.split(",").filter(Boolean) ?? [];
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
      startTransition(() => {
        router.push(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams],
  );

  const handleClearFilters = () => {
    router.push("/shop", { scroll: false });
  };

  // Build type options based on selected categories
  const typeOptions = (() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    const slugsToCheck = currentCategories.filter((s) => s !== "sale");

    if (slugsToCheck.length > 0) {
      // Show types from selected categories only
      slugsToCheck.forEach((slug) => {
        const subs = subcategoriesMap[slug] ?? [];
        subs.forEach((sub) => {
          if (sub.type && !seen.has(sub.type)) {
            seen.add(sub.type);
            options.push({ value: sub.type, label: sub.label });
          }
        });
      });
    } else {
      // No category selected — show all unique types
      Object.values(subcategoriesMap).forEach((subs) => {
        subs.forEach((sub) => {
          if (sub.type && !seen.has(sub.type)) {
            seen.add(sub.type);
            options.push({ value: sub.type, label: sub.label });
          }
        });
      });
    }

    return options;
  })();

  // Build active filter pills
  const activeFilters: { key: string; label: string; onRemove: () => void }[] =
    [];

  const categoryLookup = Object.fromEntries(
    categories.map((c) => [c.slug ?? "", c.title ?? ""]),
  );

  currentCategories.forEach((slug) => {
    activeFilters.push({
      key: `cat-${slug}`,
      label: slug === "sale" ? "Sale" : (categoryLookup[slug] ?? slug),
      onRemove: () => {
        const remaining = currentCategories.filter((s) => s !== slug);
        updateParams({
          category: remaining.length > 0 ? remaining.join(",") : null,
          type: null,
          q: null,
        });
      },
    });
  });

  currentTypes.forEach((type) => {
    const typeLabel = typeOptions.find((t) => t.value === type)?.label ?? type;
    activeFilters.push({
      key: `type-${type}`,
      label: typeLabel,
      onRemove: () => {
        const remaining = currentTypes.filter((t) => t !== type);
        updateParams({
          type: remaining.length > 0 ? remaining.join(",") : null,
        });
      },
    });
  });

  currentColors.forEach((color) => {
    const colorLabel = COLORS.find((c) => c.value === color)?.label ?? color;
    activeFilters.push({
      key: `color-${color}`,
      label: colorLabel,
      onRemove: () => {
        const remaining = currentColors.filter((c) => c !== color);
        updateParams({
          color: remaining.length > 0 ? remaining.join(",") : null,
        });
      },
    });
  });

  currentMaterials.forEach((mat) => {
    const matLabel = MATERIALS.find((m) => m.value === mat)?.label ?? mat;
    activeFilters.push({
      key: `mat-${mat}`,
      label: matLabel,
      onRemove: () => {
        const remaining = currentMaterials.filter((m) => m !== mat);
        updateParams({
          material: remaining.length > 0 ? remaining.join(",") : null,
        });
      },
    });
  });

  if (urlMinPrice > 0 || urlMaxPrice < 5000) {
    activeFilters.push({
      key: "price",
      label: `$${urlMinPrice.toLocaleString()} – $${urlMaxPrice.toLocaleString()}`,
      onRemove: () => updateParams({ minPrice: null, maxPrice: null }),
    });
  }

  if (currentSearch) {
    activeFilters.push({
      key: "search",
      label: `"${currentSearch}"`,
      onRemove: () => updateParams({ q: null }),
    });
  }

  const hasActiveFilters = activeFilters.length > 0;

  const categoryOptions = [
    {
      value: "sale",
      label: "Sale",
      className: "text-red-600 dark:text-red-400",
    },
    ...categories.map((c) => ({
      value: c.slug ?? "",
      label: c.title ?? "",
    })),
  ];

  const materialOptions = MATERIALS.map((m) => ({
    value: m.value,
    label: m.label,
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Current Filters */}
      {hasActiveFilters && (
        <div className="pb-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
              Current Filters
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
            >
              Clear All
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.onRemove}
                className="group/pill flex items-center gap-1 border border-zinc-200 px-2 py-1 text-[9px] tracking-[0.05em] text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              >
                {filter.label}
                <X
                  className="h-2.5 w-2.5 text-zinc-400 transition-colors group-hover/pill:text-zinc-900 dark:text-zinc-500 dark:group-hover/pill:text-zinc-100"
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable filters area */}
      <div className="flex-1 overflow-y-auto">
        {/* Category */}
        <MultiFilterGroup
          label="Category"
          values={currentCategories}
          onChange={(vals) => {
            if (vals.length === 0) {
              updateParams({ category: null, type: null, q: null });
            } else {
              updateParams({ category: vals.join(","), type: null, q: null });
            }
          }}
          options={categoryOptions}
          defaultOpen
        />

        {/* Type — narrows based on selected category */}
        {typeOptions.length > 0 && (
          <MultiFilterGroup
            label="Type"
            values={currentTypes}
            onChange={(vals) => {
              updateParams({ type: vals.length > 0 ? vals.join(",") : null });
            }}
            options={typeOptions}
            defaultOpen={currentTypes.length > 0}
          />
        )}

        {/* Color - swatches */}
        <ColorSwatchGroup
          values={currentColors}
          onChange={(vals) =>
            updateParams({ color: vals.length > 0 ? vals.join(",") : null })
          }
        />

        {/* Material */}
        <MultiFilterGroup
          label="Material"
          values={currentMaterials}
          onChange={(vals) =>
            updateParams({ material: vals.length > 0 ? vals.join(",") : null })
          }
          options={materialOptions}
        />

        {/* Price Range */}
        <div className="border-t border-zinc-200 dark:border-zinc-700/60">
          <p className="py-5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
            Price Range
          </p>
          <div className="pb-2">
            <Slider
              min={0}
              max={5000}
              step={100}
              value={priceRange}
              onValueChange={(value) =>
                setPriceRange(value as [number, number])
              }
              onValueCommit={([min, max]) =>
                updateParams({
                  minPrice: min > 0 ? min : null,
                  maxPrice: max < 5000 ? max : null,
                })
              }
            />
          </div>
          <div className="flex justify-between pb-5 text-[11px] tabular-nums tracking-wide text-zinc-500 dark:text-zinc-400">
            <span>${priceRange[0].toLocaleString()}</span>
            <span>${priceRange[1].toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
