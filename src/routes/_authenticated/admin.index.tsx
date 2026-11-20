import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MessageCircle, Package, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [orders, bookings, convs, products] = await Promise.all([
        supabase.from("orders").select("id,status,total,order_number,customer_name,created_at,payment_method").order("created_at", { ascending: false }).limit(200),
        supabase.from("appointments").select("id,status", { count: "exact" }).eq("status", "new"),
        supabase.from("conversations").select("unread_for_admin"),
        supabase.from("products").select("id", { count: "exact", head: true }),
      ]);
      const o = orders.data ?? [];
      return {
        newOrders: o.filter((x) => x.status === "new").length,
        revenue: o.filter((x) => x.status !== "cancelled").reduce((n, x) => n + x.total, 0),
        recent: o.slice(0, 6),
        newBookings: bookings.count ?? 0,
        unread: (convs.data ?? []).reduce((n, c) => n + c.unread_for_admin, 0),
        products: products.count ?? 0,
      };
    },
  });
  const cards = [
    { label: "New orders", value: data?.newOrders ?? "–", icon: ShoppingCart, to: "/admin/orders" as const },
    { label: "Unread messages", value: data?.unread ?? "–", icon: MessageCircle, to: "/admin/messages" as const },
    { label: "New bookings", value: data?.newBookings ?? "–", icon: CalendarDays, to: "/admin/appointments" as const },
    { label: "Products", value: data?.products ?? "–", icon: Package, to: "/admin/products" as const },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold md:text-3xl">Assalam o Alaikum 👋</h1>
      <p className="mt-1 text-muted-foreground">Here's what's happening at Optoline.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-2xl border bg-card p-5 transition-shadow hover:shadow-soft">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-4 font-display text-3xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <span className="text-sm text-muted-foreground">Total sales: {formatPrice(data?.revenue ?? 0)}</span>
        </div>
        <ul className="mt-4 divide-y">
          {(data?.recent ?? []).map((o) => (
            <li key={o.id} className="flex items-center justify-between py-3 text-sm">
              <span>#{o.order_number} · {o.customer_name}</span>
              <span className="flex items-center gap-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{o.status}</span>{formatPrice(o.total)}</span>
            </li>
          ))}
          {data && data.recent.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No orders yet.</li>}
        </ul>
      </div>
    </div>
  );
}
