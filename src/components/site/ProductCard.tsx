import { Link } from "@tanstack/react-router";
import { ScanFace } from "lucide-react";
import { canTryOn, categoryLabel, formatPrice, productImageUrl, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  const off = product.old_price && product.old_price > product.price ? Math.round((1 - product.price / product.old_price) * 100) : 0;
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-elegant"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={productImageUrl(product)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold text-highlight-foreground">
            -{off}%
          </span>
        )}
        {canTryOn(product) && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium text-primary backdrop-blur">
            <ScanFace className="h-3.5 w-3.5" /> Try-On
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{categoryLabel(product.category)}</span>
        <h3 className="font-display text-base font-semibold text-foreground">{product.name}</h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-semibold text-primary">{formatPrice(product.price)}</span>
          {off > 0 && <span className="text-sm text-muted-foreground line-through">{formatPrice(product.old_price!)}</span>}
        </div>
      </div>
    </Link>
  );
}
