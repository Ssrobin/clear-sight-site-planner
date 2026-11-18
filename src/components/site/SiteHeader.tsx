import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { settingsQuery } from "@/lib/catalog";
import { Logo } from "./Logo";

const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/try-on", label: "Virtual Try-On" },
  { to: "/services", label: "Eye Care" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const { data } = useQuery(settingsQuery());
  const [open, setOpen] = useState(false);
  const announcement = data?.settings?.announcement;

  return (
    <header className="sticky top-0 z-40">
      {announcement && (
        <div className="bg-ink py-2 text-center text-xs font-medium text-ink-foreground">{announcement}</div>
      )}
      <div className="border-b bg-background/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="hero" className="hidden sm:inline-flex">
              <Link to="/book">Book Eye Test</Link>
            </Button>
            <Link
              to="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
              aria-label={`Cart, ${count} items`}
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-[11px] font-bold text-highlight-foreground">
                  {count}
                </span>
              )}
            </Link>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-background">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col gap-1 px-4">
                  {NAV.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-4 py-3 text-base font-medium hover:bg-secondary"
                    >
                      {n.label}
                    </Link>
                  ))}
                  <Button asChild variant="hero" size="xl" className="mt-4">
                    <Link to="/book" onClick={() => setOpen(false)}>
                      Book Eye Test
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
