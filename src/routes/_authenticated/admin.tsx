import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, LayoutDashboard, LogOut, MessageCircle, Package, Settings, ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/admin/use-is-admin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Optoline" },
      { name: "description", content: "Manage Optoline products, orders, bookings and customer messages." },
      { property: "og:title", content: "Admin Dashboard — Optoline" },
      { property: "og:description", content: "Store management for Optoline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/messages", label: "Messages", icon: MessageCircle },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/appointments", label: "Bookings", icon: CalendarDays },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/settings", label: "Site settings", icon: Settings },
] as const;

function useUnreadCount(enabled: boolean) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-unread"],
    enabled,
    queryFn: async () => {
      const { data } = await supabase.from("conversations").select("unread_for_admin");
      return (data ?? []).reduce((n, c) => n + c.unread_for_admin, 0);
    },
  });
  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel(`admin-unread-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => qc.invalidateQueries({ queryKey: ["admin-unread"] }))
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [enabled, qc]);
  return q.data ?? 0;
}

function AdminLayout() {
  const { data, isLoading } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const unread = useUnreadCount(!!data?.isAdmin);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!data?.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">No admin access</h1>
        <p className="max-w-sm text-muted-foreground">You're signed in as {data?.email}, but this account isn't the shop admin.</p>
        <Button variant="outline" onClick={signOut}>Sign out</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 md:flex">
      <aside className="border-b bg-card md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:p-6">
          <Logo />
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n }}
              className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
              {n.to === "/admin/messages" && unread > 0 && (
                <span className="ml-auto rounded-full bg-highlight px-1.5 text-[11px] font-bold text-highlight-foreground">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="hidden gap-1 border-t p-3 md:grid">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"><ExternalLink className="h-4 w-4" /> View website</Link>
          <button onClick={signOut} className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary"><LogOut className="h-4 w-4" /> Sign out</button>
          <p className="truncate px-3 pt-1 text-xs text-muted-foreground">{data.email}</p>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
        <div className="mt-10 flex gap-3 md:hidden">
          <Button asChild variant="outline" size="sm"><Link to="/">View website</Link></Button>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </main>
    </div>
  );
}
