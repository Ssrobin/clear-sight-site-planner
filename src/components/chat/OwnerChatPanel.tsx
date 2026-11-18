import { useEffect, useRef, useState } from "react";
import { Send, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const KEY = "optoline-owner-chat-v1";
type Session = { id: string; token: string; name: string };
type Msg = { id: string; sender: string; body: string; created_at: string };

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function OwnerChatPanel() {
  const [session, setSession] = useState<Session | null>(() => (typeof window === "undefined" ? null : readSession()));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
          <Store className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold">Chat with Optoline</p>
          <p className="text-xs text-muted-foreground">Message the shop owner directly</p>
        </div>
      </div>
      {session ? <Thread session={session} onLost={() => { localStorage.removeItem(KEY); setSession(null); }} /> : <StartForm onStarted={(s) => { localStorage.setItem(KEY, JSON.stringify(s)); setSession(s); }} />}
    </div>
  );
}

function StartForm({ onStarted }: { onStarted: (s: Session) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    const { data, error } = await supabase.rpc("start_conversation", { _name: name, _phone: phone, _message: message });
    setSending(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not send your message");
      return;
    }
    const d = data as { id: string; token: string };
    onStarted({ id: d.id, token: d.token, name: name.trim() });
  };

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
        Assalam o Alaikum! Leave your message and the owner will reply here. Usually within a few hours during shop timings.
      </p>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name *" maxLength={80} required />
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone / WhatsApp (optional)" maxLength={30} inputMode="tel" />
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help? *" rows={4} maxLength={2000} required />
      <Button type="submit" variant="highlight" size="xl" disabled={sending || !name.trim() || !message.trim()}>
        {sending ? "Sending…" : "Start chat"}
      </Button>
    </form>
  );
}

function Thread({ session, onLost }: { session: Session; onLost: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_visitor_messages", { _conversation_id: session.id, _token: session.token });
    if (error) return;
    if (data && data.length === 0) {
      onLost();
      return;
    }
    setMessages(data ?? []);
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    inputRef.current?.focus();
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const optimistic: Msg = { id: `tmp-${Date.now()}`, sender: "customer", body, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setText("");
    const { error } = await supabase.rpc("send_visitor_message", { _conversation_id: session.id, _token: session.token, _message: body });
    setSending(false);
    if (error) {
      toast.error("Message not sent. Please try again.");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setText(body);
      return;
    }
    void load();
    inputRef.current?.focus();
  };

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.sender === "customer" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-secondary-foreground"
              }`}
            >
              {m.sender === "admin" && <p className="mb-0.5 text-[11px] font-semibold text-primary">Optoline</p>}
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-right text-[10px] opacity-60">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        {messages.length > 0 && messages.every((m) => m.sender === "customer") && (
          <p className="text-center text-xs text-muted-foreground">Message received. The owner will reply here soon.</p>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
        <Textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Write a message…"
          rows={1}
          maxLength={2000}
          className="max-h-32 min-h-10 resize-none"
        />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full" disabled={!text.trim() || sending} aria-label="Send">
          <Send />
        </Button>
      </form>
    </>
  );
}
