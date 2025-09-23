// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";  // 👈 styles

import Home from "@/components/Home";
import UserRouter from "@/components/user";
import AdminRouter from "@/components/admin";
import CustomerRouter from "@/components/customer";
import {
  isAuthed,
  isAdmin,
  isCustomer,
  isRegularUser,
  getDashboardRoute
} from "@/components/auth";

// Protects routes that require authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthed() ? <>{children}</> : <Navigate to="/" replace />;
}

// Only allows admin users
function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) {
    return <Navigate to="/" replace />;
  }
  if (!isAdmin()) {
    return <Navigate to={getDashboardRoute()} replace />;
  }
  return <>{children}</>;
}

// Only allows customer users
function CustomerRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) {
    return <Navigate to="/" replace />;
  }
  if (!isCustomer()) {
    return <Navigate to={getDashboardRoute()} replace />;
  }
  return <>{children}</>;
}

// Only allows regular users
function UserRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) {
    return <Navigate to="/" replace />;
  }
  if (!isRegularUser()) {
    return <Navigate to={getDashboardRoute()} replace />;
  }
  return <>{children}</>;
}

// Public pages only (redirects authed users to their appropriate dashboard)
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  return isAuthed() ? <Navigate to={getDashboardRoute()} replace /> : <>{children}</>;
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

        {/* User area */}
        <Route
          path="/dashboard/*"
          element={
            <UserRoute>
              <UserRouter />
            </UserRoute>
          }
        />

        {/* Customer area */}
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
        <Route
          path="*"
          element={<Navigate to={getDashboardRoute()} replace />}
        />
      </Routes>

      {/* 👇 Add this once, outside of <Routes> */}
      <ToastContainer position="bottom-center" autoClose={5000} />
    </BrowserRouter>
  );
}