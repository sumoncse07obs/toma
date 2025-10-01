// src/components/admin/customer/CustomerDashboardLayout.tsx
import React from "react";
import { Outlet, useParams } from "react-router-dom";
import Topbar from "@/components/admin/layout/Topbar";
import CustomerSidebar from "@/components/admin/customer/CustomerSidebar";

export default function CustomerDashboardLayout() {
  const { customerId } = useParams<{ customerId: string }>();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  // Guard: you can add a redirect or loader if customerId is missing/invalid
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <CustomerSidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        customerId={customerId!}
      />

      {/* Main area */}
      <div className={collapsed ? "lg:pl-20 flex-1" : "lg:pl-64 flex-1"}>
        <Topbar
          title={`Customer ${customerId} Dashboard`}
          onOpenSidebar={() => setSidebarOpen(true)}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
        <main className="min-h-[calc(100vh-4rem)] px-4 lg:px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
