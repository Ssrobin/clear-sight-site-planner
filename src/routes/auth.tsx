import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Owner Login — Optoline" },
      { name: "description", content: "Sign in to manage the Optoline store." },
      { property: "og:title", content: "Owner Login — Optoline" },
      { property: "og:description", content: "Sign in to manage the Optoline store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/admin", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/admin", replace: true });
      else setSent(true);
    }
  };

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-soft">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">{mode === "signin" ? "Owner login" : "Create owner account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Manage products, orders, bookings and customer chats." : "The first account created becomes the shop admin."}
        </p>
        {sent ? (
          <p className="mt-6 rounded-2xl bg-secondary p-4 text-sm">Check your email and click the confirmation link, then come back here to sign in.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="em">Email</Label><Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 h-11" /></div>
            <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1.5 h-11" /></div>
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
          </form>
        )}
        <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setSent(false); }} className="mt-5 text-sm text-primary hover:underline">
          {mode === "signin" ? "First time? Create the owner account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
