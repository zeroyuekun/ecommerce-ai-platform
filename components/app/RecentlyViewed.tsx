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
import { useRecentlyViewedIds } from "@/lib/store/recently-viewed-store-provider";
import { getProductsByIds } from "@/lib/actions/products";
import type { PRODUCTS_BY_IDS_FULL_QUERY_RESULT } from "@/sanity.types";

export function RecentlyViewed() {
  const productIds = useRecentlyViewedIds();
  const [products, setProducts] = useState<PRODUCTS_BY_IDS_FULL_QUERY_RESULT>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getProductsByIds(productIds).then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, [productIds]);

  if (loading || products.length === 0) return null;

  return (
    <div className="border-t border-zinc-100 bg-zinc-50 py-14 dark:border-zinc-800/50 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
              Your Browsing History
            </p>
            <h2 className="mt-2 text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              Recently Viewed
            </h2>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => api?.scrollPrev()}
              disabled={!canScrollPrev}
              className="flex h-9 w-9 items-center justify-center border border-zinc-200 transition-colors hover:border-zinc-400 disabled:opacity-30 dark:border-zinc-700 dark:hover:border-zinc-500"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-300" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => api?.scrollNext()}
              disabled={!canScrollNext}
              className="flex h-9 w-9 items-center justify-center border border-zinc-200 transition-colors hover:border-zinc-400 disabled:opacity-30 dark:border-zinc-700 dark:hover:border-zinc-500"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4 text-zinc-600 dark:text-zinc-300" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            slidesToScroll: 4,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {products.map((product) => (
              <CarouselItem
                key={product._id}
                className="basis-1/2 pl-4 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
              >
                <ProductCard product={product} compact />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}
