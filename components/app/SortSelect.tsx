"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { SORT_OPTIONS } from "@/lib/constants/filters";

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "featured";
  const [open, setOpen] = useState(false);

  const _currentLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "Featured";

  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "featured") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
      router.push(`?${params.toString()}`, { scroll: false });
      setOpen(false);
    },
    [router, searchParams],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        Sort by
        <ChevronDown
          className={`h-3 w-3 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {SORT_OPTIONS.map((option) => {
              const isActive = currentSort === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSortChange(option.value)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.1em] transition-colors ${
                    isActive
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {option.label}
                  {isActive && (
                    <Check
                      className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100"
                      strokeWidth={2}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
