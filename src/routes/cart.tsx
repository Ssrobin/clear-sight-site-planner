import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { cartTotal } from "@/lib/cart-math";
import { formatPrice, settingsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Optoline" },
      { name: "description", content: "Review the glasses and lenses in your Optoline cart before checkout." },
      { property: "og:title", content: "Your Cart — Optoline" },
      { property: "og:description", content: "Review your items and check out." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, setQty, remove } = useCart();
  const { data } = useQuery(settingsQuery());
  const fee = data?.settings?.delivery_fee ?? 0;

  if (lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><ShoppingBag className="h-7 w-7 text-muted-foreground" /></span>
        <h1 className="mt-6 text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Find a frame you love — or try some on first.</p>
        <div className="mt-6 flex gap-3">
          <Button asChild variant="hero" size="xl"><Link to="/shop">Shop now</Link></Button>
          <Button asChild variant="outline" size="xl" className="rounded-full"><Link to="/try-on">Try-On</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="text-3xl font-bold md:text-4xl">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.productId} className="flex gap-4 rounded-2xl border bg-card p-3">
              <img src={l.image} alt="" className="h-24 w-24 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <Link to="/product/$id" params={{ id: l.productId }} className="font-semibold hover:text-primary">{l.name}</Link>
                <span className="text-sm text-primary">{formatPrice(l.price)}</span>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border">
                    <button className="flex h-8 w-8 items-center justify-center" onClick={() => setQty(l.productId, l.quantity - 1)} aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                    <button className="flex h-8 w-8 items-center justify-center" onClick={() => setQty(l.productId, l.quantity + 1)} aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={() => remove(l.productId)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-3xl bg-secondary p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(fee)}</dd></div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(cartTotal(lines, fee))}</dd></div>
          </dl>
          <Button asChild variant="hero" size="xl" className="mt-6 w-full"><Link to="/checkout">Checkout</Link></Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Cash on Delivery · JazzCash · Easypaisa</p>
        </aside>
      </div>
    </div>
  );
}
