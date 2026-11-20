import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery, type SiteSettings } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

const FIELDS: { k: keyof SiteSettings; label: string; long?: boolean; num?: boolean }[] = [
  { k: "hero_title", label: "Home page headline" },
  { k: "hero_subtitle", label: "Home page subtitle", long: true },
  { k: "announcement", label: "Top announcement bar" },
  { k: "phone", label: "Phone" },
  { k: "whatsapp", label: "WhatsApp" },
  { k: "email", label: "Email" },
  { k: "address", label: "Store address" },
  { k: "opening_hours", label: "Opening hours" },
  { k: "delivery_fee", label: "Delivery fee (Rs)", num: true },
  { k: "jazzcash_number", label: "JazzCash number" },
  { k: "easypaisa_number", label: "Easypaisa number" },
  { k: "account_title", label: "Account title (JazzCash / Easypaisa)" },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery());
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  useEffect(() => {
    if (data?.settings && !form) {
      setForm(data.settings);
      setHeroPreview(data.heroUrl ?? "/images/hero-family.jpg");
    }
  }, [data, form]);

  if (!form) return <p className="text-muted-foreground">Loading…</p>;

  const uploadHero = async (file?: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `site/hero-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) { toast.error("Upload failed"); return; }
    setHeroPreview(URL.createObjectURL(file));
    setForm({ ...form, hero_image_path: path });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { id: _id, updated_at: _u, ...rest } = form;
    const { error } = await supabase.from("site_settings").update({ ...rest, delivery_fee: Number(rest.delivery_fee) || 0 }).eq("id", 1);
    setSaving(false);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success("Website updated");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  };

  return (
    <form onSubmit={save} className="max-w-3xl">
      <h1 className="text-2xl font-bold md:text-3xl">Site settings</h1>
      <p className="mt-1 text-muted-foreground">Change the home page banner, contact details and payment numbers.</p>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <Label>Home page banner photo</Label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {heroPreview && <img src={heroPreview} alt="" className="h-24 w-44 rounded-xl object-cover" />}
          <label className="flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm hover:border-primary">
            <ImageUp className="h-4 w-4" /> Upload new banner
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadHero(e.target.files?.[0])} />
          </label>
          {form.hero_image_path && (
            <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => { setForm({ ...form, hero_image_path: null }); setHeroPreview("/images/hero-family.jpg"); }}>
              Use default photo
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.k} className={f.long ? "sm:col-span-2" : ""}>
            <Label>{f.label}</Label>
            {f.long ? (
              <Textarea value={String(form[f.k] ?? "")} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className="mt-1.5" />
            ) : (
              <Input type={f.num ? "number" : "text"} value={String(form[f.k] ?? "")} onChange={(e) => setForm({ ...form, [f.k]: f.num ? Number(e.target.value) : e.target.value })} className="mt-1.5" />
            )}
          </div>
        ))}
      </div>
      <Button type="submit" variant="hero" size="xl" className="mt-6" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
