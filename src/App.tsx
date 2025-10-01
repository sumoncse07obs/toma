// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Home from "@/components/Home";
import UserRouter from "@/components/user";
import AdminRouter from "@/components/admin";
import CustomerRouter from "@/components/customer";
import Register from "@/components/Register";
import Payment from "@/components/Payment";

import {
  isAuthed,
  isAdmin,
  isCustomer,
  isRegularUser,
  getDashboardRoute,
  TOKEN_KEY,
} from "@/auth";

// Utility to fetch is_active directly here (authoritative every time)
async function fetchCustomerActive(): Promise<boolean> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch("/api/customers/me", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return false; // treat errors as inactive lockout
    const data = await res.json();
    const obj = data?.data ?? data ?? {};
    const raw = obj?.is_active ?? obj?.active ?? null;
    return raw === true || raw === 1 || raw === "1";
  } catch {
    return false; // safe default
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthed() ? <>{children}</> : <Navigate to="/" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/" replace />;
  if (!isAdmin()) return <Navigate to={getDashboardRoute()} replace />;
  return <>{children}</>;
}

function UserRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/" replace />;
  if (!isRegularUser()) return <Navigate to={getDashboardRoute()} replace />;
  return <>{children}</>;
}

/** 
 * CustomerRoute: hard-enforces is_active on every entry.
 * If inactive => redirect to /payment (no access to /customer/*).
 */
function CustomerRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/" replace />;
  if (!isCustomer()) return <Navigate to={getDashboardRoute()} replace />;

  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await fetchCustomerActive();
      if (!mounted) return;
      setActive(ok);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Checking account status…
      </div>
    );
  }

  if (active === false) {
    return <Navigate to="/payment" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <>{children}</>;
  return <Navigate to={getDashboardRoute()} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing */}
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <Home />
            </PublicOnlyRoute>
          }
        />

        {/* Public Register */}
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />

        {/* Payment: must be directly reachable by inactive customers */}
        <Route path="/payment" element={<Payment />} />

        {/* User area */}
        <Route
          path="/dashboard/*"
          element={
            <UserRoute>
              <UserRouter />
            </UserRoute>
          }
        />

        {/* Customer area (strict active check) */}
        <Route
          path="/customer/*"
          element={
            <CustomerRoute>
              <CustomerRouter />
            </CustomerRoute>
          }
        />

        {/* Admin area */}
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminRouter />
            </AdminRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={getDashboardRoute()} replace />} />
      </Routes>

      <ToastContainer position="bottom-center" autoClose={5000} />
    </BrowserRouter>
  );
}
