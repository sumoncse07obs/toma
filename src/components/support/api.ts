// src/components/support/api.ts
import type { SupportTicket } from "./types";

const API_BASE = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";
const norm = (p: string) =>
  `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`.replace(/([^:]\/)\/+/g, "$1");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(norm(path), {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// small helper to build querystrings safely
function qs(params?: Record<string, any>) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
}

export const SupportAPI = {
  // ---------- Customer ----------
  // customerId is now OPTIONAL; backend infers for customer users when omitted
  list: (customerId?: number, status?: string) =>
    api<{ data: SupportTicket[]; links?: any; meta?: any }>(
      `/support/tickets${qs({ customer_id: customerId, status })}`
    ),

  create: (payload: {
    customer_id: number;
    subject: string;
    priority?: "low" | "normal" | "high";
    message: string;
    attachments?: { name: string; mime?: string | null; url: string }[];
  }) =>
    api<{ ticket: SupportTicket }>(`/support/tickets`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  get: (id: number) => api<SupportTicket>(`/support/tickets/${id}`),

  reply: (
    id: number,
    payload: { message: string; attachments?: { name: string; mime?: string | null; url: string }[] }
  ) =>
    api<SupportTicket>(`/support/tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ---------- Admin / Staff ----------
  // list all tickets (optionally filter by status, customer_id, page)
  listAll: (params?: {
    status?: "open" | "pending" | "closed";
    customer_id?: number;
    page?: number;
  }) =>
    api<{ data: SupportTicket[]; links?: any; meta?: any }>(
      `/support/tickets${qs(params)}`
    ),

  // update ticket status/priority (staff-only per API)
  update: (
    id: number,
    payload: { status?: "open" | "pending" | "closed"; priority?: "low" | "normal" | "high" }
  ) =>
    api<SupportTicket>(`/support/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // unread helpers
  markRead: (id: number) =>
    api<{ ok: boolean; unread_count: number }>(`/support/tickets/${id}/read`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  unreadSummary: () =>
    api<{ total_unread_tickets: number; total_unread_messages: number }>(
      `/support/unread-summary`
    ),
};
