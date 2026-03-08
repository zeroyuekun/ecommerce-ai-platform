import { sanityFetch } from "@/sanity/lib/live";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { BEST_SELLERS_QUERY } from "@/lib/sanity/queries/products";
import { CategoryTiles } from "@/components/app/CategoryTiles";
import { HeroBanner, SecondaryHeroBanner, VideoHeroBanner } from "@/components/app/HeroBanner";
import { BestSellers } from "@/components/app/BestSellers";
import { StyleGallery } from "@/components/app/StyleGallery";

export default async function HomePage() {
  const [{ data: categories }, { data: bestSellers }] = await Promise.all([
    sanityFetch({ query: ALL_CATEGORIES_QUERY }),
    sanityFetch({ query: BEST_SELLERS_QUERY }),
  ]);

  return (
    <div className="-mt-[calc(4rem+41px)] min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero banner — full screen behind transparent header */}
      <div>
        <HeroBanner />
      </div>

      {/* Category Tiles with heading */}
      <div className="bg-white dark:bg-zinc-950">
        <CategoryTiles categories={categories} />
      </div>

      {/* Second hero banner — The Rorie Bed */}
      <div className="mt-16">
        <SecondaryHeroBanner />
      </div>

      {/* Best Sellers carousel */}
      <BestSellers products={bestSellers} />

      {/* Fresh Foundations video banner */}
      <VideoHeroBanner />

      {/* Style Gallery grid */}
      <StyleGallery />
    </div>
  );
}
