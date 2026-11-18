export type CartLine = { productId: string; name: string; price: number; image: string; quantity: number };

export const MAX_QTY = 10;

export function clampQty(q: number) {
  if (!Number.isFinite(q)) return 1;
  return Math.max(1, Math.min(MAX_QTY, Math.round(q)));
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.price * clampQty(l.quantity), 0);
}

export function cartTotal(lines: CartLine[], deliveryFee: number) {
  if (lines.length === 0) return 0;
  return cartSubtotal(lines) + deliveryFee;
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((n, l) => n + clampQty(l.quantity), 0);
}
