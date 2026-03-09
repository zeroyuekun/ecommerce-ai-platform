"use client";

import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCartActions, useCartItem } from "@/lib/store/cart-store-provider";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  productId: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  className?: string;
}

export function AddToCartButton({
  productId,
  name,
  price,
  image,
  stock,
  className,
}: AddToCartButtonProps) {
  const { addItem, updateQuantity } = useCartActions();
  const cartItem = useCartItem(productId);

  const quantityInCart = cartItem?.quantity ?? 0;
  const isOutOfStock = stock <= 0;
  const isAtMax = quantityInCart >= stock;

  const handleAdd = () => {
    if (quantityInCart < stock) {
      addItem({ productId, name, price, image }, 1);
      toast.success(`Added ${name}`);
    }
  };

  const handleDecrement = () => {
    if (quantityInCart > 0) {
      updateQuantity(productId, quantityInCart - 1);
    }
  };

  // Out of stock
  if (isOutOfStock) {
    return (
      <button
        disabled
        className={cn(
          "flex h-11 w-full items-center justify-center bg-zinc-200 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
          className,
        )}
      >
        Out of Stock
      </button>
    );
  }

  // Not in cart - show Add to Cart button
  if (quantityInCart === 0) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 bg-zinc-900 text-[11px] font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
          className,
        )}
      >
        Add to Cart
      </button>
    );
  }

  // In cart - show quantity controls
  return (
    <div
      className={cn(
        "flex h-11 w-full items-center border border-zinc-200 dark:border-zinc-700",
        className,
      )}
    >
      <button
        type="button"
        className="flex h-full flex-1 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        onClick={handleDecrement}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <span className="flex flex-1 items-center justify-center text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {quantityInCart}
      </span>
      <button
        type="button"
        className="flex h-full flex-1 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        onClick={handleAdd}
        disabled={isAtMax}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
