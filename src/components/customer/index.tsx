// src/components/customer/index.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/customer/layout/DashboardLayout";
import Dashboard from "@/components/customer/Dashboard";

import ListBlogContents from "@/components/customer/blog_pages/ListBlogContents";
import NewBlogContents from "@/components/customer/blog_pages/NewBlogContents";
import ViewBlogContents from "@/components/customer/blog_pages/ViewBlogContents";

import ListYoutubeContents from "@/components/customer/youtube_pages/ListYoutubeContents";
import NewYoutubeContents from "@/components/customer/youtube_pages/NewYoutubeContents";
import ViewYoutubeContents from "@/components/customer/youtube_pages/ViewYoutubeContents";

import ListTopicContents from "@/components/customer/topic_pages/ListTopicContents";
import NewTopicContents from "@/components/customer/topic_pages/NewTopicContents";
import ViewTopicContents from "@/components/customer/topic_pages/ViewTopicContents";

import ListLaunchContents from "@/components/customer/launch_pages/ListLaunchContents";
import NewLaunchContents from "@/components/customer/launch_pages/NewLaunchContents";
import ViewLaunchContents from "@/components/customer/launch_pages/ViewLaunchContents";

import PostLogs from "@/components/customer/PostLogs";
import PublishPost from "@/components/customer/PublishPost";

import PostToBlotato from "@/components/customer/PostToBlotato";
import Portfolio from "@/components/customer/Portfolio";

import SupportHome from "@/components/support/SupportHome";
import NewSupportTicket from "@/components/support/NewSupportTicket";
import ViewSupportTicket from "@/components/support/ViewSupportTicket";

import PublishedLogs from "@/components/customer/PublishedLogs";

export default function CustomerRouter() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* /customer */}
        <Route index element={<Dashboard />} />
        <Route path="home" element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* BLOG: /customer/blog/... */}
        <Route path="blog/list" element={<ListBlogContents />} />
        <Route path="blog/view/:id" element={<ViewBlogContents />} />
        <Route path="blog/new" element={<NewBlogContents />} />
        <Route path="blog/log/:id" element={<PostLogs />} />
        <Route path="blog/post/:id" element={<PublishPost />} />
        <Route path="blog/posttoblotato/:id" element={<PostToBlotato />} />

        {/* YOUTUBE: /customer/youtube/... */}
        <Route path="youtube/list" element={<ListYoutubeContents />} />
        <Route path="youtube/view/:id" element={<ViewYoutubeContents />} />
        <Route path="youtube/new" element={<NewYoutubeContents />} />
        <Route path="youtube/log/:id" element={<PostLogs />} />
        <Route path="youtube/post/:id" element={<PublishPost />} />
        <Route path="youtube/posttoblotato/:id" element={<PostToBlotato />} />

        {/* TOPIC: /customer/topic/... */}
        <Route path="topic/list" element={<ListTopicContents />} />
        <Route path="topic/view/:id" element={<ViewTopicContents />} />
        <Route path="topic/new" element={<NewTopicContents />} />
        <Route path="topic/log/:id" element={<PostLogs />} />
        <Route path="topic/post/:id" element={<PublishPost />} />
        <Route path="topic/posttoblotato/:id" element={<PostToBlotato />} />

        {/* LAUNCH: /customer/launch/... */}
        <Route path="launch/list" element={<ListLaunchContents />} />
        <Route path="launch/view/:id" element={<ViewLaunchContents />} />
        <Route path="launch/new" element={<NewLaunchContents />} />
        <Route path="launch/log/:id" element={<PostLogs />} />
        <Route path="launch/post/:id" element={<PublishPost />} />
        <Route path="launch/posttoblotato/:id" element={<PostToBlotato />} />

        {/* NEW: /customer/logs/all */}
        <Route path="logs/all" element={<PublishedLogs />} />
        <Route path="logs/:context" element={<PublishedLogs />} />

        {/* Profile & Support */}
        <Route path="profile" element={<Portfolio />} />
        <Route path="support" element={<SupportHome />} />
        <Route path="support/new" element={<NewSupportTicket />} />
        <Route path="support/:id" element={<ViewSupportTicket />} />

        {/* Catch-all inside /customer */}
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}
