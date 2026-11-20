import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: Orders,
});

const STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"];
const METHOD: Record<string, string> = { cod: "Cash on Delivery", jazzcash: "JazzCash", easypaisa: "Easypaisa" };

function Orders() {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const update = async (id: string, patch: { status?: string; payment_status?: string }) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    toast.success("Order updated");
  };

  const openPrescription = async (path: string) => {
    const { data, error } = await supabase.storage.from("prescriptions").createSignedUrl(path, 600);
    if (error || !data) { toast.error("Could not open file"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold md:text-3xl">Orders</h1>
      <p className="mt-1 text-muted-foreground">Update order status and confirm JazzCash / Easypaisa payments.</p>
      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && orders.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No orders yet.</p>}
        {orders.map((o) => {
          const items = (o.items as { name: string; quantity: number; price: number }[]) ?? [];
          return (
            <div key={o.id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">#{o.order_number} · {o.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-primary">{formatPrice(o.total)}</p>
                  <p className="text-xs text-muted-foreground">{METHOD[o.payment_method] ?? o.payment_method}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Customer</p>
                  <p><a href={`tel:${o.phone}`} className="text-primary">{o.phone}</a></p>
                  {o.email && <p>{o.email}</p>}
                  <p>{o.address}, {o.city}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Items</p>
                  {items.map((i, idx) => <p key={idx}>{i.name} × {i.quantity}</p>)}
                  {o.prescription_notes && <p className="mt-1 text-muted-foreground">Rx: {o.prescription_notes}</p>}
                  {o.prescription_path && (
                    <button onClick={() => openPrescription(o.prescription_path!)} className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"><FileText className="h-3.5 w-3.5" /> View prescription</button>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Status</span>
                    <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value })} className="mt-1 h-9 w-full rounded-lg border bg-background px-2 capitalize">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  {o.payment_method !== "cod" ? (
                    <div className="rounded-lg bg-secondary p-2">
                      <p className="text-xs">Txn ID: <strong>{o.transaction_ref}</strong></p>
                      <label className="mt-1 flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={o.payment_status === "paid"} onChange={(e) => update(o.id, { payment_status: e.target.checked ? "paid" : "pending" })} />
                        Payment received
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={o.payment_status === "paid"} onChange={(e) => update(o.id, { payment_status: e.target.checked ? "paid" : "pending" })} />
                      Cash collected
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
