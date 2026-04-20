import { Skeleton } from "@/components/ui/skeleton";

export function ProductGallerySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Desktop: Vertical thumbnails + main image */}
      <div className="hidden sm:flex sm:gap-3">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count skeleton placeholders, position IS the identity
              key={i}
              className="h-[72px] w-[72px] shrink-0 lg:h-[80px] lg:w-[80px]"
            />
          ))}
        </div>
        <Skeleton className="aspect-square flex-1" />
      </div>

      {/* Mobile: Main image + horizontal thumbnails */}
      <div className="sm:hidden">
        <Skeleton className="aspect-square w-full" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count skeleton placeholders, position IS the identity
            <Skeleton key={i} className="h-16 w-16 shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
