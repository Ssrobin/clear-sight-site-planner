import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type SiteSettings = Tables<"site_settings">;

export const CATEGORIES = [
  { slug: "eyeglasses", label: "Eyeglasses", blurb: "Everyday frames for work, study and home" },
  { slug: "sunglasses", label: "Sunglasses", blurb: "UV400 and polarized shades" },
  { slug: "kids", label: "Kids", blurb: "Bend-proof frames for little explorers" },
  { slug: "blue-light", label: "Blue-Light", blurb: "Less strain from screens" },
  { slug: "contact-lenses", label: "Contact Lenses", blurb: "Daily and monthly lenses" },
  { slug: "accessories", label: "Accessories", blurb: "Cases, cleaners and solutions" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const FRAME_SHAPES = ["round", "rectangle", "square", "cat-eye", "aviator", "none"] as const;
export type FrameShape = (typeof FRAME_SHAPES)[number];

export function categoryLabel(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function formatPrice(amount: number) {
  return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
}

export function canTryOn(p: Pick<Product, "frame_shape" | "category">) {
  return p.frame_shape !== "none" && p.category !== "contact-lenses" && p.category !== "accessories";
}

export function productImageUrl(p: Pick<Product, "image_url">) {
  return p.image_url ?? "/images/products/harbor-round.jpg";
}

export async function withSignedImages<T extends Pick<Product, "image_path" | "image_url">>(rows: T[]) {
  const paths = rows.map((r) => r.image_path).filter((x): x is string => !!x);
  if (paths.length === 0) return rows;
  const { data } = await supabase.storage.from("product-images").createSignedUrls(paths, 60 * 60 * 24 * 7);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => (r.image_path && map.get(r.image_path) ? { ...r, image_url: map.get(r.image_path)!, image_path: null } : r));
}

export const productsQuery = () =>
  queryOptions({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return withSignedImages(data ?? []);
    },
  });

export const productQuery = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const [p] = await withSignedImages([data]);
      return p;
    },
  });

export const settingsQuery = () =>
  queryOptions({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw new Error(error.message);
      let heroUrl: string | null = null;
      if (data?.hero_image_path) {
        const { data: s } = await supabase.storage
          .from("product-images")
          .createSignedUrl(data.hero_image_path, 60 * 60 * 24 * 7);
        heroUrl = s?.signedUrl ?? null;
      }
      return { settings: data, heroUrl };
    },
  });
