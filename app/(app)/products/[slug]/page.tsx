import { notFound } from "next/navigation";
import { sanityFetch } from "@/sanity/lib/live";
import {
  PRODUCT_BY_SLUG_QUERY,
  COLOR_VARIANTS_QUERY,
  RELATED_PRODUCTS_QUERY,
} from "@/lib/sanity/queries/products";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ProductInfo } from "@/components/storefront/ProductInfo";
import { RelatedProducts } from "@/components/storefront/RelatedProducts";

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

  // Fetch color variants and related products in parallel
  const [variantsResult, relatedResult] = await Promise.all([
    product.variantGroup
      ? sanityFetch({
          query: COLOR_VARIANTS_QUERY,
          params: {
            variantGroup: product.variantGroup,
            currentId: product._id,
          },
        })
      : Promise.resolve({ data: [] }),
    product.category
      ? sanityFetch({
          query: RELATED_PRODUCTS_QUERY,
          params: {
            categorySlug: product.category.slug ?? "",
            currentId: product._id,
          },
        })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="min-h-screen bg-background dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Gallery */}
          <ProductGallery images={product.images} productName={product.name} />

          {/* Product Info */}
          <ProductInfo
            product={product}
            variants={variantsResult.data ?? []}
          />
        </div>

        {/* Related Products */}
        <RelatedProducts products={relatedResult.data ?? []} />
      </div>
    </div>
  );
}
