"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products";
import type { CartItem } from "@/lib/store/cart-store";
import { client } from "@/sanity/lib/client";

export interface StockInfo {
  productId: string;
  currentStock: number;
  isOutOfStock: boolean;
  exceedsStock: boolean;
  availableQuantity: number;
}

export type StockMap = Map<string, StockInfo>;

interface UseCartStockReturn {
  stockMap: StockMap;
  isLoading: boolean;
  hasStockIssues: boolean;
  refetch: () => void;
}

const DEBOUNCE_MS = 400;

/**
 * Fetches current stock levels for cart items.
 * Debounces rapid cart mutations to avoid thrashing Sanity on quantity changes,
 * and cancels in-flight requests when the cart changes mid-fetch.
 */
export function useCartStock(items: CartItem[]): UseCartStockReturn {
  const [stockMap, setStockMap] = useState<StockMap>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Stable signature — only triggers refetch when productIds/quantities change,
  // not when a new items array reference is created by unrelated store updates.
  const signature = useMemo(
    () => items.map((i) => `${i.productId}:${i.quantity}`).join("|"),
    [items],
  );

  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<CartItem[]>(items);
  itemsRef.current = items;

  const runFetch = useCallback(async () => {
    const currentItems = itemsRef.current;
    if (currentItems.length === 0) {
      setStockMap(new Map());
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const productIds = currentItems.map((i) => i.productId);
      const products = (await client.fetch(
        PRODUCTS_BY_IDS_QUERY,
        { ids: productIds },
        { signal: controller.signal },
      )) as Array<{ _id: string; stock?: number }>;

      if (controller.signal.aborted) return;

      // O(1) lookup instead of products.find() per item.
      const productById = new Map(products.map((p) => [p._id, p]));
      const next: StockMap = new Map();
      for (const item of currentItems) {
        const product = productById.get(item.productId);
        const currentStock = product?.stock ?? 0;
        next.set(item.productId, {
          productId: item.productId,
          currentStock,
          isOutOfStock: currentStock === 0,
          exceedsStock: item.quantity > currentStock,
          availableQuantity: Math.min(item.quantity, currentStock),
        });
      }
      setStockMap(next);
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      console.error("Failed to fetch stock:", error);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Empty signature = empty cart; no fetch needed and no timer to schedule.
    if (!signature) {
      setStockMap(new Map());
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(runFetch, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [runFetch, signature]);

  const hasStockIssues = useMemo(() => {
    for (const info of stockMap.values()) {
      if (info.isOutOfStock || info.exceedsStock) return true;
    }
    return false;
  }, [stockMap]);

  return {
    stockMap,
    isLoading,
    hasStockIssues,
    refetch: runFetch,
  };
}
