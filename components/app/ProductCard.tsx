"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { COLOR_SWATCHES } from "@/lib/constants/filters";
import type { FILTER_PRODUCTS_BY_NAME_QUERY_RESULT } from "@/sanity.types";

type Product = FILTER_PRODUCTS_BY_NAME_QUERY_RESULT[number];

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const images = product.images ?? [];
  const mainImageUrl = images[0]?.asset?.url;

  const stock = product.stock ?? 0;
  const isOutOfStock = stock <= 0;
  const isOnSale = product.salePrice != null && product.salePrice < (product.price ?? 0);

  return (
    <div
      className="group flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <Link href={`/products/${product.slug}`} className="relative block">
        <div className={cn("relative overflow-hidden bg-zinc-100 dark:bg-zinc-800/50", compact ? "aspect-square" : "aspect-[3/4]")}>
          {mainImageUrl ? (
            <Image
              src={mainImageUrl}
              alt={product.name ?? "Product image"}
              fill
              className={cn(
                "object-cover transition-all duration-700 ease-out",
                isHovered && "scale-105",
              )}
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
      <div className={cn("flex flex-col items-center text-center", compact ? "gap-1 pt-2" : "gap-1.5 pt-4")}>
        {/* Color swatch */}
        {product.color && COLOR_SWATCHES[product.color] && (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-3 w-3 rounded-full",
                product.color === "white" && "ring-1 ring-zinc-300 dark:ring-zinc-600",
              )}
              style={{ backgroundColor: COLOR_SWATCHES[product.color] }}
              title={product.color.charAt(0).toUpperCase() + product.color.slice(1)}
            />
          </div>
        )}

        <Link href={`/products/${product.slug}`} className="group/link">
          <h3 className="line-clamp-2 font-serif text-[13px] font-normal leading-relaxed tracking-[0.04em] text-zinc-800 transition-colors group-hover/link:text-zinc-500 dark:text-zinc-200 dark:group-hover/link:text-zinc-400 sm:text-sm">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-baseline justify-center gap-2">
          {isOnSale ? (
            <>
              <p className="text-[13px] font-medium tracking-[0.02em] text-red-600 dark:text-red-400">
                {formatPrice(product.salePrice)}
              </p>
              <p className="text-[11px] font-normal tracking-[0.02em] text-zinc-400 line-through dark:text-zinc-500">
                {formatPrice(product.price)}
              </p>
            </>
          ) : (
            <p className="text-[13px] font-medium tracking-[0.02em] text-zinc-900 dark:text-zinc-100">
              {formatPrice(product.price)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
