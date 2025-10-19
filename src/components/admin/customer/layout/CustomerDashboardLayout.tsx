import React from "react";
import { Outlet, useParams } from "react-router-dom";
import Topbar from "@/components/admin/customer/layout/Topbar";
import CustomerSidebar from "@/components/admin/customer/layout/CustomerSidebar";

/* Tiny local API helper (Bearer only) */
const API_BASE = `${import.meta.env.VITE_API_BASE}/api`.replace(/\/+$/, "");
const TOKEN_KEY = "toma_token";

async function fetchJson<T>(path: string): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j?.message || msg;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return (await res.json()) as T;
}

type CustomerMeta = {
  id: number;
  customer_number?: string | null;
  business_name?: string | null;
  user?: { name?: string | null } | null;
};

export default function CustomerDashboardLayout() {
  const { customerId } = useParams<{ customerId: string }>();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  // For title
  const [customer, setCustomer] = React.useState<CustomerMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      if (!customerId) return;
      setLoadingMeta(true);
      try {
        // Your backend returns { data: {...} }
        const resp = await fetchJson<any>(`/customers/${customerId}`);
        const c: CustomerMeta = resp?.data ?? resp ?? null;
        if (alive) setCustomer(c);
      } catch {
        // Don't block UI if this fails; title will just be default
      } finally {
        if (alive) setLoadingMeta(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [customerId]);

  if (!customerId) {
    return <div className="p-6">Missing customerId</div>;
  }

  const displayNumber = customer?.customer_number ?? customerId;
  const displayName = customer?.business_name || customer?.user?.name || "";
  const dynamicTitle = `Admin Dashboard — Customer# ${displayNumber}${displayName ? " — " + displayName : ""}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <CustomerSidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        customerId={customerId}
      />

      {/* Main */}
      <div className={collapsed ? "lg:pl-20 flex-1" : "lg:pl-64 flex-1"}>
        <Topbar
          title={dynamicTitle}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="min-h-[calc(100vh-4rem)] px-4 lg:px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
