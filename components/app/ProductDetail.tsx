"use client";

import { useCallback, useState } from "react";
import type {
  PRODUCT_BY_SLUG_QUERY_RESULT,
  VARIANT_SIBLINGS_FULL_QUERY_RESULT,
} from "@/sanity.types";
import { ProductGallery } from "./ProductGallery";
import { ProductInfo } from "./ProductInfo";
import { RecentlyViewedTracker } from "./RecentlyViewedTracker";

type Product = NonNullable<PRODUCT_BY_SLUG_QUERY_RESULT>;

interface ProductDetailProps {
  product: Product;
  variants: VARIANT_SIBLINGS_FULL_QUERY_RESULT;
}

export function ProductDetail({ product, variants }: ProductDetailProps) {
  const [activeProduct, setActiveProduct] = useState<Product>(product);

  const handleVariantSwitch = useCallback(
    (slug: string) => {
      const variant = variants.find((v) => v.slug === slug);
      if (variant) {
        setActiveProduct(variant as Product);
        window.history.replaceState(null, "", `/products/${slug}`);
      }
    },
    [variants],
  );

  return (
    <>
      <RecentlyViewedTracker productId={activeProduct._id} />
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-16 xl:grid-cols-[1fr_460px]">
          {/* Image Gallery — stays fixed while info scrolls */}
          <div className="lg:sticky lg:top-24 lg:self-start transition-opacity duration-300">
            <ProductGallery
              key={activeProduct.slug}
              images={activeProduct.images}
              productName={activeProduct.name}
            />
          </div>

          {/* Product Info — scrolls naturally */}
          <div className="lg:px-1">
            <ProductInfo
              product={activeProduct}
              variants={variants}
              onVariantSwitch={handleVariantSwitch}
            />
          </div>
        </div>
      </div>
    </>
  );
}
