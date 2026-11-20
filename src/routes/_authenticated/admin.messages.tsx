import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: Messages,
});

function Messages() {
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>(null);
  const { data: convs = [] } = useQuery({
    queryKey: ["admin-convs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`admin-convs-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => qc.invalidateQueries({ queryKey: ["admin-convs"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        const row = p.new as { conversation_id: string };
        qc.invalidateQueries({ queryKey: ["admin-thread", row.conversation_id] });
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [qc]);

  const conv = convs.find((c) => c.id === active);

  return (
    <div>
      <h1 className="text-2xl font-bold md:text-3xl">Customer messages</h1>
      <p className="mt-1 text-muted-foreground">Messages from the “Chat with owner” button arrive here instantly.</p>
      <div className="mt-6 grid h-[70vh] overflow-hidden rounded-2xl border bg-card md:grid-cols-[320px_1fr]">
        <ul className={`overflow-y-auto border-r ${active ? "max-md:hidden" : ""}`}>
          {convs.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No messages yet.</li>}
          {convs.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setActive(c.id)}
                className={`flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left hover:bg-secondary ${active === c.id ? "bg-secondary" : ""}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{c.visitor_name}</span>
                  {c.unread_for_admin > 0 && <span className="rounded-full bg-highlight px-1.5 text-[11px] font-bold text-highlight-foreground">{c.unread_for_admin}</span>}
                </span>
                <span className="truncate text-sm text-muted-foreground">{c.last_message}</span>
                <span className="text-[11px] text-muted-foreground">{new Date(c.last_message_at).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className={`flex min-h-0 flex-col ${active ? "" : "max-md:hidden"}`}>
          {conv ? <Thread key={conv.id} conv={conv} onBack={() => setActive(null)} onDeleted={() => { setActive(null); qc.invalidateQueries({ queryKey: ["admin-convs"] }); }} /> : <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a conversation</div>}
        </div>
      </div>
    </div>
  );
}

type Conv = { id: string; visitor_name: string; visitor_phone: string | null; unread_for_admin: number };

function Thread({ conv, onBack, onDeleted }: { conv: Conv; onBack: () => void; onDeleted: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: msgs = [] } = useQuery({
    queryKey: ["admin-thread", conv.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("*").eq("conversation_id", conv.id).order("created_at");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (conv.unread_for_admin > 0) {
      void supabase.from("conversations").update({ unread_for_admin: 0 }).eq("id", conv.id).then(() => {
        qc.invalidateQueries({ queryKey: ["admin-convs"] });
        qc.invalidateQueries({ queryKey: ["admin-unread"] });
      });
    }
  }, [conv.id, conv.unread_for_admin, msgs.length, qc]);

  useEffect(() => bottomRef.current?.scrollIntoView(), [msgs.length]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({ conversation_id: conv.id, sender: "admin", body });
    setSending(false);
    if (error) { toast.error("Reply not sent"); return; }
    setText("");
    qc.invalidateQueries({ queryKey: ["admin-thread", conv.id] });
  };

  const del = async () => {
    if (!confirm("Delete this conversation?")) return;
    const { error } = await supabase.from("conversations").delete().eq("id", conv.id);
    if (error) { toast.error("Could not delete"); return; }
    onDeleted();
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button onClick={onBack} className="md:hidden" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <p className="font-semibold">{conv.visitor_name}</p>
          {conv.visitor_phone && (
            <a href={`tel:${conv.visitor_phone}`} className="flex items-center gap-1 text-xs text-primary"><Phone className="h-3 w-3" /> {conv.visitor_phone}</a>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={del} aria-label="Delete conversation"><Trash2 /></Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.sender === "admin" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary"}`}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-right text-[10px] opacity-60">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          rows={1}
          placeholder="Write a reply…"
          className="max-h-32 min-h-10 resize-none"
          autoFocus
        />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full" disabled={sending || !text.trim()} aria-label="Send reply"><Send /></Button>
      </form>
    </>
  );
}
