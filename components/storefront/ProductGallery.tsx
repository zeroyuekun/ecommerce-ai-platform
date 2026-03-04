"use client";

import { useState } from "react";
import Image from "next/image";
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
      <div className="flex aspect-square items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <span className="text-zinc-400">No images available</span>
      </div>
    );
  }

  const selectedImage = images[selectedIndex];
  const hasMultiple = images.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop: thumbnails left + main image right */}
      <div className="flex gap-3">
        {/* Vertical Thumbnails (desktop only) */}
        {hasMultiple && (
          <div className="hidden flex-col gap-2 md:flex">
            {images.map((image, index) => (
              <button
                key={image._key}
                type="button"
                onClick={() => setSelectedIndex(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={selectedIndex === index}
                className={cn(
                  "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 transition-all dark:bg-zinc-800",
                  selectedIndex === index
                    ? "ring-2 ring-zinc-900 dark:ring-zinc-100"
                    : "opacity-60 hover:opacity-100",
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

        {/* Main Image */}
        <div className="relative aspect-square flex-1 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {selectedImage?.asset?.url ? (
            <Image
              src={selectedImage.asset.url}
              alt={productName ?? "Product image"}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              No image
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Thumbnails (mobile only) */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto md:hidden">
          {images.map((image, index) => (
            <button
              key={image._key}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`View image ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={cn(
                "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 transition-all dark:bg-zinc-800",
                selectedIndex === index
                  ? "ring-2 ring-zinc-900 dark:ring-zinc-100"
                  : "opacity-60 hover:opacity-100",
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
  );
}
