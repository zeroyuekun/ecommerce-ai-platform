"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PRODUCT_BY_SLUG_QUERY_RESULT } from "@/sanity.types";

type ProductImages = NonNullable<
  NonNullable<PRODUCT_BY_SLUG_QUERY_RESULT>["images"]
>;

interface ProductGalleryProps {
  images: ProductImages | null;
  productName: string | null;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-400">
          No images available
        </span>
      </div>
    );
  }

  const selectedImage = images[selectedIndex];

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop: Vertical thumbnails left + main image right */}
      <div className="hidden sm:flex sm:gap-3">
        {/* Vertical thumbnail strip */}
        {images.length > 1 && (
          <div className="flex flex-col gap-2">
            {images.map((image, index) => (
              <button
                key={image._key}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={selectedIndex === index}
                className={cn(
                  "relative h-[72px] w-[72px] shrink-0 overflow-hidden bg-zinc-50 transition-all lg:h-[80px] lg:w-[80px] dark:bg-zinc-900",
                  selectedIndex === index
                    ? "ring-1 ring-zinc-900 dark:ring-zinc-100"
                    : "opacity-50 hover:opacity-100",
                )}
              >
                {image.asset?.url ? (
                  <Image
                    src={image.asset.url}
                    alt={`${productName} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    N/A
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="relative flex-1 aspect-square overflow-hidden bg-zinc-50 dark:bg-zinc-900">
          {selectedImage?.asset?.url ? (
            <Image
              src={selectedImage.asset.url}
              alt={productName ?? "Product image"}
              fill
              className="object-contain transition-opacity duration-500"
              sizes="(max-width: 1024px) 80vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              No image
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Main image + horizontal thumbnails below */}
      <div className="sm:hidden">
        <div className="relative aspect-square overflow-hidden bg-zinc-50 dark:bg-zinc-900">
          {selectedImage?.asset?.url ? (
            <Image
              src={selectedImage.asset.url}
              alt={productName ?? "Product image"}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              No image
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={image._key}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={selectedIndex === index}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden bg-zinc-50 transition-all dark:bg-zinc-900",
                  selectedIndex === index
                    ? "ring-1 ring-zinc-900 dark:ring-zinc-100"
                    : "opacity-50 hover:opacity-100",
                )}
              >
                {image.asset?.url ? (
                  <Image
                    src={image.asset.url}
                    alt={`${productName} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    N/A
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
