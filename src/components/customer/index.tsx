// src/components/customer/index.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/customer/layout/DashboardLayout";
import Dashboard from "@/components/customer/Dashboard";
import ListBlogContents from "@/components/customer/blog_pages/ListBlogContents";
import NewBlogContents from "@/components/customer/blog_pages/NewBlogContents";
import BlogPost from "@/components/customer/blog_pages/BlogPost";
import ViewBlogContents from "@/components/customer/blog_pages/ViewBlogContents";

import ListYoutubeContents from "@/components/customer/youtube_pages/ListYoutubeContents";
import NewYoutubeContents from "@/components/customer/youtube_pages/NewYoutubeContents";
import YoutubePost from "@/components/customer/youtube_pages/YoutubePost";
import ViewYoutubeContents from "@/components/customer/youtube_pages/ViewYoutubeContents";

import ListTopicContents from "@/components/customer/topic_pages/ListTopicContents";
import NewTopicContents from "@/components/customer/topic_pages/NewTopicContents";
import TopicPost from "@/components/customer/topic_pages/TopicPost";
import ViewTopicContents from "@/components/customer/topic_pages/ViewTopicContents";

import ListLaunchContents from "@/components/customer/launch_pages/ListLaunchContents";
import NewLaunchContents from "@/components/customer/launch_pages/NewLaunchContents";
import LaunchPost from "@/components/customer/launch_pages/LaunchPost";
import ViewLaunchContents from "@/components/customer/launch_pages/ViewLaunchContents";


import Settings from "@/components/customer/SettingsPage";
import PostToBlotato from "@/components/customer/PostToBlotato";
import BlogPromptSettings from "@/components/customer/BlogPromptSettings";
import YoutubePromptSettings from "@/components/customer/YoutubePromptSettings";
import TopicPromptSettings from "@/components/customer/TopicPromptSettings";
import LaunchPromptSettings from "@/components/customer/LaunchPromptSettings";


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
        <Route path="/blog/posttoblotato/:id" element={<PostToBlotato />} />

        <Route path="/youtube/list" element={<ListYoutubeContents />} />
        <Route path="/youtube/view/:id" element={<ViewYoutubeContents />} />
        <Route path="/youtube/new" element={<NewYoutubeContents />} />
        <Route path="/youtube/post/:id" element={<YoutubePost />} />
        <Route path="/youtube/posttoblotato/:id" element={<PostToBlotato />} />

        <Route path="/topic/list" element={<ListTopicContents />} />
        <Route path="/topic/view/:id" element={<ViewTopicContents />} />
        <Route path="/topic/new" element={<NewTopicContents />} />
        <Route path="/topic/post/:id" element={<TopicPost />} />
        <Route path="/topic/posttoblotato/:id" element={<PostToBlotato />} />

        <Route path="/launch/list" element={<ListLaunchContents />} />
        <Route path="/launch/view/:id" element={<ViewLaunchContents />} />
        <Route path="/launch/new" element={<NewLaunchContents />} />
        <Route path="/launch/post/:id" element={<LaunchPost />} />
        <Route path="/launch/posttoblotato/:id" element={<PostToBlotato />} />

        <Route path="/settings/api" element={<Settings />} />
        <Route path="/settings/blog-prompt/" element={<BlogPromptSettings />} />
        <Route path="/settings/youtube-prompt/" element={<YoutubePromptSettings />} />
        <Route path="/settings/topic-prompt/" element={<TopicPromptSettings />} />
        <Route path="/settings/launch-prompt/" element={<LaunchPromptSettings />} />

        
        {/* future routes: youtube, topic, launch */}
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}
