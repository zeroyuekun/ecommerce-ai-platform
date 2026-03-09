import { ProductGallerySkeleton } from "@/components/app/ProductGallerySkeleton";
import { ProductInfoSkeleton } from "@/components/app/ProductInfoSkeleton";

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Breadcrumb skeleton */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2">
            <div className="h-3 w-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>

      {/* Product content skeleton */}
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-16 xl:grid-cols-[1fr_460px]">
          <ProductGallerySkeleton />
          <ProductInfoSkeleton />
        </div>
      </div>
    </div>
  );
}
