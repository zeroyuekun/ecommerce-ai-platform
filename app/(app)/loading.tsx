import { CategoryTilesSkeleton } from "@/components/storefront/CategoryTilesSkeleton";
import { ProductFiltersSkeleton } from "@/components/storefront/ProductFiltersSkeleton";
import { ProductGridSkeleton } from "@/components/storefront/ProductGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background dark:bg-zinc-900">
      {/* Page Banner */}
      <div className="border-b border-zinc-200 bg-background dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>

        {/* Category Tiles */}
        <div className="mt-6">
          <CategoryTilesSkeleton />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar Filters */}
          <aside className="w-full shrink-0 lg:w-72">
            <ProductFiltersSkeleton />
          </aside>

          {/* Product Grid */}
          <main className="flex-1">
            {/* Results count */}
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
            </div>

            <ProductGridSkeleton />
          </main>
        </div>
      </div>
    </div>
  );
}
