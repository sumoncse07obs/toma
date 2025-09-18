// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "@/components/Home";
import UserRouter from "@/components/user";       // /dashboard/*
import AdminRouter from "@/components/admin";     // /admin/*
import CustomerRouter from "@/components/customer"; // /customer/*
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

        {/* User area - only for regular users */}
        <Route
          path="/dashboard/*"
          element={
            <UserRoute>
              <UserRouter />
            </UserRoute>
          }
        />

        {/* Customer area - only for customers */}
        <Route
          path="/customer/*"
          element={
            <CustomerRoute>
              <CustomerRouter />
            </CustomerRoute>
          }
        />

        {/* Admin area - only for admins */}
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminRouter />
            </AdminRoute>
          }
        />

        {/* Catch-all: send users to their appropriate dashboard or home */}
        <Route
          path="*"
          element={<Navigate to={getDashboardRoute()} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}