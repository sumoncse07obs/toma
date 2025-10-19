import React, { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  customerId: string;
};

type Section = "blog" | "youtube" | "topic" | "launch" | null;

export default function CustomerSidebar({
  open,
  setOpen,
  collapsed,
  setCollapsed,
  customerId,
}: Props) {
  const location = useLocation();

  // route checks
  const inBlog   = useMemo(() => location.pathname.startsWith(`/admin/customer-dashboard/${customerId}/blog`),   [location.pathname, customerId]);
  const inYT     = useMemo(() => location.pathname.startsWith(`/admin/customer-dashboard/${customerId}/youtube`),[location.pathname, customerId]);
  const inTopic  = useMemo(() => location.pathname.startsWith(`/admin/customer-dashboard/${customerId}/topic`),  [location.pathname, customerId]);
  const inLaunch = useMemo(() => location.pathname.startsWith(`/admin/customer-dashboard/${customerId}/launch`), [location.pathname, customerId]);

  // single source of truth for which dropdown is open
  const [openSection, setOpenSection] = useState<Section>(null);

  // auto-open the matching section when navigating
  useEffect(() => {
    if (inBlog)   return setOpenSection("blog");
    if (inYT)     return setOpenSection("youtube");
    if (inTopic)  return setOpenSection("topic");
    if (inLaunch) return setOpenSection("launch");
    setOpenSection(null); // on API or anything else
  }, [inBlog, inYT, inTopic, inLaunch]);

  const mainActive = "bg-slate-900 text-white";
  const mainIdle   = "hover:bg-slate-100";
  const subActive  = "bg-indigo-600 text-white";
  const subIdle    = "hover:bg-indigo-50 text-slate-700";

  const handleMainClick = (section: Exclude<Section, null>) => {
    if (collapsed) setCollapsed(false);
    setOpenSection((cur) => (cur === section ? null : section)); // accordion toggle
  };

  return (
    <>
      {/* overlay (mobile) */}
      <div
        className={`fixed inset-0 bg-black/30 z-30 lg:hidden ${open ? "block" : "hidden"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        id="admin-sidebar" // ✅ matches Topbar aria-controls
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
          {/* API (single link) — also collapse all submenus on click */}
          <NavLink
            to={`/admin/customer-dashboard/${customerId}/api`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${isActive ? mainActive : mainIdle}`
            }
            onClick={() => {
              setOpenSection(null);
              setOpen(false); // close mobile drawer
            }}
          >
            <span className="text-lg">🔑</span>
            {!collapsed && <span>API</span>}
          </NavLink>

          {/* Dropdown sections */}
          {[
            { key: "blog" as const,     label: "Blog",    icon: "📝" },
            { key: "youtube" as const,  label: "YouTube", icon: "📺" },
            { key: "topic" as const,    label: "Topic",   icon: "🏷️" },
            { key: "launch" as const,   label: "Launch",  icon: "🚀" },
          ].map(({ key, label, icon }) => {
            const active =
              (key === "blog"   && inBlog) ||
              (key === "youtube"&& inYT) ||
              (key === "topic"  && inTopic) ||
              (key === "launch" && inLaunch);

            const expanded = openSection === key;

            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => handleMainClick(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${active ? mainActive : mainIdle}`}
                >
                  <span className="text-lg">{icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{label}</span>
                      <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
                    </>
                  )}
                </button>

                {!collapsed && expanded && (
                  <div className="ml-8 mb-2">
                    <NavLink
                      to={`/admin/customer-dashboard/${customerId}/${key}/new`}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-md mb-1 ${isActive ? subActive : subIdle}`
                      }
                      onClick={() => setOpen(false)}
                    >
                      New
                    </NavLink>
                    <NavLink
                      to={`/admin/customer-dashboard/${customerId}/${key}/list`}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-md mb-1 ${isActive ? subActive : subIdle}`
                      }
                      onClick={() => setOpen(false)}
                    >
                      List
                    </NavLink>
                    <NavLink
                      to={`/admin/customer-dashboard/${customerId}/${key}/prompt-settings`}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-md ${isActive ? subActive : subIdle}`
                      }
                      onClick={() => setOpen(false)}
                    >
                      Prompt Settings
                    </NavLink>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
