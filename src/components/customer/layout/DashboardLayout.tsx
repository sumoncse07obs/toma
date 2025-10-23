// src/components/customer/layout/DashboardLayout.tsx
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "@/components/customer/layout/Sidebar";
import Topbar from "@/components/customer/layout/Topbar";
import { currentUser, refreshUser, type User } from "@/auth";
import { getCustomerNumber } from "@/components/customer/lib/customer";

export default function DashboardLayout() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const [user, setUser] = React.useState<User | null>(() => currentUser());
  const [customerNumber, setCustomerNumber] = React.useState<string | undefined>();
  const [booting, setBooting] = React.useState(true); // ⬅️ blocks UI while checking auth

  const syncAll = React.useCallback(async () => {
    const u = await refreshUser(); // returns null on 401 and clears storage
    if (!u) {
      navigate("/login", { replace: true });
      return;
    }
    setUser(u);

    if (u.role === "customer") {
      try {
        const num = await getCustomerNumber(); // calls /customers/me (only when authed)
        setCustomerNumber(num);
      } catch {
        setCustomerNumber(undefined);
      }
    } else {
      setCustomerNumber(undefined);
    }
  }, [navigate]);

  React.useEffect(() => {
    (async () => {
      await syncAll();
      setBooting(false);
    })();

    const onFocus = () => { void syncAll(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncAll]);

  // While verifying (or after deciding to redirect), render nothing
  if (booting || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        customerNumber={customerNumber}
      />
      <div className={collapsed ? "lg:pl-20 flex-1" : "lg:pl-64 flex-1"}>
        <Topbar
          user={user}
          customerNumber={customerNumber}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          setSidebarOpen={setSidebarOpen}
          supportHref="/support"
        />
        <main className="min-h-[calc(100vh-4rem)] px-4 lg:px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
