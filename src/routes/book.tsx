import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an Eye Test — Optoline" },
      { name: "description", content: "Book an eye examination, kids' vision check or contact lens fitting at Optoline in a few taps." },
      { property: "og:title", content: "Book an Eye Test — Optoline" },
      { property: "og:description", content: "Pick a service and a time — we'll confirm by phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Book,
});

const SERVICE_OPTIONS = ["Eye examination", "Kids' eye care", "Contact lens fitting", "Lens consultation", "Repairs & adjustments"];
const TIMES = ["11:00 am", "12:30 pm", "2:00 pm", "3:30 pm", "5:00 pm", "6:30 pm", "8:00 pm"];

function Book() {
  const today = new Date().toISOString().slice(0, 10);
  const [service, setService] = useState(SERVICE_OPTIONS[0]);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(TIMES[2]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({ service, preferred_date: date, preferred_time: time, name: name.trim(), phone: phone.trim(), notes: notes.trim() || null });
    setSaving(false);
    if (error) {
      toast.error("Could not book. Please check your details and try again.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground"><CalendarCheck className="h-8 w-8" /></span>
        <h1 className="mt-6 text-3xl font-bold">Booking received!</h1>
        <p className="mt-3 max-w-md text-muted-foreground">Thank you, {name}. We'll call you on {phone} to confirm your {service.toLowerCase()} on {date} at {time}.</p>
      </div>
    );
  }

  const chip = (active: boolean) => `rounded-full border px-4 py-2 text-sm font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`;

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <span className="eyebrow">Appointments</span>
      <h1 className="mt-2 text-3xl font-bold md:text-5xl">Book an eye test</h1>
      <p className="mt-3 text-muted-foreground">Takes less than a minute. We'll confirm by phone.</p>
      <form onSubmit={submit} className="mt-8 space-y-8 rounded-3xl border bg-card p-6 shadow-soft md:p-8">
        <div>
          <Label className="text-sm font-semibold">1. Choose a service</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map((s) => <button type="button" key={s} className={chip(service === s)} onClick={() => setService(s)}>{s}</button>)}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="date" className="text-sm font-semibold">2. Date</Label>
            <Input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required className="mt-3 h-11" />
          </div>
          <div>
            <Label className="text-sm font-semibold">3. Time</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {TIMES.map((t) => <button type="button" key={t} className={chip(time === t)} onClick={() => setTime(t)}>{t}</button>)}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name" className="text-sm font-semibold">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className="mt-2 h-11" />
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm font-semibold">Phone / WhatsApp</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={5} maxLength={30} inputMode="tel" className="mt-2 h-11" />
          </div>
        </div>
        <div>
          <Label htmlFor="notes" className="text-sm font-semibold">Anything we should know? (optional)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} className="mt-2" placeholder="e.g. booking for 2 kids, current glasses power…" />
        </div>
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={saving}>{saving ? "Booking…" : "Confirm booking"}</Button>
      </form>
    </div>
  );
}
