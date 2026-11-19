import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/order-success")({
  validateSearch: z.object({
    order: z.coerce.number().optional(),
    total: z.coerce.number().optional(),
    method: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Order Placed — Optoline" },
      { name: "description", content: "Thank you for your Optoline order." },
      { property: "og:title", content: "Order Placed — Optoline" },
      { property: "og:description", content: "Thank you for shopping with Optoline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Success,
});

function Success() {
  const { order, total, method } = Route.useSearch();
  const label = method === "jazzcash" ? "JazzCash" : method === "easypaisa" ? "Easypaisa" : "Cash on Delivery";
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <CheckCircle2 className="h-16 w-16 text-success" />
      <h1 className="mt-6 text-3xl font-bold md:text-4xl">Shukriya! Your order is placed.</h1>
      {order && <p className="mt-3 text-lg">Order number <strong>#{order}</strong></p>}
      <p className="mt-2 max-w-md text-muted-foreground">
        {total ? `Total ${formatPrice(total)} · ` : ""}{label}. We'll call you shortly to confirm and dispatch your order.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild variant="hero" size="xl"><Link to="/shop">Continue shopping</Link></Button>
      </div>
    </div>
  );
}
