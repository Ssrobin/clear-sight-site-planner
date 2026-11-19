import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Optoline — Family Opticians" },
      { name: "description", content: "Optoline is a family optical store offering honest prices, quality lenses and friendly eye care." },
      { property: "og:title", content: "About Optoline" },
      { property: "og:description", content: "Honest prices, quality lenses and friendly eye care for every family." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="container-page py-10 md:py-14">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <span className="eyebrow">Our story</span>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">Good vision shouldn't be complicated</h1>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Optoline started with a simple idea: every family deserves clear vision, honest advice and glasses they love wearing — without overpaying. Our optometrists take time with every customer, from a child's first eye test to grandparents' reading glasses.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            We stock carefully chosen frames, use quality branded lenses and deliver across Pakistan with Cash on Delivery, JazzCash and Easypaisa.
          </p>
          <Button asChild variant="hero" size="xl" className="mt-8"><Link to="/contact">Visit our store</Link></Button>
        </div>
        <img src="/images/hero-family.jpg" alt="A family wearing glasses from Optoline" className="aspect-[4/3] w-full rounded-3xl object-cover object-right shadow-soft" />
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          { n: "10,000+", l: "Happy customers" },
          { n: "500+", l: "Frames in store" },
          { n: "4.9★", l: "Average rating" },
        ].map((s) => (
          <div key={s.l} className="rounded-3xl bg-secondary p-8 text-center">
            <p className="font-display text-4xl font-bold text-primary">{s.n}</p>
            <p className="mt-2 text-sm text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
