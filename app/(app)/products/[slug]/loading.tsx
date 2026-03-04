import { ProductGallerySkeleton } from "@/components/storefront/ProductGallerySkeleton";
import { ProductInfoSkeleton } from "@/components/storefront/ProductInfoSkeleton";

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-background dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Gallery */}
          <ProductGallerySkeleton />

          {/* Product Info */}
          <ProductInfoSkeleton />
        </div>

        {/* Related Products Skeleton */}
        <div className="mt-16 border-t border-zinc-200 pt-12 dark:border-zinc-800">
          <div className="mb-8 h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
