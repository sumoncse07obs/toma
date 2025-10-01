import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/customer/layout/Sidebar";
import Topbar from "@/components/customer/layout/Topbar";
import {
  currentUser,
  refreshUser,
  type User,
  isCustomer,
} from "@/auth";
import { getCustomerNumber } from "@/components/customer/lib/customer";
import { toast } from "react-toastify";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const [user, setUser] = React.useState<User | null>(() => currentUser());
  const [customerNumber, setCustomerNumber] = React.useState<string | undefined>(undefined);

  const syncAll = React.useCallback(async () => {
    const u = await refreshUser();            // refresh /user once
    setUser(u);
    if (u && u.role === "customer") {
      setCustomerNumber(await getCustomerNumber()); // only for customers
    } else {
      setCustomerNumber(undefined);
    }
  }, []);

  React.useEffect(() => {
    syncAll();
    const onFocus = () => syncAll();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncAll]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        customerNumber={customerNumber}
      />

      {/* Main area */}
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
