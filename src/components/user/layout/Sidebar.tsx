import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { logout, currentUser } from "@/components/auth";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
};

type User = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
};

const navItems = [
  { to: "/dashboard/blog",   label: "Blog Automation",   icon: "📝" },
  { to: "/dashboard/youtube",label: "YouTube Automation",icon: "▶️" },
  { to: "/dashboard/topic",  label: "Topic Automation",  icon: "📚" },
  { to: "/dashboard/launch", label: "Launch Automation", icon: "🚀" },
];

export default function Sidebar({ open, setOpen, collapsed, setCollapsed }: Props) {
  const nav = useNavigate();
  const location = useLocation();

  // keep a reactive copy so UI updates after login/logout
  const [user, setUser] = React.useState<User | null>(() => currentUser());

  React.useEffect(() => {
    const onFocus = () => setUser(currentUser());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  React.useEffect(() => {
    setUser(currentUser());
  }, [location.pathname]);

  const display = user?.name || user?.email || "Guest";
  const initial = display?.[0]?.toUpperCase() || "?";

  return (
    <>
      {/* mobile overlay */}
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
        {/* Brand + collapse toggle */}
        <div className="h-16 flex items-center px-4 border-b justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400" />
            {!collapsed && <span className="font-semibold">TOMA</span>}
          </div>
          <button
            className="hidden lg:inline-flex rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "➡️" : "⬅️"}
          </button>
          <button
            className="lg:hidden rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(false)}
          >
            ✖
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`
              }
              onClick={() => setOpen(false)}
            >
              <span className="text-base">{it.icon}</span>
              {!collapsed && <span>{it.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer with user + logout */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700">
            {collapsed ? (
              <span className="font-medium">{initial}</span>
            ) : (
              <span className="font-medium truncate">{display}</span>
            )}
          </div>
          <button
            onClick={async () => {
              await logout();
              setUser(null);
              nav("/", { replace: true });
            }}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
          >
            🔒 {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
