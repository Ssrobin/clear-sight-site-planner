import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Baby, Eye, Glasses, HeartHandshake, ScanFace, ShieldCheck, Star, Sun, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { GlassesSvg } from "@/components/tryon/GlassesSvg";
import { CATEGORIES, productsQuery, settingsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Optoline — Affordable Glasses & Eye Tests for the Whole Family" },
      { name: "description", content: "Shop eyeglasses, sunglasses, kids' frames and contact lenses. Try frames on virtually, book an eye test and pay by Cash on Delivery, JazzCash or Easypaisa." },
      { property: "og:title", content: "Optoline — Glasses & Eye Tests for the Whole Family" },
      { property: "og:description", content: "Try frames virtually, book an eye test and shop with Cash on Delivery, JazzCash or Easypaisa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Home,
});

const CATEGORY_ICONS: Record<string, typeof Glasses> = {
  eyeglasses: Glasses,
  sunglasses: Sun,
  kids: Baby,
  "blue-light": ScanFace,
  "contact-lenses": Eye,
  accessories: HeartHandshake,
};

const REVIEWS = [
  { name: "Ayesha K.", text: "Got glasses for my whole family. Eye test was quick and the staff were so patient with my son.", city: "Karachi" },
  { name: "Bilal R.", text: "Tried the frames on my phone first, ordered with cash on delivery — arrived in 3 days. Perfect fit.", city: "Lahore" },
  { name: "Sana M.", text: "Affordable prices and genuinely good lenses. The blue-light pair helps a lot with work.", city: "Islamabad" },
];

function Home() {
  const { data: products } = useSuspenseQuery(productsQuery());
  const { data: settingsData } = useQuery(settingsQuery());
  const s = settingsData?.settings;
  const featured = products.filter((p) => p.is_featured).slice(0, 4);
  const list = featured.length >= 4 ? featured : products.slice(0, 4);
  const heroImg = settingsData?.heroUrl ?? "/images/hero-family.jpg";

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover object-[70%_center]" />
          <div className="absolute inset-0 bg-hero-fade max-md:bg-background/80" />
        </div>
        <div className="container-page relative flex min-h-[560px] items-center py-16 md:min-h-[640px]">
          <div className="max-w-xl animate-rise">
            <span className="eyebrow">Optoline Optics</span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] text-foreground sm:text-5xl md:text-6xl">
              {s?.hero_title ?? "Clear vision for the whole family"}
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              {s?.hero_subtitle ?? "Stylish, affordable glasses, contact lenses and expert eye tests."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/shop">
                  Shop frames <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="rounded-full bg-card/70">
                <Link to="/try-on">
                  <ScanFace /> Try on virtually
                </Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-primary" /> Certified optometrists</span>
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" /> Delivery across Pakistan</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> 6-month frame warranty</span>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-page py-16 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Shop by category</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Something for everyone</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Glasses;
            return (
              <Link
                key={c.slug}
                to="/shop"
                search={{ category: c.slug }}
                className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-soft"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-display font-semibold">{c.label}</span>
                <span className="text-xs text-muted-foreground">{c.blurb}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section className="container-page pb-16 md:pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Bestsellers</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Family favourites</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <Button asChild variant="outline" className="mt-6 w-full rounded-full sm:hidden">
          <Link to="/shop">View all frames</Link>
        </Button>
      </section>

      {/* TRY-ON TEASER */}
      <section className="container-page pb-16 md:pb-20">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-ink p-8 text-ink-foreground md:grid-cols-2 md:p-14">
          <div>
            <span className="eyebrow text-highlight">Virtual Try-On</span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">See how frames look on you — before you buy</h2>
            <p className="mt-4 text-ink-foreground/75">
              Use your camera or upload a selfie. Frames snap onto your face automatically, and you can switch styles and colours in one tap.
            </p>
            <Button asChild variant="highlight" size="xl" className="mt-8">
              <Link to="/try-on"><ScanFace /> Start Try-On</Link>
            </Button>
          </div>
          <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-full bg-ink-foreground/5 ring-1 ring-ink-foreground/10">
            <div className="absolute inset-8 rounded-full border border-dashed border-ink-foreground/20" />
            <div className="grid w-4/5 gap-6">
              <GlassesSvg shape="round" color="oklch(0.72 0.14 52)" className="w-full" />
              <GlassesSvg shape="cat-eye" color="oklch(0.85 0.04 190)" className="w-full" />
              <GlassesSvg shape="aviator" color="oklch(0.8 0.1 85)" tinted className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* EYE EXAM */}
      <section className="container-page pb-16 md:pb-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <img src="/images/eye-exam.jpg" alt="Optometrist doing an eye test on a child" loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-soft" />
          <div>
            <span className="eyebrow">Eye care</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Expert eye tests for every age</h2>
            <p className="mt-4 text-muted-foreground">
              Our certified optometrists check your vision with modern equipment in a calm, friendly clinic — kids included. Free with every pair of glasses.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Complete eye examination in 20 minutes", "Kids' vision check with patient, friendly staff", "Contact lens fitting and follow-up", "Same-day frame repairs and adjustments"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground"><BadgeCheck className="h-3.5 w-3.5" /></span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl"><Link to="/book">Book an eye test</Link></Button>
              <Button asChild variant="ghost" size="xl" className="rounded-full"><Link to="/services">All services</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* WHY + REVIEWS */}
      <section className="bg-secondary py-16 md:py-20">
        <div className="container-page">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Truck, title: "Fast delivery", text: "2–4 working days across Pakistan. Pay on delivery, JazzCash or Easypaisa." },
              { icon: ShieldCheck, title: "Quality guaranteed", text: "Branded lenses with anti-glare and UV protection. 6-month frame warranty." },
              { icon: HeartHandshake, title: "Easy exchange", text: "Not happy with the fit? Exchange within 7 days, no fuss." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl bg-card p-6 shadow-soft">
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <span className="eyebrow">Happy customers</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Families trust Optoline</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure key={r.name} className="rounded-2xl border bg-card p-6">
                <div className="flex gap-0.5 text-highlight">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed">“{r.text}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold">{r.name} <span className="font-normal text-muted-foreground">· {r.city}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
