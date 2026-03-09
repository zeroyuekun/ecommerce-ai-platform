import { CategoryTilesSkeleton } from "@/components/app/CategoryTilesSkeleton";
import { ProductGridSkeleton } from "@/components/app/ProductGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Page Banner */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 lg:px-10">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>

        {/* Category Tiles */}
        <div className="mt-6">
          <CategoryTilesSkeleton />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10">
        {/* Top bar skeleton */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800/50">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Product Grid */}
        <div className="pt-6">
          <ProductGridSkeleton />
        </div>
      </div>
    </div>
  );
}
