import { beforeEach, describe, expect, it } from "vitest";
import { type CartStore, createCartStore } from "@/lib/store/cart-store";

type StoreApi = ReturnType<typeof createCartStore>;

const chair = {
  productId: "prod-chair",
  name: "Oak Dining Chair",
  price: 420,
  image: "chair.jpg",
};

const lamp = {
  productId: "prod-lamp",
  name: "Brass Floor Lamp",
  price: 180,
};

describe("cart-store", () => {
  let store: StoreApi;
  const get = (): CartStore => store.getState();

  beforeEach(() => {
    store = createCartStore();
  });

  it("starts empty and closed", () => {
    expect(get().items).toEqual([]);
    expect(get().isOpen).toBe(false);
  });

  it("adds a new item with default quantity 1", () => {
    get().addItem(chair);
    expect(get().items).toHaveLength(1);
    expect(get().items[0]).toMatchObject({ ...chair, quantity: 1 });
  });

  it("adds a new item with explicit quantity", () => {
    get().addItem(chair, 3);
    expect(get().items[0].quantity).toBe(3);
  });

  it("increments quantity when the same product is added again", () => {
    get().addItem(chair, 2);
    get().addItem(chair, 3);
    expect(get().items).toHaveLength(1);
    expect(get().items[0].quantity).toBe(5);
  });

  it("keeps distinct products as separate line items", () => {
    get().addItem(chair);
    get().addItem(lamp, 2);
    expect(get().items).toHaveLength(2);
  });

  it("removeItem removes the matching productId", () => {
    get().addItem(chair);
    get().addItem(lamp);
    get().removeItem(chair.productId);
    expect(get().items).toHaveLength(1);
    expect(get().items[0].productId).toBe(lamp.productId);
  });

  it("updateQuantity sets a new quantity", () => {
    get().addItem(chair);
    get().updateQuantity(chair.productId, 7);
    expect(get().items[0].quantity).toBe(7);
  });

  it("updateQuantity to 0 or below removes the item", () => {
    get().addItem(chair);
    get().updateQuantity(chair.productId, 0);
    expect(get().items).toEqual([]);
  });

  it("clearCart empties items", () => {
    get().addItem(chair);
    get().addItem(lamp);
    get().clearCart();
    expect(get().items).toEqual([]);
  });

  it("toggleCart flips isOpen", () => {
    expect(get().isOpen).toBe(false);
    get().toggleCart();
    expect(get().isOpen).toBe(true);
    get().toggleCart();
    expect(get().isOpen).toBe(false);
  });

  it("openCart and closeCart set explicit states", () => {
    get().openCart();
    expect(get().isOpen).toBe(true);
    get().closeCart();
    expect(get().isOpen).toBe(false);
  });
});
