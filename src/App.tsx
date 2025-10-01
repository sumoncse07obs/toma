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
  apiCall, // ⬅️ use the shared API helper
} from "@/auth";

// Use the same base + token + error handling as the rest of the app
async function fetchCustomerActive(): Promise<boolean> {
  const res = await apiCall("/customers/me");
  // Accept common shapes from Laravel controllers/resources:
  //  a) { data: { is_active: 1 } }
  //  b) { data: { customer: { is_active: 1 } } }
  //  c) { is_active: 1 }
  //  d) { data: { active: true } }
  const root = (res?.data ?? res) ?? {};
  const customer = root?.customer ?? root;
  const raw =
    customer?.is_active ??
    customer?.active ??
    (typeof customer?.status === "string"
      ? customer.status.toLowerCase() === "active"
        ? 1
        : 0
      : null);

  return raw === true || raw === 1 || raw === "1";
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
 * CustomerRoute:
 *  - Verifies token + role
 *  - Calls /customers/me via apiCall()
 *  - Only redirects to /payment when we are SURE the account is inactive
 *  - Shows a clear error UI on transient server/network errors (no false "inactive")
 */
function CustomerRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/" replace />;
  if (!isCustomer()) return <Navigate to={getDashboardRoute()} replace />;

  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ok = await fetchCustomerActive();
        if (!mounted) return;
        setActive(ok);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Could not verify account status.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Checking account status…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
          <p className="text-slate-900 font-semibold">We couldn’t verify your account status.</p>
          <p className="text-slate-600 mt-1 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-slate-900 text-white px-4 py-2 font-medium"
          >
            Try again
          </button>
        </div>
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

        {/* Payment: reachable by inactive customers */}
        <Route path="/payment" element={<Payment />} />

        {/* Regular user area */}
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
