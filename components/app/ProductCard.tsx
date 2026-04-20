"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";
import { COLOR_SWATCHES } from "@/lib/constants/filters";
import { cn, formatPrice } from "@/lib/utils";
import type { FILTER_PRODUCTS_BY_NAME_QUERYResult } from "@/sanity.types";
import type { VariantInfo } from "./ProductGrid";

type Product = FILTER_PRODUCTS_BY_NAME_QUERYResult[number] & {
  variants?: VariantInfo[];
};

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  compact = false,
}: ProductCardProps) {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  const variants = product.variants;
  const hasVariants = variants && variants.length > 1;

  // Use active variant data if available
  const activeVariant = hasVariants ? variants[activeVariantIndex] : null;

  const imageUrl = activeVariant?.imageUrl ?? product.images?.[0]?.asset?.url;
  const slug = activeVariant?.slug ?? product.slug;
  const color = activeVariant?.color ?? product.color;
  const price = activeVariant?.price ?? product.price;
  const salePrice = activeVariant?.salePrice ?? product.salePrice;
  const stock = activeVariant?.stock ?? product.stock ?? 0;
  const isNew =
    activeVariant?.isNew ?? ("isNew" in product ? product.isNew : false);

  const isOutOfStock = stock <= 0;
  const isOnSale = salePrice != null && salePrice < (price ?? 0);

  return (
    <div className="group flex flex-col">
      {/* Image */}
      <Link href={`/products/${slug}`} className="relative block">
        <div
          className={cn(
            "relative overflow-hidden bg-zinc-100 dark:bg-zinc-800/50",
            compact ? "aspect-square" : "aspect-square",
          )}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name ?? "Product image"}
              fill
              className="object-cover transition-all duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Sold Out
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div
        className={cn(
          "flex flex-col items-start",
          compact ? "gap-1 pt-2" : "gap-1.5 pt-4",
        )}
      >
        {/* Color swatches */}
        {hasVariants ? (
          <div className="flex items-center gap-1.5">
            {variants.map((variant, index) => {
              const hex = variant.color ? COLOR_SWATCHES[variant.color] : null;
              if (!hex) return null;
              const isActive = index === activeVariantIndex;
              return (
                <button
                  key={variant.slug}
                  type="button"
                  onClick={() => setActiveVariantIndex(index)}
                  title={
                    variant.color.charAt(0).toUpperCase() +
                    variant.color.slice(1)
                  }
                  className={cn(
                    "h-3.5 w-3.5 rounded-full transition-all",
                    isActive
                      ? "ring-1 ring-zinc-900 ring-offset-1 dark:ring-zinc-100 dark:ring-offset-zinc-950"
                      : "ring-1 ring-zinc-200 hover:ring-zinc-400 dark:ring-zinc-600 dark:hover:ring-zinc-400",
                    variant.color === "white" &&
                      "ring-1 ring-zinc-300 dark:ring-zinc-500",
                  )}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        ) : (
          color &&
          COLOR_SWATCHES[color] && (
            <span
              className={cn(
                "inline-block h-3 w-3 rounded-full",
                color === "white" && "ring-1 ring-zinc-300 dark:ring-zinc-600",
              )}
              style={{ backgroundColor: COLOR_SWATCHES[color] }}
              title={color.charAt(0).toUpperCase() + color.slice(1)}
            />
          )
        )}

        {/* New badge */}
        {isNew && (
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
            New
          </span>
        )}

        <Link href={`/products/${slug}`} className="group/link">
          <h3 className="line-clamp-2 font-serif text-[13px] font-normal leading-relaxed tracking-[0.04em] text-zinc-800 transition-colors group-hover/link:text-zinc-500 dark:text-zinc-200 dark:group-hover/link:text-zinc-400 sm:text-sm">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-baseline gap-2">
          {isOnSale ? (
            <>
              <p className="text-[13px] font-medium tracking-[0.02em] text-red-600 dark:text-red-400">
                {formatPrice(salePrice)}
              </p>
              <p className="text-[11px] font-normal tracking-[0.02em] text-zinc-400 line-through dark:text-zinc-500">
                {formatPrice(price)}
              </p>
            </>
          ) : (
            <p className="text-[13px] font-medium tracking-[0.02em] text-zinc-900 dark:text-zinc-100">
              {formatPrice(price)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
