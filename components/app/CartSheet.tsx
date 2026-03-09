"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2, ShoppingBag } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useCartItems,
  useCartIsOpen,
  useCartActions,
  useTotalItems,
} from "@/lib/store/cart-store-provider";
import { useCartStock } from "@/lib/hooks/useCartStock";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";

export function CartSheet() {
  const items = useCartItems();
  const isOpen = useCartIsOpen();
  const totalItems = useTotalItems();
  const { closeCart } = useCartActions();
  const { stockMap, isLoading, hasStockIssues } = useCartStock(items);

  // Handle Escape key since modal={false} doesn't trap focus
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeCart]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()} modal={false}>
      {/* Custom overlay — modal={false} prevents body scroll lock / layout shift */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 duration-500"
          onClick={closeCart}
        />
      )}
      <SheetContent overlay={false} className="flex w-full flex-col gap-0 rounded-none sm:max-w-md">
        <SheetHeader className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <SheetTitle className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
              Shopping Cart
              <span className="ml-2 text-zinc-400 dark:text-zinc-500">
                ({totalItems})
              </span>
            </span>
            {isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
            <ShoppingBag className="h-10 w-10 text-zinc-200 dark:text-zinc-700" strokeWidth={1} />
            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
              Your cart is empty
            </p>
            <p className="mt-2 text-[12px] tracking-wide text-zinc-400 dark:text-zinc-500">
              Browse our collection to find something you love
            </p>
          </div>
        ) : (
          <>
            {/* Stock Issues Banner */}
            {hasStockIssues && !isLoading && (
              <div className="mx-6 mt-4 flex items-center gap-2.5 border border-amber-200 px-4 py-3 text-[11px] tracking-wide text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span>Some items have stock issues. Please review before checkout.</span>
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {items.map((item) => (
                  <CartItem
                    key={item.productId}
                    item={item}
                    stockInfo={stockMap.get(item.productId)}
                  />
                ))}
              </div>
            </div>

            {/* Summary */}
            <CartSummary hasStockIssues={hasStockIssues} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
