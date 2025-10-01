import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { SupportAPI } from "./api";
import type { SupportTicket } from "./types";

export default function SupportHome() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>(""); // "", "open", "pending", "closed"

  async function load() {
    setLoading(true);
    try {
      // 👇 No customerId passed—API infers from auth’d user
      const res = await SupportAPI.list(undefined, status || undefined);
      setTickets(res.data || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 25000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status]); // and any filters you use

  const unreadTicketsCount = useMemo(
    () => tickets.filter(t => (t.unread_count ?? 0) > 0).length,
    [tickets]
  );

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Support</h1>
          {unreadTicketsCount > 0 && (
            <span className="inline-flex items-center justify-center text-[11px] font-semibold bg-red-600 text-white rounded-full h-5 px-2">
              {Math.min(unreadTicketsCount, 99)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            className="border rounded-md px-2 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            title="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>

          <button
            onClick={load}
            className="px-3 py-2 border rounded-md text-sm hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>

          <Link
            to="new"
            className="px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-sm"
          >
            New Ticket
          </Link>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Subject</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const unread = t.unread_count ?? 0;
                return (
                  <tr key={t.id} className={`border-t hover:bg-slate-50 ${unread > 0 ? "bg-red-50/40" : ""}`}>
                    <td className="p-3">
                      <Link className="text-slate-900 underline inline-flex items-center gap-2" to={`${t.id}`}>
                        <span>{t.subject}</span>
                        {unread > 0 && (
                          <span className="inline-flex items-center justify-center text-[11px] font-semibold bg-red-600 text-white rounded-full w-5 h-5">
                            {Math.min(unread, 9)}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="p-3 capitalize">{t.priority}</td>
                    <td className="p-3 capitalize">{t.status}</td>
                    <td className="p-3">{t.last_activity_at ?? t.created_at}</td>
                  </tr>
                );
              })}
              {tickets.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={4}>
                    No tickets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
