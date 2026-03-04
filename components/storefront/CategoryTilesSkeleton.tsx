import { Skeleton } from "@/components/ui/skeleton";

export function CategoryTilesSkeleton() {
  return (
    <div className="relative px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden">
        <div className="flex -ml-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="pl-3 min-w-0 shrink-0 grow-0 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            >
              <Skeleton className="aspect-[3/2] w-full rounded-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
