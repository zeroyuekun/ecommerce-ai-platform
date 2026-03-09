"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  useTotalPrice,
  useTotalItems,
  useCartActions,
} from "@/lib/store/cart-store-provider";

interface CartSummaryProps {
  hasStockIssues?: boolean;
}

export function CartSummary({ hasStockIssues = false }: CartSummaryProps) {
  const totalPrice = useTotalPrice();
  const totalItems = useTotalItems();
  const { closeCart } = useCartActions();

  if (totalItems === 0) return null;

  return (
    <div className="border-t border-zinc-200 px-6 py-5 dark:border-zinc-800">
      {/* Subtotal */}
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
          Subtotal
        </span>
        <span className="font-serif text-lg tracking-[0.03em] text-zinc-900 dark:text-zinc-100">
          {formatPrice(totalPrice)}
        </span>
      </div>
      <p className="mt-1 text-[11px] tracking-wide text-zinc-400 dark:text-zinc-500">
        Shipping calculated at checkout
      </p>

      {/* Checkout Button */}
      <div className="mt-5">
        {hasStockIssues ? (
          <button
            disabled
            className="w-full bg-zinc-200 py-3.5 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
          >
            Resolve stock issues to checkout
          </button>
        ) : (
          <Link
            href="/checkout"
            onClick={() => closeCart()}
            className="block w-full bg-zinc-900 py-3.5 text-center text-[11px] font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Checkout
          </Link>
        )}
      </div>

      {/* Continue Shopping */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => closeCart()}
          className="text-[11px] tracking-[0.1em] text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
