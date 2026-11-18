import { Link } from "@tanstack/react-router";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Optoline home">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${inverted ? "bg-ink-foreground text-ink" : "bg-primary text-primary-foreground"}`}>
        <svg viewBox="0 0 32 16" className="h-4 w-7" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="24" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M14 7 Q16 5 18 7" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      </span>
      <span className={`font-display text-xl font-bold tracking-tight ${inverted ? "text-ink-foreground" : "text-foreground"}`}>
        Opto<span className={inverted ? "text-highlight" : "text-primary"}>line</span>
      </span>
    </Link>
  );
}
