import { createFileRoute, Link } from "@tanstack/react-router";
import { Baby, Clock, Eye, Glasses, ScanEye, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Eye Tests & Eye Care Services — Optoline" },
      { name: "description", content: "Eye examinations, kids' vision checks, contact lens fitting and frame repairs by certified optometrists at Optoline." },
      { property: "og:title", content: "Eye Care Services — Optoline" },
      { property: "og:description", content: "Eye tests for every age, contact lens fitting and same-day repairs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Services,
});

const SERVICES = [
  { icon: Eye, title: "Eye examination", time: "20 min", price: "Free with glasses · Rs 500 otherwise", text: "Complete vision check with modern equipment, including power, eye pressure screening and advice on lenses." },
  { icon: Baby, title: "Kids' eye care", time: "20 min", price: "Rs 500", text: "Gentle, fun vision checks for children. Early detection helps school performance and healthy eyes." },
  { icon: ScanEye, title: "Contact lens fitting", time: "30 min", price: "Rs 1,000", text: "Measurement, trial lenses, how to wear and clean them safely, plus a follow-up check." },
  { icon: Glasses, title: "Lens consultation", time: "15 min", price: "Free", text: "Single vision, bifocal or progressive? Anti-glare or blue-light? We'll explain simply and help you choose." },
  { icon: Wrench, title: "Repairs & adjustments", time: "Same day", price: "From Rs 0", text: "Loose screws, bent frames, nose pads and fitting adjustments — free for Optoline frames." },
] as const;

function Services() {
  return (
    <div className="container-page py-10 md:py-14">
      <span className="eyebrow">Eye care</span>
      <h1 className="mt-2 text-3xl font-bold md:text-5xl">Care for every pair of eyes</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Certified optometrists, modern equipment and a calm, family-friendly clinic.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <div key={s.title} className="flex flex-col rounded-3xl border bg-card p-6 shadow-soft">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><s.icon className="h-6 w-6" /></span>
            <h2 className="mt-5 text-xl font-semibold">{s.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.text}</p>
            <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /> {s.time}</span>
              <span className="font-semibold text-primary">{s.price}</span>
            </div>
          </div>
        ))}
        <div className="flex flex-col justify-between rounded-3xl bg-primary p-6 text-primary-foreground">
          <div>
            <h2 className="text-xl font-semibold">Ready for your eye test?</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">Pick a time that suits your family. We'll confirm by phone.</p>
          </div>
          <Button asChild variant="highlight" size="xl" className="mt-6"><Link to="/book">Book now</Link></Button>
        </div>
      </div>
    </div>
  );
}
