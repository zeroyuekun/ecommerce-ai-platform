"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createRecentlyViewedStore,
  type RecentlyViewedStore,
} from "./recently-viewed-store";

type RecentlyViewedStoreApi = ReturnType<typeof createRecentlyViewedStore>;

const RecentlyViewedStoreContext = createContext<RecentlyViewedStoreApi | null>(
  null,
);

export function RecentlyViewedStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const storeRef = useRef<RecentlyViewedStoreApi>(null);
  if (storeRef.current === null) {
    storeRef.current = createRecentlyViewedStore();
  }

  return (
    <RecentlyViewedStoreContext.Provider value={storeRef.current}>
      {children}
    </RecentlyViewedStoreContext.Provider>
  );
}

function useRecentlyViewedStore<T>(
  selector: (state: RecentlyViewedStore) => T,
): T {
  const store = useContext(RecentlyViewedStoreContext);
  if (!store) {
    throw new Error(
      "useRecentlyViewedStore must be used within a RecentlyViewedStoreProvider",
    );
  }
  return useStore(store, selector);
}

export const useRecentlyViewedIds = () =>
  useRecentlyViewedStore((s) => s.productIds);

export const useRecentlyViewedActions = () => {
  const addProduct = useRecentlyViewedStore((s) => s.addProduct);
  const clearAll = useRecentlyViewedStore((s) => s.clearAll);
  return { addProduct, clearAll };
};
