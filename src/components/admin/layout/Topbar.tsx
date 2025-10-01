// src/components/admin/layout/Topbar.tsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, currentUser, logout } from "@/auth";

type Props = {
  user?: User | null;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  supportHref?: string;
};

export default function Topbar({
  user: propUser,
  collapsed,
  setCollapsed,
  setSidebarOpen,
  supportHref = "/admin/support",
}: Props) {
  const nav = useNavigate();
  const [user, setUser] = React.useState<User | null>(propUser ?? currentUser());
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const display = user?.name || user?.email || "Admin";
  const email = user?.email ?? "";
  const initial = display?.[0]?.toUpperCase() || "?";

  return (
    <header className="h-16 px-4 lg:px-6 border-b bg-white flex items-center justify-between">
      <h1 className="font-semibold text-slate-900">Admin Dashboard</h1>

      <div className="flex items-center gap-3">
        {/* Help link */}
        <Link
          to={supportHref}
          onClick={() => setMenuOpen(false)}
          className="rounded-md px-3 py-2 hover:bg-slate-100 text-slate-700 text-sm"
          aria-label="Support"
          title="Support"
        >
          ❓ Help
        </Link>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 rounded-full border border-slate-200 hover:bg-slate-50 pl-2 pr-3 py-1.5"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="h-8 w-8 rounded-full bg-slate-900 text-white grid place-items-center text-sm">
              {initial}
            </span>
            <span className="hidden sm:inline-block text-sm text-slate-800 max-w-[14rem] truncate">
              {display}
            </span>
            <span className="text-xs text-slate-500 hidden md:inline">▾</span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b">
                <div className="text-sm font-medium text-slate-900 truncate">{display}</div>
                {email && (
                  <div className="text-xs text-slate-500 truncate" title={email}>
                    {email}
                  </div>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    nav("/admin/profile");
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 text-slate-700"
                  role="menuitem"
                >
                  Profile &amp; Settings
                </button>
              </div>

              <div className="border-t py-1">
                <button
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    try {
                      await logout();
                    } finally {
                      setLoggingOut(false);
                      setMenuOpen(false);
                      nav("/", { replace: true });
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 disabled:opacity-60"
                  role="menuitem"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
