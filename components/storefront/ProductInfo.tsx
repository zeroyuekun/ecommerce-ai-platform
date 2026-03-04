import Link from "next/link";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { StockBadge } from "@/components/storefront/StockBadge";
import { ColorSwatches } from "@/components/storefront/ColorSwatches";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatPrice } from "@/lib/utils";
import type { PRODUCT_BY_SLUG_QUERY_RESULT } from "@/sanity.types";

interface ColorVariant {
  _id: string;
  name: string | null;
  color: string | null;
  slug: string | null;
  image: { asset: { url: string | null } | null } | null;
}

interface ProductInfoProps {
  product: NonNullable<PRODUCT_BY_SLUG_QUERY_RESULT>;
  variants?: ColorVariant[];
}

export function ProductInfo({ product, variants = [] }: ProductInfoProps) {
  const imageUrl = product.images?.[0]?.asset?.url;

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <li>
            <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-200">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</li>
          {product.category && (
            <>
              <li>
                <Link
                  href={`/?category=${product.category.slug}`}
                  className="hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {product.category.title}
                </Link>
              </li>
              <li aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</li>
            </>
          )}
          <li className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Product Name */}
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
        {product.name}
      </h1>

      {/* Price */}
      <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {formatPrice(product.price)}
      </p>

      {/* Color Swatches */}
      <ColorSwatches currentColor={product.color ?? null} variants={variants} />

      {/* Stock & Add to Cart */}
      <div className="mt-6 flex flex-col gap-3">
        <StockBadge productId={product._id} stock={product.stock ?? 0} />
        <AddToCartButton
          productId={product._id}
          name={product.name ?? "Unknown Product"}
          price={product.price ?? 0}
          image={imageUrl ?? undefined}
          stock={product.stock ?? 0}
        />
      </div>

      {/* Product Details Accordions */}
      <div className="mt-8">
        <Accordion type="multiple" className="w-full">
          {/* Description */}
          {product.description && (
            <AccordionItem value="description">
              <AccordionTrigger className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Description
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                <p>{product.description}</p>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Specifications */}
          {(product.material || product.color || product.dimensions || product.assemblyRequired !== null) && (
            <AccordionItem value="specifications">
              <AccordionTrigger className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Specifications
              </AccordionTrigger>
              <AccordionContent>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {product.material && (
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Material</span>
                      <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
                        {product.material}
                      </span>
                    </div>
                  )}
                  {product.color && (
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Colour</span>
                      <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
                        {product.color}
                      </span>
                    </div>
                  )}
                  {product.dimensions && (
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Dimensions (W x D x H)</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {product.dimensions}
                      </span>
                    </div>
                  )}
                  {product.assemblyRequired !== null && (
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Assembly</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {product.assemblyRequired
                          ? "Assembly required"
                          : "No assembly required — arrives fully assembled"}
                      </span>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Shipping & Returns */}
          <AccordionItem value="shipping" className="border-b-0">
            <AccordionTrigger className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Shipping & Returns
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              <p>
                Standard shipping is $9.95. Express shipping is $19.95. Orders
                over $150 qualify for free standard shipping Australia-wide.
              </p>
              <p>
                Standard delivery takes 5-7 business days. Express delivery
                takes 2-3 business days. Large items may take 7-14 business
                days.
              </p>
              <p>
                We offer a 30-day return policy on most unused and unopened
                items.{" "}
                <Link
                  href="/pages/returns"
                  className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
                >
                  View full returns policy
                </Link>
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
