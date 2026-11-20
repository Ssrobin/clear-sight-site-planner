import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/appointments")({
  component: Appointments,
});

const STATUSES = ["new", "confirmed", "completed", "cancelled"];

function Appointments() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").order("preferred_date", { ascending: true }).limit(300);
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    qc.invalidateQueries({ queryKey: ["admin-appointments"] });
  };
  return (
    <div>
      <h1 className="text-2xl font-bold md:text-3xl">Eye test bookings</h1>
      <p className="mt-1 text-muted-foreground">Call the customer to confirm, then update the status.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Date</th><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Service</th><th className="p-3">Notes</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No bookings yet.</td></tr>}
            {data.map((a) => (
              <tr key={a.id}>
                <td className="p-3 whitespace-nowrap">{a.preferred_date}<br /><span className="text-muted-foreground">{a.preferred_time}</span></td>
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3"><a href={`tel:${a.phone}`} className="text-primary">{a.phone}</a></td>
                <td className="p-3">{a.service}</td>
                <td className="p-3 text-muted-foreground">{a.notes}</td>
                <td className="p-3">
                  <select value={a.status} onChange={(e) => update(a.id, e.target.value)} className="h-9 rounded-lg border bg-background px-2 capitalize">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
