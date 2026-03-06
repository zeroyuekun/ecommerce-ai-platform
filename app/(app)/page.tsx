import { sanityFetch } from "@/sanity/lib/live";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { CategoryTiles } from "@/components/app/CategoryTiles";
import { PromoBanner } from "@/components/app/PromoBanner";
import { HeroBanner, SecondaryHeroBanner } from "@/components/app/HeroBanner";

export default async function HomePage() {
  const { data: categories } = await sanityFetch({
    query: ALL_CATEGORIES_QUERY,
  });

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Promo discount strip */}
      <PromoBanner />

      {/* Hero banner */}
      <HeroBanner />

      {/* Category Tiles with heading */}
      <div className="bg-white dark:bg-zinc-950">
        <CategoryTiles categories={categories} />
      </div>

      {/* Second hero banner — The Rorie Bed */}
      <div className="mt-12">
        <SecondaryHeroBanner />
      </div>
    </div>
  );
}
