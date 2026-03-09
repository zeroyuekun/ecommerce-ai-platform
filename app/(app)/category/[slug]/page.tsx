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
} from "@/lib/sanity/queries/products";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { ProductSection } from "@/components/app/ProductSection";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    color?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const title =
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
  return {
    title,
    description: `Shop our ${title.toLowerCase()} collection. Premium furniture and homewares at Kozy.`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const searchQuery = sp.q ?? "";
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
      categorySlugs: [slug],
      productTypes,
      colors,
      materials,
      minPrice,
      maxPrice,
      inStock,
    },
  });

  const { data: categories } = await sanityFetch({
    query: ALL_CATEGORIES_QUERY,
  });

  const categoryTitle = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

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
            <Link
              href="/shop"
              className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Shop
            </Link>
            <span>/</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {categoryTitle}
            </span>
          </nav>
        </div>
      </div>

      {/* Category Header */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <h1 className="text-center text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl lg:text-5xl">
            {categoryTitle}
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
    </div>
  );
}
