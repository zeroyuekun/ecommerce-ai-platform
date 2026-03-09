import { Skeleton } from "@/components/ui/skeleton";

export function ProductInfoSkeleton() {
  return (
    <div className="flex flex-col">
      {/* Category */}
      <Skeleton className="h-3 w-20" />

      {/* Title */}
      <Skeleton className="mt-2 h-8 w-3/4" />

      {/* Price */}
      <Skeleton className="mt-4 h-7 w-24" />

      {/* Description */}
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Delivery bar */}
      <Skeleton className="mt-5 h-12 w-full" />

      {/* Color swatches */}
      <div className="mt-6">
        <Skeleton className="h-3 w-16" />
        <div className="mt-2.5 flex gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>

      {/* Add to Cart */}
      <Skeleton className="mt-6 h-[52px] w-full" />

      {/* AI button */}
      <Skeleton className="mt-3 h-[52px] w-full" />

      {/* Accordion sections */}
      <div className="mt-8 space-y-0">
        <div className="border-t border-zinc-200 py-4 dark:border-zinc-800">
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="border-t border-zinc-200 py-4 dark:border-zinc-800">
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="border-t border-zinc-200 py-4 dark:border-zinc-800">
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}
