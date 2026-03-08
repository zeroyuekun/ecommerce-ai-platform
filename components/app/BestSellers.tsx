"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/app/ProductCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { BEST_SELLERS_QUERYResult } from "@/sanity.types";

interface BestSellersProps {
  products: BEST_SELLERS_QUERYResult;
}

export function BestSellers({ products }: BestSellersProps) {
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

  if (products.length === 0) return null;

  return (
    <div className="bg-white py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 pb-8 text-center sm:px-6">
        <h2 className="text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Best Sellers
        </h2>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <button
            type="button"
            onClick={() => api?.scrollPrev()}
            className="absolute left-2 top-[40%] z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-300" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => api?.scrollNext()}
            className="absolute right-2 top-[40%] z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4 text-zinc-600 dark:text-zinc-300" strokeWidth={2} />
          </button>

          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              slidesToScroll: 4,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-6">
              {products.map((product) => (
                <CarouselItem
                  key={product._id}
                  className="pl-6 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
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
