import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ScanFace, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { useCart } from "@/lib/cart";
import { canTryOn, categoryLabel, formatPrice, productImageUrl, productQuery, productsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ context, params }) => {
    const [product] = await Promise.all([
      context.queryClient.ensureQueryData(productQuery(params.id)),
      context.queryClient.ensureQueryData(productsQuery()),
    ]);
    if (!product) throw notFound();
    return { name: product.name, description: product.description };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Optoline` },
          { name: "description", content: loaderData.description.slice(0, 155) },
          { property: "og:title", content: `${loaderData.name} — Optoline` },
          { property: "og:description", content: loaderData.description.slice(0, 155) },
          { property: "og:type", content: "product" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Product unavailable — Optoline" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-3xl font-bold">This product isn't available</h1>
      <Button asChild variant="hero" className="mt-6"><Link to="/shop">Back to shop</Link></Button>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(id));
  const { data: all } = useSuspenseQuery(productsQuery());
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const navigate = useNavigate();
  if (!product) return null;
  const related = all.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const img = productImageUrl(product);
  const inStock = product.stock > 0;

  const addToCart = () => {
    add({ productId: product.id, name: product.name, price: product.price, image: img }, qty);
    toast.success(`${product.name} added to cart`, { action: { label: "View cart", onClick: () => navigate({ to: "/cart" }) } });
  };

  return (
    <div className="container-page py-8 md:py-12">
      <Link to="/shop" search={{ category: product.category }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {categoryLabel(product.category)}
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-secondary">
          <img src={img} alt={product.name} className="aspect-square w-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="eyebrow">{categoryLabel(product.category)} · {product.gender}</span>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{product.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
            {product.old_price && product.old_price > product.price && (
              <span className="text-lg text-muted-foreground line-through">{formatPrice(product.old_price)}</span>
            )}
          </div>
          <p className="mt-5 leading-relaxed text-muted-foreground">{product.description}</p>
          <p className={`mt-4 text-sm font-medium ${inStock ? "text-success" : "text-destructive"}`}>{inStock ? "In stock" : "Out of stock"}</p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border bg-card">
              <button className="flex h-11 w-11 items-center justify-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button className="flex h-11 w-11 items-center justify-center" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase"><Plus className="h-4 w-4" /></button>
            </div>
            <Button variant="hero" size="xl" className="flex-1" disabled={!inStock} onClick={addToCart}>
              <ShoppingBag /> Add to cart
            </Button>
          </div>
          {canTryOn(product) && (
            <Button asChild variant="outline" size="xl" className="mt-3 rounded-full">
              <Link to="/try-on" search={{ product: product.id }}><ScanFace /> Try it on virtually</Link>
            </Button>
          )}
          <div className="mt-8 grid gap-3 rounded-2xl bg-secondary p-5 text-sm">
            <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Delivery in 2–4 days · Cash on Delivery, JazzCash, Easypaisa</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 6-month frame warranty · 7-day exchange</p>
            <p className="text-muted-foreground">Need prescription lenses? Upload your prescription at checkout or book a free eye test.</p>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-bold">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
