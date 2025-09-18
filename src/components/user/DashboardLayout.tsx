// src/components/user/DashboardLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/user/layout/Sidebar";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main area */}
      <div className={collapsed ? "lg:pl-20 flex-1" : "lg:pl-64 flex-1"}>
        {/* Top bar */}
        <header className="h-16 px-4 lg:px-6 border-b bg-white flex items-center gap-3">
          <button
            className="lg:hidden rounded-md px-3 py-2 border border-slate-200 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <h1 className="font-semibold">User Dashboard</h1>
        </header>

        {/* Nested pages render here */}
        <main className="min-h-[calc(100vh-4rem)] px-4 lg:px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
