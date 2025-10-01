// src/components/admin/customer/CustomerSidebar.tsx
import React from "react";
import { NavLink, useNavigate, useLocation,Link } from "react-router-dom";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  customerId: string;
};

export default function CustomerSidebar({
  open,
  setOpen,
  collapsed,
  setCollapsed,
  customerId,
}: Props) {
  const items = [
    { to: `/admin/customer-dashboard/${customerId}/api`,    label: "API",     icon: "🔑" },
    { to: `/admin/customer-dashboard/${customerId}/blog`,   label: "Blog",    icon: "📝" },
    { to: `/admin/customer-dashboard/${customerId}/youtube`,label: "YouTube", icon: "📺" },
    { to: `/admin/customer-dashboard/${customerId}/topic`,  label: "Topic",   icon: "🏷️" },
    { to: `/admin/customer-dashboard/${customerId}/launch`, label: "Launch",  icon: "🚀" },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black/30 z-30 lg:hidden ${open ? "block" : "hidden"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed z-40 top-0 left-0 h-full bg-white border-r border-slate-200 transition-all
          ${collapsed ? "w-20" : "w-64"} ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b">
          <Link to="/admin" className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400" />
                    {!collapsed && <span className="font-semibold">TOMA</span>}
                  </Link>
          <button
            className="hidden lg:inline-flex text-slate-600 hover:text-slate-900"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="p-2">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg mb-1
                 ${isActive ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`
              }
              onClick={() => setOpen(false)}
            >
              <span className="text-lg">{it.icon}</span>
              {!collapsed && <span>{it.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
