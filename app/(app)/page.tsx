import { Suspense } from "react";
import { sanityFetch } from "@/sanity/lib/live";
import {
  FEATURED_PRODUCTS_QUERY,
  FILTER_PRODUCTS_BY_NAME_QUERY,
  FILTER_PRODUCTS_BY_NAME_DESC_QUERY,
  FILTER_PRODUCTS_BY_PRICE_ASC_QUERY,
  FILTER_PRODUCTS_BY_PRICE_DESC_QUERY,
  FILTER_PRODUCTS_BY_RELEVANCE_QUERY,
  FILTER_PRODUCTS_BY_NEWEST_QUERY,
  FILTER_PRODUCTS_BY_POPULAR_QUERY,
  FILTER_PRODUCTS_BY_RATING_QUERY,
} from "@/lib/sanity/queries/products";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { ProductSection } from "@/components/storefront/ProductSection";
import { CategoryTiles } from "@/components/storefront/CategoryTiles";
import { FeaturedCarousel } from "@/components/storefront/FeaturedCarousel";
import { FeaturedCarouselSkeleton } from "@/components/storefront/FeaturedCarouselSkeleton";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    color?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
    productType?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const searchQuery = params.q ?? "";
  const categorySlug = params.category ?? "";
  const color = params.color ?? "";
  const material = params.material ?? "";
  const minPrice = Number(params.minPrice) || 0;
  const maxPrice = Number(params.maxPrice) || 0;
  const sort = params.sort ?? "name";
  const inStock = params.inStock === "true";
  const productType = params.productType ?? "";

  // Select query based on sort parameter
  const getQuery = () => {
    switch (sort) {
      case "name_desc":
        return FILTER_PRODUCTS_BY_NAME_DESC_QUERY;
      case "price_asc":
        return FILTER_PRODUCTS_BY_PRICE_ASC_QUERY;
      case "price_desc":
        return FILTER_PRODUCTS_BY_PRICE_DESC_QUERY;
      case "relevance":
        return FILTER_PRODUCTS_BY_POPULAR_QUERY;
      case "newest":
        return FILTER_PRODUCTS_BY_NEWEST_QUERY;
      case "rating":
        return FILTER_PRODUCTS_BY_RATING_QUERY;
      default:
        return FILTER_PRODUCTS_BY_NAME_QUERY;
    }
  };

  // Fetch products with filters (server-side via GROQ)
  const { data: products } = await sanityFetch({
    query: getQuery(),
    params: {
      searchQuery,
      categorySlug,
      color,
      material,
      minPrice,
      maxPrice,
      inStock,
      productType,
    },
  });

  // Fetch categories for filter sidebar
  const { data: categories } = await sanityFetch({
    query: ALL_CATEGORIES_QUERY,
  });

  // Fetch featured products for carousel
  const { data: featuredProducts } = await sanityFetch({
    query: FEATURED_PRODUCTS_QUERY,
  });

  // Show filters when any filter param is active (category, search, color, etc.)
  const hasActiveFilters = !!(
    categorySlug || searchQuery || color || material || minPrice || maxPrice > 0 || inStock || productType
  );

  return (
    <div className="min-h-screen bg-background dark:bg-zinc-900">
      {/* Featured Products Carousel */}
      {featuredProducts.length > 0 && (
        <Suspense fallback={<FeaturedCarouselSkeleton />}>
          <FeaturedCarousel products={featuredProducts} />
        </Suspense>
      )}

      {/* Page Banner */}
      <div className="px-4 pt-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
          Shop {categorySlug ? categorySlug : "All Products"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Premium furniture for your home
        </p>
      </div>

      {/* Category Tiles - below heading */}
      <div className="mt-6">
        <CategoryTiles
          categories={categories}
          activeCategory={categorySlug || undefined}
        />
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <ProductSection
          categories={categories}
          products={products}
          searchQuery={searchQuery}
          showFilters={hasActiveFilters}
          showToolbar={hasActiveFilters}
        />
      </div>
    </div>
  );
}