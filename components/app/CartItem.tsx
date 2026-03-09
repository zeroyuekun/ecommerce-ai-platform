"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useCartActions } from "@/lib/store/cart-store-provider";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { cn, formatPrice } from "@/lib/utils";
import type { CartItem as CartItemType } from "@/lib/store/cart-store";
import type { StockInfo } from "@/lib/hooks/useCartStock";

interface CartItemProps {
  item: CartItemType;
  stockInfo?: StockInfo;
}

export function CartItem({ item, stockInfo }: CartItemProps) {
  const { removeItem } = useCartActions();

  const isOutOfStock = stockInfo?.isOutOfStock ?? false;
  const exceedsStock = stockInfo?.exceedsStock ?? false;
  const currentStock = stockInfo?.currentStock ?? 999;
  const hasIssue = isOutOfStock || exceedsStock;

  return (
    <div
      className={cn(
        "flex gap-4 py-5",
        hasIssue && "bg-red-50/50 -mx-3 px-3 dark:bg-red-950/20",
      )}
    >
      {/* Image */}
      <Link
        href={`/products/${item.productId}`}
        className={cn(
          "relative h-24 w-20 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800/50",
          isOutOfStock && "opacity-40",
        )}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
            No image
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/products/${item.productId}`}
              className={cn(
                "text-[12px] font-medium leading-snug tracking-[0.02em] text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300",
                isOutOfStock && "text-zinc-400 dark:text-zinc-500",
              )}
            >
              {item.name}
            </Link>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="shrink-0 p-0.5 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="sr-only">Remove {item.name}</span>
            </button>
          </div>

          <p className="mt-1.5 font-serif text-sm tracking-[0.03em] text-zinc-700 dark:text-zinc-300">
            {formatPrice(item.price)}
          </p>
        </div>

        {/* Quantity Controls */}
        {!isOutOfStock && (
          <div className="mt-3 w-28">
            <AddToCartButton
              productId={item.productId}
              name={item.name}
              price={item.price}
              image={item.image}
              stock={currentStock}
            />
          </div>
        )}
      </div>
    </div>
  );
}
