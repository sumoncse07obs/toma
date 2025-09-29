// src/components/social/index.tsx (routes wrapper)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Connections from './Connections';
import Composer from './Composer';
import Queue from './Queue';
import PostDetail from './PostDetail';


export default function SocialRouter() {
return (
<Routes>
<Route path="/connections" element={<Connections/>} />
<Route path="/composer" element={<Composer/>} />
<Route path="/posts" element={<Queue/>} />
<Route path="/posts/:id" element={<PostDetail/>} />
<Route path="*" element={<Navigate to="/composer" replace />} />
</Routes>
);
}


// Integration snippet for your main router (example):
// <Route path="/customer/social/*" element={<SocialRouter/>} />