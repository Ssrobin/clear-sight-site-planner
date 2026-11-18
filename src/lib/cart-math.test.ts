import { describe, expect, it } from "vitest";
import { cartSubtotal, cartTotal, clampQty } from "./cart-math";

const line = (price: number, quantity: number) => ({ productId: String(price), name: "x", price, image: "", quantity });

describe("cart totals", () => {
  it("adds the delivery fee to the subtotal", () => {
    expect(cartTotal([line(4500, 1), line(2400, 2)], 250)).toBe(4500 + 4800 + 250);
  });
  it("charges no delivery on an empty cart", () => {
    expect(cartTotal([], 250)).toBe(0);
  });
  it("limits each item to between 1 and 10", () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(25)).toBe(10);
    expect(cartSubtotal([line(1000, 25)])).toBe(10000);
  });
});
