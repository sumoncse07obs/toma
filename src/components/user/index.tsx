// src/components/user/index.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/user/DashboardLayout";
import DashboardHome from "@/components/user/DashboardHome";
import Blog from "@/components/user/Blog";
import BlogPost from "@/components/user/BlogPost";


export default function UserRouter() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* Default /dashboard */}
        <Route index element={<DashboardHome />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/post" element={<BlogPost />} />
        
        {/* future routes: youtube, topic, launch */}
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}
