import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { settingsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Optoline — Address, Phone & Hours" },
      { name: "description", content: "Find Optoline's store address, phone, WhatsApp and opening hours, or chat with the owner directly." },
      { property: "og:title", content: "Contact Optoline" },
      { property: "og:description", content: "Address, phone, WhatsApp and opening hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { data } = useQuery(settingsQuery());
  const s = data?.settings;
  const wa = s?.whatsapp?.replace(/[^0-9]/g, "");
  const items = [
    { icon: MapPin, label: "Address", value: s?.address },
    { icon: Phone, label: "Phone", value: s?.phone, href: s ? `tel:${s.phone.replace(/\s/g, "")}` : undefined },
    { icon: MessageCircle, label: "WhatsApp", value: s?.whatsapp, href: wa ? `https://wa.me/${wa}` : undefined },
    { icon: Mail, label: "Email", value: s?.email, href: s ? `mailto:${s.email}` : undefined },
    { icon: Clock, label: "Opening hours", value: s?.opening_hours },
  ];
  return (
    <div className="container-page py-10 md:py-14">
      <span className="eyebrow">Contact</span>
      <h1 className="mt-2 text-3xl font-bold md:text-5xl">We'd love to see you</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Visit the store, call us, or tap “Chat with owner” at the bottom of any page.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="grid gap-3">
          {items.map((i) => (
            <div key={i.label} className="flex items-start gap-4 rounded-2xl border bg-card p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><i.icon className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{i.label}</p>
                {i.href ? <a href={i.href} className="mt-1 block font-medium hover:text-primary">{i.value}</a> : <p className="mt-1 font-medium">{i.value}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="min-h-[360px] overflow-hidden rounded-3xl border bg-secondary">
          {s?.address && (
            <iframe
              title="Store location map"
              className="h-full min-h-[360px] w-full"
              loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
