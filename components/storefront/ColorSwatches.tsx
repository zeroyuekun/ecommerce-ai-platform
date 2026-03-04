"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mocka-inspired color palette — ordered light to dark */
const COLOR_ORDER: string[] = [
  "white",
  "cream",
  "natural birch",
  "natural",
  "oak",
  "beige",
  "putty",
  "latte",
  "tan",
  "camel",
  "caramel",
  "pecan",
  "walnut",
  "chocolate",
  "rust",
  "brick",
  "bronze",
  "gold",
  "pink",
  "dusty pink",
  "blush",
  "lilac",
  "ice blue",
  "sage",
  "sage green",
  "green",
  "forest green",
  "grey",
  "midnight",
  "black",
];

const COLOR_HEX_MAP: Record<string, string> = {
  white: "#ffffff",
  cream: "#f5f0e8",
  "natural birch": "#e0ceaa",
  natural: "#d4b896",
  oak: "#c4a882",
  beige: "#d4c5a9",
  putty: "#c8bfae",
  latte: "#b8a48c",
  tan: "#d2b48c",
  camel: "#c19a6b",
  caramel: "#a0724a",
  pecan: "#8b6914",
  walnut: "#5c4033",
  chocolate: "#3c1f0e",
  rust: "#b7410e",
  brick: "#a0522d",
  bronze: "#8c7853",
  gold: "#c5a255",
  pink: "#e8b4b8",
  "dusty pink": "#d4a0a0",
  blush: "#de98a0",
  lilac: "#c8a2c8",
  "ice blue": "#a5c8d4",
  sage: "#b2ac88",
  "sage green": "#b2ac88",
  green: "#7c9070",
  "forest green": "#2d5a27",
  grey: "#9ca3af",
  midnight: "#2c3e50",
  black: "#1a1a1a",
};

interface ColorVariant {
  _id: string;
  name: string | null;
  color: string | null;
  slug: string | null;
  image: { asset: { url: string | null } | null } | null;
}

interface ColorSwatchesProps {
  currentColor: string | null;
  variants: ColorVariant[];
}

export function ColorSwatches({ currentColor, variants }: ColorSwatchesProps) {
  const allSwatches = [
    { color: currentColor, slug: null, isActive: true },
    ...variants.map((v) => ({
      color: v.color,
      slug: v.slug,
      isActive: false,
    })),
  ].sort((a, b) => {
    const aIdx = COLOR_ORDER.indexOf((a.color ?? "").toLowerCase());
    const bIdx = COLOR_ORDER.indexOf((b.color ?? "").toLowerCase());
    // Unknown colors go to the end, sorted alphabetically among themselves
    if (aIdx === -1 && bIdx === -1)
      return (a.color ?? "").localeCompare(b.color ?? "");
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  if (allSwatches.length <= 1) return null;

  return (
    <div className="mt-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Colour:{" "}
        <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
          {currentColor}
        </span>
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        {allSwatches.map((item) => {
          const hex =
            COLOR_HEX_MAP[(item.color ?? "").toLowerCase()] ?? "#d4d4d8";
          const isLight =
            item.color === "white" ||
            item.color === "cream" ||
            item.color === "beige" ||
            item.color === "natural birch";

          const dot = (
            <span
              className={cn(
                "block h-7 w-7 rounded-full transition-all",
                item.isActive
                  ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-900"
                  : "hover:ring-2 hover:ring-zinc-300 hover:ring-offset-2 dark:hover:ring-zinc-600 dark:hover:ring-offset-zinc-900",
                isLight && "border border-zinc-200 dark:border-zinc-600",
              )}
              style={{ backgroundColor: hex }}
              title={item.color ?? undefined}
            />
          );

          if (item.isActive || !item.slug) {
            return (
              <span key={item.color ?? "unknown"} className="cursor-default">
                {dot}
              </span>
            );
          }

          return (
            <Link
              key={item.color ?? "unknown"}
              href={`/products/${item.slug}`}
              aria-label={`View in ${item.color}`}
            >
              {dot}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
