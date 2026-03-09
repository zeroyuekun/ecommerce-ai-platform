"use client";

import { useEffect } from "react";
import { useRecentlyViewedActions } from "@/lib/store/recently-viewed-store-provider";

interface RecentlyViewedTrackerProps {
  productId: string;
}

export function RecentlyViewedTracker({ productId }: RecentlyViewedTrackerProps) {
  const { addProduct } = useRecentlyViewedActions();

  useEffect(() => {
    addProduct(productId);
  }, [productId, addProduct]);

  return null;
}
