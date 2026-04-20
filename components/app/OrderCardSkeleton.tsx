import { Skeleton } from "@/components/ui/skeleton";

interface OrderCardSkeletonProps {
  count?: number;
}

export function OrderCardSkeleton({ count = 3 }: OrderCardSkeletonProps) {
  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
      {Array.from({ length: count }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count skeleton placeholders, position IS the identity
          key={i}
          className="flex items-center gap-5 py-6 first:pt-0 last:pb-0 sm:gap-6"
        >
          <Skeleton className="h-20 w-20 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-end justify-between">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
