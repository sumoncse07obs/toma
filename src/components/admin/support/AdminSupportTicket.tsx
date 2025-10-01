import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { SupportAPI } from "@/components/support/api";
import type { SupportTicket } from "@/components/support/types";

export default function AdminSupportTicket() {
  const { id } = useParams();
  const ticketId = Number(id);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; mime?: string | null; url: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  async function load() {
    try {
      if (!Number.isFinite(ticketId)) throw new Error("Invalid ticket id");
      const t = await SupportAPI.get(ticketId);
      setTicket(t);
      // mark as read after successful fetch
      await SupportAPI.markRead(ticketId).catch(() => {});
      // cross-tab signal (optional)
      try { localStorage.setItem(`support_read_${ticketId}`, String(Date.now())); } catch {}
    } catch (e: any) {
      toast.error(e.message || "Failed to load ticket");
    }
  }

  // mark read on mount and when window regains focus
  useEffect(() => {
    load();
    const onFocus = () => {
      if (!Number.isFinite(ticketId)) return;
      SupportAPI.markRead(ticketId).catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const t = await SupportAPI.reply(ticketId, { message, attachments });
      setTicket(t);
      setMessage("");
      setAttachments([]);
      // ensure your own unread == 0 immediately
      await SupportAPI.markRead(ticketId).catch(() => {});
      try { localStorage.setItem(`support_read_${ticketId}`, String(Date.now())); } catch {}
      toast.success("Reply sent");
    } catch (e: any) {
      toast.error(e.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function saveMeta(next: { status?: "open" | "pending" | "closed"; priority?: "low" | "normal" | "high" }) {
    setSavingMeta(true);
    try {
      const t = await SupportAPI.update(ticketId, next);
      setTicket(t);
      toast.success("Updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally {
      setSavingMeta(false);
    }
  }

  if (!ticket) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{ticket.subject}</h1>
          <div className="text-sm text-slate-600">Customer #{ticket.customer_id}</div>
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded-md px-2 py-1"
            value={ticket.status}
            onChange={(e) => saveMeta({ status: e.target.value as any })}
            disabled={savingMeta}
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>

          <select
            className="border rounded-md px-2 py-1"
            value={ticket.priority}
            onChange={(e) => saveMeta({ priority: e.target.value as any })}
            disabled={savingMeta}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow p-4 space-y-4">
        {ticket.messages?.map((m) => (
          <div key={m.id} className="border rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">
              {m.is_staff ? "Support" : "Customer"} • {new Date(m.created_at).toLocaleString()}
            </div>
            <div className="whitespace-pre-wrap">{m.message}</div>
            {!!m.attachments?.length && (
              <div className="mt-2 text-sm">
                <div className="font-medium">Attachments</div>
                <ul className="list-disc ml-5">
                  {m.attachments.map((a) => (
                    <li key={a.id}>
                      <a className="underline" href={a.url} target="_blank" rel="noreferrer">
                        {a.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={sendReply} className="mt-4 bg-white rounded-xl border shadow p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Reply</label>
        <textarea
            className="w-full border rounded-md px-3 py-2 min-h-[120px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Attachments (paste URLs)</div>
          {attachments.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 border rounded-md px-2 py-1"
                value={a.name}
                onChange={(e) => {
                  const c = [...attachments];
                  c[i] = { ...c[i], name: e.target.value };
                  setAttachments(c);
                }}
                placeholder="File name"
              />
              <input
                className="flex-[2] border rounded-md px-2 py-1"
                value={a.url}
                onChange={(e) => {
                  const c = [...attachments];
                  c[i] = { ...c[i], url: e.target.value };
                  setAttachments(c);
                }}
                placeholder="https://..."
              />
              <button
                type="button"
                className="px-2 border rounded-md"
                onClick={() => {
                  setAttachments(attachments.filter((_, x) => x !== i));
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="px-3 py-1 border rounded-md"
            onClick={() => setAttachments([...attachments, { name: "attachment", url: "" }])}
          >
            + Add Attachment
          </button>
        </div>

        <button disabled={sending} className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50">
          {sending ? "Sending…" : "Send Reply"}
        </button>
      </form>
    </div>
  );
}
