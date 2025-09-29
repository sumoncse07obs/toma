// src/components/Sidebar.tsx
import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { logout, currentUser, refreshUser } from "@/components/auth";

/* ============== API helper (matches BlogPromptSettings) ============== */

const API_BASE = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";

function norm(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`.replace(/([^:]\/)\/+/g, "$1");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("toma_token");
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
    let msg = text || res.statusText || "Request failed";
    try {
      const j = JSON.parse(text);
      msg = j?.message || msg;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json")
    ? await res.json()
    : (undefined as any)) as T;
}

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

/** GET the logged-in customer's record and return customer_number */
async function fetchCustomerNumber(): Promise<string | undefined> {
  try {
    const res = await api<any>("/customers/me");
    const data = unwrap<{ customer_number?: string }>(res);
    // API may wrap as { data: {...} } or be direct; unwrap() handles both
    return (res?.data?.customer_number ?? data?.customer_number) || undefined;
  } catch {
    return undefined;
  }
}

/* ================= UI ================= */

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
};

const navItems = [
  { to: "/customer/blog/list", label: "Blog Automation", icon: "📝" },
  { to: "/customer/youtube/list", label: "YouTube Automation", icon: "▶️" },
  { to: "/customer/topic/list", label: "Topic Automation", icon: "📚" },
  { to: "/customer/launch/list", label: "Launch Automation", icon: "🚀" },
];

const settingsChildren = [
  { to: "/customer/settings/api", label: "API" },
  { to: "/customer/settings/blog-prompt", label: "Blog Prompt" },
  { to: "/customer/settings/youtube-prompt", label: "Youtube Prompt" },
  { to: "/customer/settings/topic-prompt", label: "Topic Prompt" },
  { to: "/customer/settings/launch-prompt", label: "Launch Prompt" },
  { to: "/customer/settings/profile", label: "Profile" },
];

export default function Sidebar({ open, setOpen, collapsed, setCollapsed }: Props) {
  const nav = useNavigate();
  const location = useLocation();

  const [user, setUser] = React.useState<any>(() => currentUser());
  const [customerNumber, setCustomerNumber] = React.useState<string | undefined>(undefined);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const onSettingsRoute = location.pathname.startsWith("/customer/settings");
  const [settingsOpen, setSettingsOpen] = React.useState(onSettingsRoute);

  // Keep name/email fresh
  const syncUser = React.useCallback(async () => {
    try {
      const u = await refreshUser();
      setUser(u);
    } catch {
      setUser(currentUser());
    }
  }, []);

  // Fetch customer_number using authenticated GET
  const syncCustomer = React.useCallback(async () => {
    const num = await fetchCustomerNumber();
    setCustomerNumber(num);
  }, []);

  // On mount + window focus
  React.useEffect(() => {
    syncUser();
    syncCustomer();
    const onFocus = () => {
      syncUser();
      syncCustomer();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncUser, syncCustomer]);

  // On route change
  React.useEffect(() => {
    syncUser();
    syncCustomer();
  }, [location.pathname, syncUser, syncCustomer]);

  // Keep dropdown in sync with route
  React.useEffect(() => {
    if (onSettingsRoute) setSettingsOpen(true);
  }, [onSettingsRoute]);

  const display = user?.name || user?.email || "Guest";
  const initial = display?.[0]?.toUpperCase() || "?";

  const isChildActive = (to: string) => location.pathname === to;
  const isAnySettingsChildActive = settingsChildren.some((c) => isChildActive(c.to));

  return (
    <>
      {/* overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200
        h-screen flex flex-col
        transform transition-transform duration-200 ease-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        ${collapsed ? "w-20" : "w-64"}
        lg:translate-x-0`}
      >
        {/* Brand + collapse */}
        <div className="h-16 flex items-center px-4 border-b justify-between">
          <NavLink to="/customer" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 overflow-hidden">
              <img src="/logo.svg" alt="TOMA Logo" className="h-9 w-9 rounded-xl object-contain" />
            </div>
            {!collapsed && <span className="font-semibold">TOMA</span>}
          </NavLink>

          <button
            className="hidden lg:inline-flex rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "➡️" : "⬅️"}
          </button>
          <button
            className="lg:hidden rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            ✖
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`
              }
              onClick={() => setOpen(false)}
            >
              <span className="text-base" aria-hidden>
                {it.icon}
              </span>
              {!collapsed && <span>{it.label}</span>}
            </NavLink>
          ))}

          {/* Settings */}
          <div className="mt-2">
            <button
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
                ${
                  isAnySettingsChildActive || settingsOpen
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              onClick={() => {
                if (collapsed) setCollapsed(false);
                setSettingsOpen((v) => !v);
              }}
              aria-expanded={settingsOpen}
              aria-controls="settings-submenu"
            >
              <span className="flex items-center gap-3">
                <span className="text-base" aria-hidden>
                  ⚙️
                </span>
                {!collapsed && <span>Settings</span>}
              </span>
              {!collapsed && (
                <span className="text-xs" aria-hidden>
                  {settingsOpen ? "▾" : "▸"}
                </span>
              )}
            </button>

            {!collapsed && (
              <div
                id="settings-submenu"
                className={`pl-8 pr-2 overflow-hidden transition-[max-height,opacity] duration-200 ${
                  settingsOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <ul className="mt-1 space-y-1">
                  {settingsChildren.map((child) => (
                    <li key={child.to}>
                      <NavLink
                        to={child.to}
                        className={({ isActive }) =>
                          `block rounded-md px-3 py-2 text-sm ${
                            isActive
                              ? "bg-slate-200 text-slate-900" // 👈 lighter active style
                              : "text-slate-700 hover:bg-slate-100"
                          }`
                        }
                        onClick={() => setOpen(false)}
                      >
                        {child.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <div className="px-3 py-2 text-sm text-slate-700">
            {collapsed ? (
              <span className="font-medium">{initial}</span>
            ) : (
              <>
                <span className="font-medium truncate">{display}</span>
                {customerNumber ? (
                  <div className="text-xs text-slate-500 truncate">Customer #{customerNumber}</div>
                ) : (
                  <div className="text-xs text-slate-400">No customer number</div>
                )}
              </>
            )}
          </div>
          <button
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
              } finally {
                setUser(null);
                setCustomerNumber(undefined);
                setLoggingOut(false);
                nav("/", { replace: true });
              }
            }}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            🔒 {!collapsed && (loggingOut ? "Logging out..." : "Logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
