"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

import type { ALL_CATEGORIES_QUERY_RESULT } from "@/sanity.types";

interface CategoryTilesProps {
  categories: ALL_CATEGORIES_QUERY_RESULT;
  activeCategory?: string;
}

export function CategoryTiles({
  categories,
  activeCategory,
}: CategoryTilesProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div>
      {/* Heading */}
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-6 sm:px-6 text-center">
        <h2 className="text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Shop by Room
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          At Kozy, we make it easy for you to create your dream space. Shop
          furniture online that is stylish, functional, and affordable.
        </p>
      </div>

      {/* Carousel */}
      <div className="relative px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => api?.scrollPrev()}
          className="absolute left-10 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-300" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => api?.scrollNext()}
          className="absolute right-10 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4 text-zinc-600 dark:text-zinc-300" strokeWidth={2} />
        </button>

        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2.5">
            {categories.map((category) => {
              const isActive = activeCategory === category.slug;
              const imageUrl = category.image?.asset?.url;

              return (
                <CarouselItem
                  key={category._id}
                  className="pl-2.5 basis-auto"
                >
                  <Link
                    href={`/shop?category=${category.slug}`}
                    draggable={false}
                    className={`group relative block overflow-hidden transition-all duration-300 ${
                      isActive
                        ? "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-zinc-900"
                        : ""
                    }`}
                  >
                    <div className="relative h-44 w-64 sm:h-64 sm:w-80">
                      <Image
                        src={imageUrl ?? `/categories/${category.slug}.jpg`}
                        alt={category.title ?? "Category"}
                        fill
                        draggable={false}
                        className="pointer-events-none object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium uppercase tracking-[0.15em] text-white drop-shadow-md">
                          {category.title}
                        </span>
                      </div>
                      {isActive && (
                        <div className="absolute top-2 right-2">
                          <span className="flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}
