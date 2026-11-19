import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, FileUp, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { cartTotal } from "@/lib/cart-math";
import { formatPrice, settingsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Optoline" },
      { name: "description", content: "Complete your Optoline order with Cash on Delivery, JazzCash or Easypaisa." },
      { property: "og:title", content: "Checkout — Optoline" },
      { property: "og:description", content: "Pay by Cash on Delivery, JazzCash or Easypaisa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

type Method = "cod" | "jazzcash" | "easypaisa";

function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const { data } = useQuery(settingsQuery());
  const s = data?.settings;
  const fee = s?.delivery_fee ?? 0;
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("cod");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", txn: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [placing, setPlacing] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const total = cartTotal(lines, fee);

  if (lines.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <Button asChild variant="hero" size="xl" className="mt-6"><Link to="/shop">Shop now</Link></Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method !== "cod" && !form.txn.trim()) {
      toast.error("Please enter the transaction ID from your payment");
      return;
    }
    setPlacing(true);
    let prescriptionPath = "";
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("prescriptions").upload(path, file, { contentType: file.type });
      if (upErr) {
        setPlacing(false);
        toast.error("Prescription upload failed. Please try a smaller image or PDF.");
        return;
      }
      prescriptionPath = path;
    }
    const { data: res, error } = await supabase.rpc("place_order", {
      _customer_name: form.name,
      _phone: form.phone,
      _email: form.email,
      _address: form.address,
      _city: form.city,
      _items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
      _payment_method: method,
      _transaction_ref: form.txn,
      _prescription_path: prescriptionPath,
      _prescription_notes: form.notes,
    });
    setPlacing(false);
    if (error || !res) {
      toast.error(error?.message ?? "Could not place order");
      return;
    }
    const r = res as { order_number: number; total: number };
    clear();
    navigate({ to: "/order-success", search: { order: r.order_number, total: r.total, method } });
  };

  const methods: { v: Method; label: string; icon: typeof Banknote; sub: string }[] = [
    { v: "cod", label: "Cash on Delivery", icon: Banknote, sub: "Pay when your order arrives" },
    { v: "jazzcash", label: "JazzCash", icon: Smartphone, sub: "Send to our JazzCash account" },
    { v: "easypaisa", label: "Easypaisa", icon: Smartphone, sub: "Send to our Easypaisa account" },
  ];
  const walletNumber = method === "jazzcash" ? s?.jazzcash_number : s?.easypaisa_number;

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="text-3xl font-bold md:text-4xl">Checkout</h1>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Delivery details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="n">Full name *</Label><Input id="n" value={form.name} onChange={set("name")} required maxLength={120} className="mt-1.5 h-11" /></div>
              <div><Label htmlFor="p">Phone *</Label><Input id="p" value={form.phone} onChange={set("phone")} required maxLength={30} inputMode="tel" placeholder="03xx xxxxxxx" className="mt-1.5 h-11" /></div>
              <div className="sm:col-span-2"><Label htmlFor="a">Address *</Label><Input id="a" value={form.address} onChange={set("address")} required maxLength={500} className="mt-1.5 h-11" /></div>
              <div><Label htmlFor="c">City *</Label><Input id="c" value={form.city} onChange={set("city")} required maxLength={80} className="mt-1.5 h-11" /></div>
              <div><Label htmlFor="e">Email (optional)</Label><Input id="e" type="email" value={form.email} onChange={set("email")} className="mt-1.5 h-11" /></div>
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Prescription (optional)</h2>
            <p className="mt-1 text-sm text-muted-foreground">Upload a photo of your prescription, or type your lens power. Skip this for frames without power.</p>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed p-4 hover:border-primary">
              <FileUp className="h-5 w-5 text-primary" />
              <span className="text-sm">{file ? file.name : "Choose image or PDF (max 10MB)"}</span>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Textarea value={form.notes} onChange={set("notes")} maxLength={1000} placeholder="e.g. Right -1.25, Left -1.50, anti-glare please" className="mt-3" />
          </section>

          <section className="rounded-3xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {methods.map((m) => (
                <button
                  type="button"
                  key={m.v}
                  onClick={() => setMethod(m.v)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${method === m.v ? "border-primary bg-accent ring-2 ring-primary/20" : "hover:border-primary"}`}
                >
                  <m.icon className="h-5 w-5 text-primary" />
                  <span className="mt-1 font-semibold">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.sub}</span>
                </button>
              ))}
            </div>
            {method !== "cod" && (
              <div className="mt-4 space-y-3 rounded-2xl bg-secondary p-4 text-sm">
                <p>
                  Send <strong>{formatPrice(total)}</strong> to our {method === "jazzcash" ? "JazzCash" : "Easypaisa"} account:
                </p>
                <p className="font-display text-xl font-bold text-primary">{walletNumber}</p>
                <p className="text-muted-foreground">Account title: {s?.account_title}</p>
                <div>
                  <Label htmlFor="t">Transaction ID *</Label>
                  <Input id="t" value={form.txn} onChange={set("txn")} maxLength={60} placeholder="e.g. 0123456789" className="mt-1.5 h-11 bg-card" />
                </div>
                <p className="text-xs text-muted-foreground">We'll confirm your payment and dispatch your order.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl bg-secondary p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">Your order</h2>
          <ul className="space-y-3">
            {lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3 text-sm">
                <img src={l.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <span className="flex-1">{l.name} × {l.quantity}</span>
                <span className="font-medium">{formatPrice(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(fee)}</dd></div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
          </dl>
          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={placing}>{placing ? "Placing order…" : "Place order"}</Button>
        </aside>
      </form>
    </div>
  );
}
