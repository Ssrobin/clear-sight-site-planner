import { lazy, Suspense, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import assistantAvatar from "@/assets/optoline-assistant.webp";
import { OwnerChatPanel } from "./OwnerChatPanel";

const AssistantPanel = lazy(() => import("./AssistantPanel").then((m) => ({ default: m.AssistantPanel })));

type Open = "ai" | "owner" | null;

export function ChatDock() {
  const [open, setOpen] = useState<Open>(null);
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-3xl border bg-background shadow-elegant animate-rise sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[600px] sm:w-[400px] sm:rounded-3xl">
          <button
            onClick={() => setOpen(null)}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary hover:bg-muted"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
          {open === "ai" ? (
            <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
              <AssistantPanel />
            </Suspense>
          ) : (
            <OwnerChatPanel />
          )}
        </div>
      )}
      <div className={`fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6 ${open ? "max-sm:hidden" : ""}`}>
        <button
          onClick={() => setOpen(open === "ai" ? null : "ai")}
          className="group flex items-center gap-2 rounded-full bg-card py-1.5 pl-1.5 pr-4 text-sm font-semibold shadow-elegant ring-1 ring-border transition-transform hover:-translate-y-0.5"
          aria-label="Ask the AI assistant"
        >
          <img src={assistantAvatar} alt="" className="h-9 w-9 rounded-full" />
          Ask AI
        </button>
        <button
          onClick={() => setOpen(open === "owner" ? null : "owner")}
          className="flex items-center gap-2 rounded-full bg-highlight px-4 py-3 text-sm font-semibold text-highlight-foreground shadow-elegant transition-transform hover:-translate-y-0.5"
          aria-label="Chat with the owner"
        >
          <MessageCircle className="h-5 w-5" />
          Chat with owner
        </button>
      </div>
    </>
  );
}
