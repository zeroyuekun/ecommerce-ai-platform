import { Skeleton } from "@/components/ui/skeleton";

export function ProductFiltersSkeleton() {
  return (
    <div className="flex flex-col">
      {/* Available Now */}
      <div className="border-t border-zinc-200 py-5 dark:border-zinc-700/60">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Search */}
      <div className="border-t border-zinc-200 py-5 dark:border-zinc-700/60">
        <Skeleton className="h-6 w-full" />
      </div>

      {/* Filter groups */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-t border-zinc-200 py-5 dark:border-zinc-700/60">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      ))}

      {/* Price Range */}
      <div className="border-t border-zinc-200 py-5 dark:border-zinc-700/60">
        <Skeleton className="mb-4 h-3 w-24" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
    </div>
  );
}
