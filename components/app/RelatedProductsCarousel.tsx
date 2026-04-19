"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "@/components/app/ProductCard";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { RELATED_PRODUCTS_QUERYResult } from "@/sanity.types";

interface RelatedProductsCarouselProps {
  products: RELATED_PRODUCTS_QUERYResult;
}

export function RelatedProductsCarousel({
  products,
}: RelatedProductsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [_canScrollPrev, setCanScrollPrev] = useState(false);
  const [_canScrollNext, setCanScrollNext] = useState(false);

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

  if (products.length === 0) return null;

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800/50">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
        <h2 className="mb-8 text-center font-serif text-2xl font-normal tracking-[0.02em] text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          You May Also Like
        </h2>

        <div className="relative">
          <button
            type="button"
            onClick={() => api?.scrollPrev()}
            className="absolute left-2 top-[40%] z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Scroll left"
          >
            <ChevronLeft
              className="h-4 w-4 text-zinc-600 dark:text-zinc-300"
              strokeWidth={2}
            />
          </button>

          <button
            type="button"
            onClick={() => api?.scrollNext()}
            className="absolute right-2 top-[40%] z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Scroll right"
          >
            <ChevronRight
              className="h-4 w-4 text-zinc-600 dark:text-zinc-300"
              strokeWidth={2}
            />
          </button>

          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              slidesToScroll: 4,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-5">
              {products.map((product) => (
                <CarouselItem
                  key={product._id}
                  className="basis-1/2 pl-5 sm:basis-1/3 md:basis-1/4"
                >
                  <ProductCard product={product} compact />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
}
