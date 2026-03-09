import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

const MAX_RECENTLY_VIEWED = 12;

export interface RecentlyViewedState {
  /** Product IDs in order of most recently viewed first */
  productIds: string[];
}

export interface RecentlyViewedActions {
  addProduct: (productId: string) => void;
  clearAll: () => void;
}

export type RecentlyViewedStore = RecentlyViewedState & RecentlyViewedActions;

const defaultState: RecentlyViewedState = {
  productIds: [],
};

export const createRecentlyViewedStore = () =>
  createStore<RecentlyViewedStore>()(
    persist(
      (set) => ({
        ...defaultState,

        addProduct: (productId) =>
          set((state) => {
            const filtered = state.productIds.filter((id) => id !== productId);
            return {
              productIds: [productId, ...filtered].slice(0, MAX_RECENTLY_VIEWED),
            };
          }),

        clearAll: () => set({ productIds: [] }),
      }),
      {
        name: "recently-viewed",
      },
    ),
  );
