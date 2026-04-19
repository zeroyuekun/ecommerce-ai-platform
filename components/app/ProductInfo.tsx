"use client";

import { ChevronDown, Minus, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { StockBadge } from "@/components/app/StockBadge";
import { COLOR_SWATCHES } from "@/lib/constants/filters";
import { useCartActions } from "@/lib/store/cart-store-provider";
import { useChatActions } from "@/lib/store/chat-store-provider";
import { cn, formatPrice } from "@/lib/utils";
import type {
  PRODUCT_BY_SLUG_QUERY_RESULT,
  VARIANT_SIBLINGS_FULL_QUERY_RESULT,
} from "@/sanity.types";

interface ProductInfoProps {
  product: NonNullable<PRODUCT_BY_SLUG_QUERY_RESULT>;
  variants?: VARIANT_SIBLINGS_FULL_QUERY_RESULT;
  onVariantSwitch?: (slug: string) => void;
}

function QuantityAddToCart({
  productId,
  name,
  price,
  image,
  stock,
}: {
  productId: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartActions();
  const isOutOfStock = stock <= 0;

  const handleAdd = () => {
    addItem({ productId, name, price, image }, quantity);
    toast.success(`Added ${quantity} × ${name}`);
    setQuantity(1);
  };

  if (isOutOfStock) {
    return (
      <button
        type="button"
        disabled
        className="flex h-[52px] w-full items-center justify-center bg-zinc-200 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
      >
        Out of Stock
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Compact quantity stepper */}
      <div className="flex h-[52px] w-[80px] shrink-0 items-center border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          className="flex h-full w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <Minus className="h-3 w-3" strokeWidth={1.5} />
        </button>
        <span className="flex flex-1 items-center justify-center text-[13px] font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
          disabled={quantity >= stock}
          className="flex h-full w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <Plus className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>

      {/* Add to Cart button */}
      <button
        type="button"
        onClick={handleAdd}
        className="flex h-[52px] flex-1 items-center justify-center bg-zinc-900 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Add to Cart
      </button>
    </div>
  );
}

function DetailSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-[12px] font-medium uppercase tracking-[0.15em] text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-400 transition-transform duration-200",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductInfo({
  product,
  variants = [],
  onVariantSwitch,
}: ProductInfoProps) {
  const { openChatWithMessage } = useChatActions();
  const imageUrl = product.images?.[0]?.asset?.url;
  const isOnSale =
    product.salePrice != null && product.salePrice < (product.price ?? 0);
  const hasVariants = variants.length > 1;

  return (
    <div className="flex flex-col">
      {/* Category */}
      {product.category && (
        <Link
          href={`/shop?category=${product.category.slug}`}
          className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          {product.category.title}
        </Link>
      )}

      {/* Title */}
      <h1 className="mt-3 font-serif text-2xl font-normal leading-snug tracking-[0.02em] text-zinc-900 dark:text-zinc-100 sm:text-3xl lg:text-[32px]">
        {product.name}
      </h1>

      {/* Price */}
      <div className="mt-5">
        {isOnSale ? (
          <div className="flex items-baseline gap-3">
            <p className="text-xl font-medium tracking-[0.02em] text-red-600 dark:text-red-400 sm:text-2xl">
              {formatPrice(product.salePrice)}
            </p>
            <p className="text-base font-normal tracking-[0.02em] text-zinc-400 line-through dark:text-zinc-500">
              {formatPrice(product.price)}
            </p>
          </div>
        ) : (
          <p className="text-xl font-medium tracking-[0.02em] text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            {formatPrice(product.price)}
          </p>
        )}
      </div>

      {/* Delivery info bar */}
      <div className="mt-7 flex items-center gap-3 border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Truck className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
        <span className="text-[12px] tracking-wide text-zinc-600 dark:text-zinc-400">
          Free shipping on orders over $100. Leaves warehouse within 2 business
          days.
        </span>
      </div>

      {/* Color variant swatches */}
      {hasVariants && (
        <div className="mt-7">
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
            Colour:{" "}
            <span className="capitalize text-zinc-800 dark:text-zinc-200">
              {product.color}
            </span>
          </span>
          <div className="mt-2.5 flex items-center gap-2 p-1">
            {variants.map((variant) => {
              const hex = variant.color ? COLOR_SWATCHES[variant.color] : null;
              if (!hex) return null;
              const isActive = variant.slug === product.slug;
              return (
                <button
                  key={variant._id}
                  type="button"
                  disabled={isActive}
                  title={
                    variant.color
                      ? variant.color.charAt(0).toUpperCase() +
                        variant.color.slice(1)
                      : undefined
                  }
                  onClick={() => {
                    if (!isActive && variant.slug) {
                      onVariantSwitch?.(variant.slug);
                    }
                  }}
                  className={cn(
                    "relative h-7 w-7 rounded-full transition-all",
                    isActive
                      ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-950"
                      : "ring-1 ring-zinc-300 hover:ring-zinc-500 dark:ring-zinc-600 dark:hover:ring-zinc-400",
                    variant.color === "white" &&
                      "ring-1 ring-zinc-300 dark:ring-zinc-500",
                  )}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Single color + material (no variants) */}
      {!hasVariants && (product.color || product.material) && (
        <div className="mt-7 flex items-center gap-4">
          {product.color && COLOR_SWATCHES[product.color] && (
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border border-zinc-200 dark:border-zinc-600"
                style={{ backgroundColor: COLOR_SWATCHES[product.color] }}
              />
              <span className="text-[11px] capitalize tracking-[0.05em] text-zinc-600 dark:text-zinc-400">
                {product.color}
              </span>
            </div>
          )}
          {product.material && (
            <span className="text-[11px] capitalize tracking-[0.05em] text-zinc-500 dark:text-zinc-400">
              {product.material}
            </span>
          )}
        </div>
      )}

      {/* Stock badge */}
      <div className="mt-7">
        <StockBadge productId={product._id} stock={product.stock ?? 0} />
      </div>

      {/* Quantity + Add to Cart */}
      <div className="mt-8">
        <QuantityAddToCart
          productId={product._id}
          name={product.name ?? "Unknown Product"}
          price={product.salePrice ?? product.price ?? 0}
          image={imageUrl ?? undefined}
          stock={product.stock ?? 0}
        />
      </div>

      {/* Ask AI */}
      <button
        type="button"
        onClick={() =>
          openChatWithMessage(`Show me products similar to "${product.name}"`)
        }
        className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 border border-zinc-200 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
      >
        Find Similar Products
      </button>

      {/* Accordion Detail Sections */}
      <div className="mt-10">
        {product.description && (
          <DetailSection title="Description" defaultOpen>
            <div className="space-y-3">
              {product.description
                .split(/\n\n+/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, i) => {
                  const lines = paragraph.split("\n");
                  const firstLine = lines[0].trim();
                  const rest = lines.slice(1).join("\n").trim();
                  const isHeadedBlock =
                    lines.length >= 2 &&
                    firstLine.length <= 50 &&
                    rest.length > firstLine.length;

                  if (isHeadedBlock) {
                    return (
                      <div key={i}>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {firstLine}
                        </p>
                        <p className="mt-1 whitespace-pre-line">{rest}</p>
                      </div>
                    );
                  }

                  return (
                    <p key={i} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  );
                })}
            </div>
          </DetailSection>
        )}

        <DetailSection title="Specifications" defaultOpen>
          <div className="space-y-2.5">
            {product.material && (
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Material
                </span>
                <span className="capitalize">{product.material}</span>
              </div>
            )}
            {product.color && (
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Colour
                </span>
                <span className="capitalize">{product.color}</span>
              </div>
            )}
            {product.dimensions && (
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Dimensions
                </span>
                <span>{product.dimensions}</span>
              </div>
            )}
            {product.assemblyRequired !== null && (
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Assembly
                </span>
                <span>
                  {product.assemblyRequired ? "Required" : "Not required"}
                </span>
              </div>
            )}
          </div>
        </DetailSection>

        <DetailSection title="Shipping & Returns">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Free Shipping
              </p>
              <p className="mt-1">
                Free standard shipping on orders over $100.
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Express Delivery
              </p>
              <p className="mt-1">Express shipping available at checkout.</p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Returns
              </p>
              <p className="mt-1">
                Returns accepted within 30 days of purchase.
              </p>
            </div>
          </div>
        </DetailSection>

        <DetailSection title="Care Instructions">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Cleaning
              </p>
              <p className="mt-1">
                Wipe clean with a soft, damp cloth. Avoid harsh chemical
                cleaners.
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Placement
              </p>
              <p className="mt-1">
                Keep away from direct sunlight and heat sources to prevent
                discolouration.
              </p>
            </div>
          </div>
        </DetailSection>

        {/* Bottom border to close off last accordion */}
        <div className="border-t border-zinc-200 dark:border-zinc-800" />
      </div>
    </div>
  );
}
