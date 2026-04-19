import { ShoppingCart } from "lucide-react";
import Image from "next/image";
import type { AddToCartResult } from "@/lib/ai/tools/add-to-cart";

interface CartAddedWidgetProps {
  cartItem: NonNullable<AddToCartResult["cartItem"]>;
}

export function CartAddedWidget({ cartItem }: CartAddedWidgetProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      {cartItem.image ? (
        <Image
          src={cartItem.image}
          alt={cartItem.name}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-zinc-100 dark:bg-zinc-800">
          <ShoppingCart className="h-5 w-5 text-zinc-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {cartItem.name}
            </span>
            <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-500">
              {cartItem.quantity}x added to cart
            </span>
          </div>
          <span className="shrink-0 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {cartItem.priceFormatted}
          </span>
        </div>
      </div>
    </div>
  );
}
