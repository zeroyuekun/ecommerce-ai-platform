import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/app/ProductDetail";
import { RecentlyViewed } from "@/components/app/RecentlyViewed";
import { RelatedProductsCarousel } from "@/components/app/RelatedProductsCarousel";
import {
  PRODUCT_BY_SLUG_QUERY,
  RELATED_PRODUCTS_QUERY,
  VARIANT_SIBLINGS_FULL_QUERY,
} from "@/lib/sanity/queries/products";
import { sanityFetch } from "@/sanity/lib/live";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: product } = await sanityFetch({
    query: PRODUCT_BY_SLUG_QUERY,
    params: { slug },
  });

  if (!product) {
    return { title: "Product Not Found" };
  }

  const imageUrl = product.images?.[0]?.asset?.url;

  return {
    title: product.name,
    description:
      product.description?.slice(0, 160) ??
      `Shop ${product.name} at Kozy. Premium furniture and homewares.`,
    openGraph: {
      title: product.name ?? undefined,
      description: product.description?.slice(0, 160) ?? undefined,
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
  };
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
      <RelatedProductsCarousel products={relatedProducts} />

      {/* Recently Viewed */}
      <RecentlyViewed />
    </div>
  );
}
