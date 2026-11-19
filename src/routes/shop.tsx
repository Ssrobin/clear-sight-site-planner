import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/site/ProductCard";
import { CATEGORIES, categoryLabel, productsQuery } from "@/lib/catalog";

const searchSchema = z.object({
  category: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shop Glasses, Sunglasses & Lenses — Optoline" },
      { name: "description", content: "Browse affordable eyeglasses, sunglasses, kids' frames, blue-light glasses and contact lenses at Optoline." },
      { property: "og:title", content: "Shop Glasses & Lenses — Optoline" },
      { property: "og:description", content: "Affordable frames and lenses for the whole family, delivered across Pakistan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Shop,
});

const SORTS = [
  { v: "featured", l: "Featured" },
  { v: "low", l: "Price: low to high" },
  { v: "high", l: "Price: high to low" },
] as const;

function Shop() {
  const { category } = Route.useSearch();
  const { data: products } = useSuspenseQuery(productsQuery());
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["v"]>("featured");

  const list = useMemo(() => {
    let r = products.filter((p) => (!category || p.category === category) && (gender === "all" || p.gender === gender));
    if (q.trim()) {
      const t = q.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(t) || p.description.toLowerCase().includes(t));
    }
    if (sort === "low") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "high") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [products, category, gender, q, sort]);

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`;

  return (
    <div className="container-page py-10 md:py-14">
      <span className="eyebrow">Shop</span>
      <h1 className="mt-2 text-3xl font-bold md:text-5xl">{category ? categoryLabel(category) : "All frames & lenses"}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Free eye test with every pair. Cash on Delivery, JazzCash and Easypaisa accepted.</p>

      <div className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:px-0">
        <Link to="/shop" search={{}} className={chip(!category)}>All</Link>
        {CATEGORIES.map((c) => (
          <Link key={c.slug} to="/shop" search={{ category: c.slug }} className={chip(category === c.slug)}>
            {c.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search frames…" className="h-11 rounded-full bg-card pl-9" />
        </div>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-11 rounded-full border bg-card px-4 text-sm" aria-label="Filter by who it's for">
          <option value="all">Everyone</option>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="kids">Kids</option>
          <option value="unisex">Unisex</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-11 rounded-full border bg-card px-4 text-sm" aria-label="Sort">
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed p-12 text-center text-muted-foreground">No products found. Try another category or search.</div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
