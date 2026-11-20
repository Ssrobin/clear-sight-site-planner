import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GlassesSvg } from "@/components/tryon/GlassesSvg";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, FRAME_SHAPES, categoryLabel, formatPrice, productImageUrl, withSignedImages, type Product } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: Products,
});

type Draft = {
  id?: string;
  name: string;
  category: string;
  gender: string;
  price: string;
  old_price: string;
  description: string;
  frame_shape: string;
  frame_color: string;
  stock: string;
  is_active: boolean;
  is_featured: boolean;
  image_path: string | null;
  image_url: string | null;
};

const EMPTY: Draft = {
  name: "", category: "eyeglasses", gender: "unisex", price: "", old_price: "", description: "", frame_shape: "rectangle",
  frame_color: "#1f2937", stock: "10", is_active: true, is_featured: false, image_path: null, image_url: null,
};

function Products() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return withSignedImages(data ?? []);
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const edit = (p: Product) =>
    setDraft({ ...p, price: String(p.price), old_price: p.old_price ? String(p.old_price) : "", stock: String(p.stock) });

  const del = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error("Could not delete"); return; }
    toast.success("Product deleted");
    refresh();
  };

  const toggle = async (p: Product, field: "is_active" | "is_featured", v: boolean) => {
    const { error } = await supabase.from("products").update(field === "is_active" ? { is_active: v } : { is_featured: v }).eq("id", p.id);
    if (error) { toast.error("Update failed"); return; }
    refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Products</h1>
          <p className="mt-1 text-muted-foreground">Add new frames, upload photos and change prices.</p>
        </div>
        <Button variant="hero" onClick={() => setDraft({ ...EMPTY })}><Plus /> Add product</Button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {data.map((p) => (
          <div key={p.id} className={`flex gap-4 rounded-2xl border bg-card p-3 ${p.is_active ? "" : "opacity-60"}`}>
            <img src={productImageUrl(p)} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{categoryLabel(p.category)} · stock {p.stock}</p>
              <p className="text-sm font-semibold text-primary">{formatPrice(p.price)}</p>
              <div className="mt-auto flex items-center gap-3 pt-2 text-xs">
                <label className="flex items-center gap-1.5"><Switch checked={p.is_active} onCheckedChange={(v) => toggle(p, "is_active", v)} /> Live</label>
                <label className="flex items-center gap-1.5"><Switch checked={p.is_featured} onCheckedChange={(v) => toggle(p, "is_featured", v)} /> Featured</label>
                <span className="ml-auto flex gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => edit(p)} aria-label="Edit"><Pencil /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => del(p)} aria-label="Delete"><Trash2 /></Button>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          {draft && <ProductForm draft={draft} setDraft={setDraft} onSaved={() => { setDraft(null); refresh(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({ draft, setDraft, onSaved }: { draft: Draft; setDraft: (d: Draft) => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(draft.image_url);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) { toast.error("Upload failed: " + error.message); return; }
    setPreview(URL.createObjectURL(file));
    setDraft({ ...draft, image_path: path, image_url: null });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseInt(draft.price, 10);
    if (!draft.name.trim() || !Number.isFinite(price) || price < 0) { toast.error("Please enter a name and price"); return; }
    setSaving(true);
    const row = {
      name: draft.name.trim(),
      category: draft.category,
      gender: draft.gender,
      price,
      old_price: draft.old_price ? parseInt(draft.old_price, 10) : null,
      description: draft.description.trim(),
      frame_shape: draft.frame_shape,
      frame_color: draft.frame_color,
      stock: parseInt(draft.stock || "0", 10),
      is_active: draft.is_active,
      is_featured: draft.is_featured,
      ...(draft.image_path ? { image_path: draft.image_path } : {}),
    };
    const { error } = draft.id
      ? await supabase.from("products").update(row).eq("id", draft.id)
      : await supabase.from("products").insert(row);
    setSaving(false);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success(draft.id ? "Product updated" : "Product added");
    onSaved();
  };

  return (
    <form onSubmit={save} className="grid gap-4">
      <div className="flex items-center gap-4">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-secondary">
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No photo</div>}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm hover:border-primary">
          <ImageUp className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload photo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label>Name</Label><Input value={draft.name} onChange={(e) => set("name", e.target.value)} required className="mt-1.5" /></div>
        <div>
          <Label>Category</Label>
          <select value={draft.category} onChange={(e) => set("category", e.target.value)} className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm">
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <Label>For</Label>
          <select value={draft.gender} onChange={(e) => set("gender", e.target.value)} className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm">
            {["unisex", "men", "women", "kids"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div><Label>Price (Rs)</Label><Input type="number" min={0} value={draft.price} onChange={(e) => set("price", e.target.value)} required className="mt-1.5" /></div>
        <div><Label>Old price (optional, shows a discount)</Label><Input type="number" min={0} value={draft.old_price} onChange={(e) => set("old_price", e.target.value)} className="mt-1.5" /></div>
        <div><Label>Stock</Label><Input type="number" min={0} value={draft.stock} onChange={(e) => set("stock", e.target.value)} className="mt-1.5" /></div>
        <div className="sm:col-span-2"><Label>Description</Label><Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={3} className="mt-1.5" /></div>
      </div>
      <div className="rounded-2xl bg-secondary p-4">
        <p className="text-sm font-semibold">Virtual Try-On look</p>
        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[1fr_auto_160px]">
          <select value={draft.frame_shape} onChange={(e) => set("frame_shape", e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            {FRAME_SHAPES.map((s) => <option key={s} value={s}>{s === "none" ? "No try-on (lenses, accessories)" : s}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">Colour <input type="color" value={draft.frame_color} onChange={(e) => set("frame_color", e.target.value)} className="h-9 w-12 rounded border" /></label>
          {draft.frame_shape !== "none" && <GlassesSvg shape={draft.frame_shape} color={draft.frame_color} tinted={draft.category === "sunglasses"} className="w-40" />}
        </div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><Switch checked={draft.is_active} onCheckedChange={(v) => set("is_active", v)} /> Show on website</label>
        <label className="flex items-center gap-2"><Switch checked={draft.is_featured} onCheckedChange={(v) => set("is_featured", v)} /> Featured on home page</label>
      </div>
      <Button type="submit" variant="hero" size="xl" disabled={saving || uploading}>{saving ? "Saving…" : "Save product"}</Button>
    </form>
  );
}
