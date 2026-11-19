import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { canTryOn, productsQuery } from "@/lib/catalog";

const TryOnStudio = lazy(() => import("@/components/tryon/TryOnStudio").then((m) => ({ default: m.TryOnStudio })));

export const Route = createFileRoute("/try-on")({
  validateSearch: z.object({ product: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Virtual Try-On — See Frames on Your Face | Optoline" },
      { name: "description", content: "Try Optoline glasses and sunglasses on your face using your camera or a selfie, then order with Cash on Delivery, JazzCash or Easypaisa." },
      { property: "og:title", content: "Virtual Try-On — Optoline" },
      { property: "og:description", content: "See how frames look on you before you buy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: TryOnPage,
});

function TryOnPage() {
  const { product } = Route.useSearch();
  const { data } = useSuspenseQuery(productsQuery());
  const frames = data.filter(canTryOn);
  const fallback = <div className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-secondary" />;
  return (
    <div className="container-page py-10 md:py-14">
      <span className="eyebrow">Virtual Try-On</span>
      <h1 className="mt-2 text-3xl font-bold md:text-5xl">Try frames on your face</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Turn on your camera or upload a selfie. Frames follow your face automatically — pick a style on the right.</p>
      <div className="mt-8">
        <ClientOnly fallback={fallback}>
          <Suspense fallback={fallback}>
            <TryOnStudio frames={frames} initialId={product} />
          </Suspense>
        </ClientOnly>
      </div>
    </div>
  );
}
