import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCartStock } from "@/lib/hooks/useCartStock";
import type { CartItem } from "@/lib/store/cart-store";

const fetchMock = vi.fn();

vi.mock("@/sanity/lib/client", () => ({
  client: {
    fetch: (...args: unknown[]) => fetchMock(...args),
  },
}));

const chair: CartItem = {
  productId: "prod-chair",
  name: "Chair",
  price: 420,
  quantity: 2,
};

const lamp: CartItem = {
  productId: "prod-lamp",
  name: "Lamp",
  price: 180,
  quantity: 5,
};

describe("useCartStock", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("returns empty stockMap with no items and skips fetching", async () => {
    const { result } = renderHook(() => useCartStock([]));
    expect(result.current.stockMap.size).toBe(0);
    expect(result.current.hasStockIssues).toBe(false);
    // Wait past the debounce window; still no fetch because items is empty.
    await new Promise((r) => setTimeout(r, 500));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches stock after debounce and builds the stock map", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "prod-chair", stock: 5 },
      { _id: "prod-lamp", stock: 0 },
    ]);

    const { result } = renderHook(() => useCartStock([chair, lamp]));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });
    await waitFor(() => expect(result.current.stockMap.size).toBe(2), {
      timeout: 2000,
    });

    expect(result.current.stockMap.get("prod-chair")).toEqual({
      productId: "prod-chair",
      currentStock: 5,
      isOutOfStock: false,
      exceedsStock: false,
      availableQuantity: 2,
    });
    expect(result.current.stockMap.get("prod-lamp")).toEqual({
      productId: "prod-lamp",
      currentStock: 0,
      isOutOfStock: true,
      exceedsStock: true,
      availableQuantity: 0,
    });
    expect(result.current.hasStockIssues).toBe(true);
  });

  it("marks exceedsStock when requested quantity > available stock", async () => {
    fetchMock.mockResolvedValueOnce([{ _id: "prod-chair", stock: 1 }]);

    const { result } = renderHook(() => useCartStock([chair]));

    await waitFor(
      () => {
        const info = result.current.stockMap.get("prod-chair");
        expect(info?.exceedsStock).toBe(true);
        expect(info?.availableQuantity).toBe(1);
      },
      { timeout: 2000 },
    );
  });

  it("does not refetch when the same signature is passed a second time", async () => {
    fetchMock.mockResolvedValue([{ _id: "prod-chair", stock: 5 }]);

    const { rerender } = renderHook(({ items }) => useCartStock(items), {
      initialProps: { items: [chair] },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });

    // New array reference, same productId:quantity signature — no refetch.
    rerender({ items: [{ ...chair }] });
    await new Promise((r) => setTimeout(r, 600));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when a quantity changes", async () => {
    fetchMock.mockResolvedValue([{ _id: "prod-chair", stock: 5 }]);

    const { rerender } = renderHook(({ items }) => useCartStock(items), {
      initialProps: { items: [chair] },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });

    rerender({ items: [{ ...chair, quantity: chair.quantity + 1 }] });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), {
      timeout: 2000,
    });
  });
});
