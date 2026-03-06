import Link from "next/link";

export function PromoBanner() {
  return (
    <div className="bg-zinc-900 dark:bg-zinc-800">
      <div className="flex items-center justify-center gap-2 px-4 py-2.5 text-center text-sm text-white">
        <span className="font-medium">End of Season Sale</span>
        <span className="text-zinc-400">|</span>
        <span>Up to 50% Off Selected Styles</span>
        <Link
          href="/?sort=price_asc"
          className="ml-2 underline underline-offset-4 transition-colors hover:text-zinc-300"
        >
          Shop Now
        </Link>
      </div>
    </div>
  );
}
