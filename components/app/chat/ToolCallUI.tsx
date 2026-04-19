import {
  CheckCircle2,
  Loader2,
  Package,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { AddToCartResult } from "@/lib/ai/tools/add-to-cart";
import type { GetMyOrdersResult } from "@/lib/ai/tools/get-my-orders";
import type { SearchProductsResult } from "@/lib/ai/types";
import { useCartActions } from "@/lib/store/cart-store-provider";
import { CartAddedWidget } from "./CartAddedWidget";
import { OrderCardWidget } from "./OrderCardWidget";
import { ProductCardWidget } from "./ProductCardWidget";
import type { ToolCallPart } from "./types";
import { getToolDisplayName } from "./utils";

interface ToolCallUIProps {
  toolPart: ToolCallPart;
  closeChat: () => void;
}

export function ToolCallUI({ toolPart, closeChat }: ToolCallUIProps) {
  const toolName = toolPart.toolName || toolPart.type.replace("tool-", "");
  const displayName = getToolDisplayName(toolName);
  const { addItem } = useCartActions();
  const addedToCartRef = useRef(false);

  // Check for completion
  const isComplete =
    toolPart.state === "result" ||
    toolPart.result !== undefined ||
    toolPart.output !== undefined;

  const searchQuery =
    toolName === "searchProducts" && toolPart.args?.query
      ? String(toolPart.args.query)
      : undefined;

  const orderStatus =
    toolName === "getMyOrders" && toolPart.args?.status
      ? String(toolPart.args.status)
      : undefined;

  // Get results based on tool type
  const result = toolPart.result || toolPart.output;
  const productResult = result as SearchProductsResult | undefined;
  const orderResult = result as GetMyOrdersResult | undefined;
  const cartResult = result as AddToCartResult | undefined;

  const hasProducts =
    toolName === "searchProducts" &&
    productResult?.found &&
    productResult.products &&
    productResult.products.length > 0;

  const hasOrders =
    toolName === "getMyOrders" &&
    orderResult?.found &&
    orderResult.orders &&
    orderResult.orders.length > 0;

  const hasCartAdd =
    toolName === "addToCart" && cartResult?.success && cartResult.cartItem;

  // Add item to cart store when tool completes
  useEffect(() => {
    if (hasCartAdd && cartResult?.cartItem && !addedToCartRef.current) {
      addedToCartRef.current = true;
      addItem(
        {
          productId: cartResult.cartItem.productId,
          name: cartResult.cartItem.name,
          price: cartResult.cartItem.price,
          image: cartResult.cartItem.image,
        },
        cartResult.cartItem.quantity,
      );
    }
  }, [hasCartAdd, cartResult, addItem]);

  // Determine icon based on tool type
  const ToolIcon =
    toolName === "getMyOrders"
      ? Package
      : toolName === "addToCart"
        ? ShoppingCart
        : Search;

  return (
    <div className="space-y-2">
      {/* Tool status indicator */}
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${
          isComplete
            ? "border-zinc-200 dark:border-zinc-800"
            : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        {isComplete ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        ) : (
          <Loader2 className="h-3.5 w-3.5 text-zinc-400 animate-spin shrink-0" />
        )}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            {isComplete ? `${displayName} complete` : `${displayName}...`}
          </span>
          {searchQuery && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              &quot;{searchQuery}&quot;
            </span>
          )}
          {orderStatus && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {orderStatus}
            </span>
          )}
        </div>
      </div>

      {/* Product results */}
      {hasProducts && productResult?.products && (
        <div className="mt-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mb-2">
            {productResult.products.length} product
            {productResult.products.length !== 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {productResult.products.map((product) => (
              <ProductCardWidget
                key={product.id}
                product={product}
                onClose={closeChat}
              />
            ))}
          </div>
        </div>
      )}

      {/* Order results */}
      {hasOrders && orderResult?.orders && (
        <div className="mt-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mb-2">
            {orderResult.orders.length} order
            {orderResult.orders.length !== 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {orderResult.orders.map((order) => (
              <OrderCardWidget
                key={order.id}
                order={order}
                onClose={closeChat}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cart add result */}
      {hasCartAdd && cartResult?.cartItem && (
        <div className="mt-1">
          <CartAddedWidget cartItem={cartResult.cartItem} />
        </div>
      )}
    </div>
  );
}
