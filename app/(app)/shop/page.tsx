import type { Metadata } from "next";
import { sanityFetch } from "@/sanity/lib/live";
import {
  FILTER_PRODUCTS_BY_NAME_QUERY,
  FILTER_PRODUCTS_BY_NAME_DESC_QUERY,
  FILTER_PRODUCTS_BY_NEWEST_QUERY,
  FILTER_PRODUCTS_BY_PRICE_ASC_QUERY,
  FILTER_PRODUCTS_BY_PRICE_DESC_QUERY,
  FILTER_PRODUCTS_BY_BEST_SELLING_QUERY,
  FILTER_PRODUCTS_BY_RELEVANCE_QUERY,
  POPULAR_PRODUCTS_QUERY,
} from "@/lib/sanity/queries/products";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { ProductSection } from "@/components/app/ProductSection";
import { HaveYouSeenThis } from "@/components/app/HaveYouSeenThis";
import { RecentlyViewed } from "@/components/app/RecentlyViewed";
import { getSubcategoryLabel } from "@/lib/constants/subcategories";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our full collection of premium furniture and homewares. Filter by category, colour, material, and price.",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    type?: string;
    color?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
  }>;
}

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const searchQuery = sp.q ?? "";
  const categorySlugs = sp.category ? sp.category.split(",").filter(Boolean) : [];
  const productTypes = sp.type ? sp.type.split(",").filter(Boolean) : [];
  const colors = sp.color ? sp.color.split(",") : [];
  const materials = sp.material ? sp.material.split(",") : [];
  const minPrice = Number(sp.minPrice) || 0;
  const maxPrice = Number(sp.maxPrice) || 0;
  const sort = sp.sort ?? "featured";
  const inStock = sp.inStock === "true";

  const getQuery = () => {
    if (searchQuery && sort === "featured") {
      return FILTER_PRODUCTS_BY_RELEVANCE_QUERY;
    }
    switch (sort) {
      case "name_asc":
        return FILTER_PRODUCTS_BY_NAME_QUERY;
      case "name_desc":
        return FILTER_PRODUCTS_BY_NAME_DESC_QUERY;
      case "newest":
        return FILTER_PRODUCTS_BY_NEWEST_QUERY;
      case "price_asc":
        return FILTER_PRODUCTS_BY_PRICE_ASC_QUERY;
      case "price_desc":
        return FILTER_PRODUCTS_BY_PRICE_DESC_QUERY;
      case "best_selling":
        return FILTER_PRODUCTS_BY_BEST_SELLING_QUERY;
      default:
        return FILTER_PRODUCTS_BY_NAME_QUERY;
    }
  };

  const { data: products } = await sanityFetch({
    query: getQuery(),
    params: {
      searchQuery,
      categorySlugs,
      productTypes,
      colors,
      materials,
      minPrice,
      maxPrice,
      inStock,
    },
  });

  const [{ data: categories }, { data: popularProducts }] = await Promise.all([
    sanityFetch({ query: ALL_CATEGORIES_QUERY }),
    sanityFetch({ query: POPULAR_PRODUCTS_QUERY }),
  ]);

  const isSaleFilter = categorySlugs.length === 1 && categorySlugs[0] === "sale";
  const activeCategory = categorySlugs.length === 1 && !isSaleFilter
    ? categories.find((c) => c.slug === categorySlugs[0])
    : null;
  const subcategoryLabel = categorySlugs.length === 1
    ? getSubcategoryLabel(categorySlugs[0], searchQuery, productTypes[0])
    : null;
  const heading = isSaleFilter
    ? "Sale"
    : categorySlugs.length > 1
      ? categories.filter((c) => categorySlugs.includes(c.slug ?? "")).map((c) => c.title).join(", ")
      : subcategoryLabel ?? activeCategory?.title ?? "All Products";

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Breadcrumb */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 lg:px-10">
          <nav className="flex items-center gap-2 text-xs tracking-wide text-zinc-400 dark:text-zinc-500">
            <Link
              href="/"
              className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Home
            </Link>
            <span>/</span>
            {categorySlugs.length > 0 ? (
              <>
                <Link
                  href="/shop"
                  className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Shop
                </Link>
                <span>/</span>
                {subcategoryLabel && activeCategory ? (
                  <>
                    <Link
                      href={`/shop?category=${categorySlugs[0]}`}
                      className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      {activeCategory.title}
                    </Link>
                    <span>/</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {subcategoryLabel}
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {heading}
                  </span>
                )}
              </>
            ) : (
              <span className="text-zinc-700 dark:text-zinc-300">Shop</span>
            )}
          </nav>
        </div>
      </div>

      {/* Category Header */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <h1 className="text-center text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl lg:text-5xl">
            {heading}
          </h1>
        </div>
      </div>

      {/* Products Section */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10">
        <ProductSection
          categories={categories}
          products={products}
          searchQuery={searchQuery}
        />
      </div>

      {/* Have You Seen This? */}
      <HaveYouSeenThis products={popularProducts} />

      {/* Recently Viewed */}
      <RecentlyViewed />
    </div>
  );
}
