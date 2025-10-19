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

// Customer dashboard layout + pages
import CustomerDashboardLayout from "@/components/admin/customer/layout/CustomerDashboardLayout";
import ApiSettings from "@/components/admin/customer/ApiSettings";

import BlogPromptSettings from "@/components/admin/customer/blog/BlogPromptSettings";
import NewBlog from "@/components/admin/customer/blog/NewBlog";
import ListBlog from "@/components/admin/customer/blog/ListBlog";
import ViewBlog from "@/components/admin/customer/blog/ViewBlog";
import PostBlog from "@/components/admin/customer/PublishPost";
import PostLogs from "@/components/admin/customer/PostLogs";
import PublishedLogs from "@/components/admin/customer/PublishedLogs";



import YouTubePromptSettings from "@/components/admin/customer/YouTubePromptSettings";
import TopicPromptSettings from "@/components/admin/customer/TopicPromptSettings";
import LaunchPromptSettings from "@/components/admin/customer/LaunchPromptSettings";

import AdminSettingsPage from "@/components/admin/AdminSettings";

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
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* === Customer dashboard (sibling route, not nested under DashboardLayout) === */}
      <Route path="customer-dashboard/:customerId/*" element={<CustomerDashboardLayout />}>
        {/* Default to API */}
        <Route index element={<ApiSettings />} />
        <Route path="api" element={<ApiSettings />} />

        {/* BLOG */}
        <Route path="blog" element={<Navigate to="blog/list" replace />} />
        <Route path="blog/new" element={<NewBlog />} />
        <Route path="blog/list" element={<ListBlog />} />
        <Route path="blog/view/:id" element={<ViewBlog />} />
        <Route path="blog/post/:id" element={<PostBlog />} />
        <Route path="blog/log/:id" element={<PostLogs />} />
        <Route path="blog/logs/" element={<PublishedLogs />} />
        <Route path="blog/prompt-settings" element={<BlogPromptSettings />} />

        {/* YOUTUBE */}
        <Route path="youtube" element={<Navigate to="youtube/list" replace />} />
        <Route path="youtube/new" element={<YouTubePromptSettings />} />
        <Route path="youtube/list" element={<YouTubePromptSettings />} />
        <Route path="youtube/prompt-settings" element={<YouTubePromptSettings />} />

        {/* TOPIC */}
        <Route path="topic" element={<Navigate to="topic/list" replace />} />
        <Route path="topic/new" element={<TopicPromptSettings/>} />
        <Route path="topic/list" element={<TopicPromptSettings/>} />
        <Route path="topic/prompt-settings" element={<TopicPromptSettings/>} />

        {/* LAUNCH */}
        <Route path="launch" element={<Navigate to="launch/list" replace />} />
        <Route path="launch/new" element={<LaunchPromptSettings />} />
        <Route path="launch/list" element={<LaunchPromptSettings />} />
        <Route path="launch/prompt-settings" element={<LaunchPromptSettings />} />
      </Route>

      {/* Fallback under /admin/* */}
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
