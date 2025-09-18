// src/components/admin/index.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/admin/layout/DashboardLayout";
import DashboardHome from "@/components/admin/DashboardHome";
import CustomersPage from "./CustomersPage";
import PromptBlogSettings from "./PromptBlogSettings";
import ContentGeneratorPage from "./ContentGeneratorPage";
import UsersPage from "@/components/admin/UsersPage";

export default function AdminRouter() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* /admin */}
        <Route index element={<DashboardHome />} />
        {/* /admin/customers  👉 use RELATIVE path */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="blog-prompt-setup" element={<PromptBlogSettings />} />
        <Route path="blog-content-generator" element={<ContentGeneratorPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* fallback for anything under /admin/* that didn't match */}
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
