import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { sanityFetch } from "@/sanity/lib/live";
import {
  PRODUCT_BY_SLUG_QUERY,
  VARIANT_SIBLINGS_FULL_QUERY,
  RELATED_PRODUCTS_QUERY,
} from "@/lib/sanity/queries/products";
import { ProductDetail } from "@/components/app/ProductDetail";
import { ProductCard } from "@/components/app/ProductCard";
import { RecentlyViewed } from "@/components/app/RecentlyViewed";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const { data: product } = await sanityFetch({
    query: PRODUCT_BY_SLUG_QUERY,
    params: { slug },
  });

  if (!product) {
    notFound();
  }

  const [{ data: variants }, { data: relatedProducts }] = await Promise.all([
    sanityFetch({
      query: VARIANT_SIBLINGS_FULL_QUERY,
      params: { variantGroup: product.variantGroup ?? "" },
    }),
    sanityFetch({
      query: RELATED_PRODUCTS_QUERY,
      params: {
        categorySlug: product.category?.slug ?? "",
        currentSlug: slug,
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Breadcrumb */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 lg:px-10">
          <nav className="flex items-center gap-1.5 text-[11px] tracking-[0.05em] text-zinc-400 dark:text-zinc-500">
            <Link
              href="/"
              className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Home
            </Link>
            <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
            <Link
              href="/shop"
              className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Shop
            </Link>
            {product.category && (
              <>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
                <Link
                  href={`/shop?category=${product.category.slug}`}
                  className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {product.category.title}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
            <span className="text-zinc-700 dark:text-zinc-300">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Product Content */}
      <ProductDetail product={product} variants={variants} />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800/50">
          <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
            <h2 className="mb-8 text-center font-serif text-2xl font-normal tracking-[0.02em] text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct._id}
                  product={relatedProduct}
                  compact
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      <RecentlyViewed />
    </div>
  );
}
