import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { CATEGORIES, settingsQuery } from "@/lib/catalog";
import { Logo } from "./Logo";

export function SiteFooter() {
  const { data } = useQuery(settingsQuery());
  const s = data?.settings;
  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="space-y-4">
          <Logo inverted />
          <p className="text-sm text-ink-foreground/70">
            Glasses, contact lenses and expert eye tests for the whole family — at prices that make sense.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold">Shop</h4>
          <ul className="space-y-2 text-sm text-ink-foreground/70">
            {CATEGORIES.slice(0, 5).map((c) => (
              <li key={c.slug}>
                <Link to="/shop" search={{ category: c.slug }} className="hover:text-ink-foreground">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold">Help</h4>
          <ul className="space-y-2 text-sm text-ink-foreground/70">
            <li><Link to="/try-on" className="hover:text-ink-foreground">Virtual Try-On</Link></li>
            <li><Link to="/services" className="hover:text-ink-foreground">Eye care services</Link></li>
            <li><Link to="/book" className="hover:text-ink-foreground">Book an eye test</Link></li>
            <li><Link to="/about" className="hover:text-ink-foreground">About us</Link></li>
            <li><Link to="/contact" className="hover:text-ink-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold">Visit us</h4>
          <ul className="space-y-3 text-sm text-ink-foreground/70">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{s?.address ?? "Karachi"}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" />{s?.phone}</li>
            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" />{s?.email}</li>
            <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{s?.opening_hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-foreground/60 sm:flex-row">
          <span>© {new Date().getFullYear()} Optoline. All rights reserved.</span>
          <span>Cash on Delivery · JazzCash · Easypaisa</span>
          <Link to="/auth" className="hover:text-ink-foreground">Owner login</Link>
        </div>
      </div>
    </footer>
  );
}
