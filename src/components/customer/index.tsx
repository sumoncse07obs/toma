// src/components/customer/index.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/customer/layout/DashboardLayout";
import Dashboard from "@/components/customer/Dashboard";
import ListBlogContents from "@/components/customer/blog_pages/ListBlogContents";
import NewBlogContents from "@/components/customer/blog_pages/NewBlogContents";
import BlogPost from "@/components/customer/blog_pages/BlogPost";
import ViewBlogContents from "@/components/customer/blog_pages/ViewBlogContents";
import Settings from "@/components/customer/SettingsPage";

export default function CustomerRouter() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* Default /dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="/home" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/blog/list" element={<ListBlogContents />} />
        <Route path="/blog/view/:id" element={<ViewBlogContents />} />
        <Route path="/blog/new" element={<NewBlogContents />} />
        <Route path="/blog/post/:id" element={<BlogPost />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* future routes: youtube, topic, launch */}
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}
