"use client";

import Link from "next/link";
import Image from "next/image";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
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
  if (categories.length === 0) return null;

  return (
    <div className="relative px-4 sm:px-6 lg:px-8">
      <Carousel
        opts={{
          align: "start",
          loop: true,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {categories.map((category) => {
            const isActive = activeCategory === category.slug;
            const imageUrl = category.image?.asset?.url;

            return (
              <CarouselItem
                key={category._id}
                className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
              >
                <Link
                  href={`/?category=${category.slug}`}
                  className={`group relative block overflow-hidden rounded-none transition-all duration-300 ${
                    isActive
                      ? "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-zinc-900"
                      : "hover:ring-2 hover:ring-zinc-300 hover:ring-offset-2 dark:hover:ring-zinc-600 dark:hover:ring-offset-zinc-900"
                  }`}
                >
                  <div className="relative aspect-[3/2]">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={category.title ?? "Category"}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 group-hover:from-black/80" />

                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                      <span className="text-sm font-medium text-white drop-shadow-md sm:text-base">
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

        <CarouselPrevious className="-left-3 sm:-left-4 border-0 bg-black/20 text-white/80 backdrop-blur-sm hover:bg-black/30 hover:text-white" />
        <CarouselNext className="-right-3 sm:-right-4 border-0 bg-black/20 text-white/80 backdrop-blur-sm hover:bg-black/30 hover:text-white" />
      </Carousel>
    </div>
  );
}
