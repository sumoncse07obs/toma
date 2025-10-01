// src/components/admin/index.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/admin/layout/DashboardLayout";
import DashboardHome from "@/components/admin/DashboardHome";
import CustomersPage from "./CustomersPage";
import PromptBlogSettings from "./PromptBlogSettings";
import ContentGeneratorPage from "./ContentGeneratorPage";
import UsersPage from "@/components/admin/UsersPage";
import AdminSupportList from "@/components/admin/support/AdminSupportList";
import AdminSupportTicket from "@/components/admin/support/AdminSupportTicket";
import Portfolio from "@/components/admin/Portfolio";

// NEW: customer dashboard layout + pages
import CustomerDashboardLayout from "@/components/admin/customer/CustomerDashboardLayout";
import AdminCustomerApi from "@/components/admin/customer/AdminCustomerApi";
import AdminCustomerBlog from "@/components/admin/customer/AdminCustomerBlog";
import AdminCustomerYouTube from "@/components/admin/customer/AdminCustomerYouTube";
import AdminCustomerTopic from "@/components/admin/customer/AdminCustomerTopic";
import AdminCustomerLaunch from "@/components/admin/customer/AdminCustomerLaunch";

export default function AdminRouter() {
  return (
    <Routes>
      {/* === Main /admin area uses DashboardLayout === */}
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="blog-prompt-setup" element={<PromptBlogSettings />} />
        <Route path="blog-content-generator" element={<ContentGeneratorPage />} />
        <Route path="support" element={<AdminSupportList />} />
        <Route path="support/:id" element={<AdminSupportTicket />} />
        <Route path="profile" element={<Portfolio />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* === Customer dashboard is a SIBLING route (NOT nested) ===
          Note the /* so nested children (api/blog/etc) work. */}
      <Route path="customer-dashboard/:customerId/*" element={<CustomerDashboardLayout />}>
        <Route index element={<AdminCustomerApi />} />
        <Route path="api" element={<AdminCustomerApi />} />
        <Route path="blog" element={<AdminCustomerBlog />} />
        <Route path="youtube" element={<AdminCustomerYouTube />} />
        <Route path="topic" element={<AdminCustomerTopic />} />
        <Route path="launch" element={<AdminCustomerLaunch />} />
      </Route>

      {/* Fallback under /admin/* */}
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}