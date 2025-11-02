// src/components/customer/DashboardHome.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {

  const businessName = localStorage.getItem("business_name");

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col justify-between h-full">
      {/* HERO */}
      <section className="text-center mt-6">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Welcome To Tomaa
        </h2>
        <p className="text-xl md:text-2xl font-bold text-slate-700 mt-1">
          Top Of Mind Automation
        </p>
        {businessName && (
          <p className="text-lg text-slate-700 mt-2">
            Company: <span className="font-semibold">{businessName}</span>
          </p>
        )}
      </section>

      {/* ACTION BUTTONS */}
      <section className="mt-16 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/customer/blog/new"
            className="rounded-xl bg-sky-600 text-white px-4 py-5 text-center font-semibold shadow hover:opacity-90"
          >
            <div>Blog</div>
            <div className="text-sm opacity-90 -mt-0.5">Automation</div>
          </Link>

          <Link
            to="/customer/youtube/new"
            className="rounded-xl bg-sky-600 text-white px-4 py-5 text-center font-semibold shadow hover:opacity-90"
          >
            <div>Youtube</div>
            <div className="text-sm opacity-90 -mt-0.5">Automation</div>
          </Link>

          <Link
            to="/customer/topic/new"
            className="rounded-xl bg-sky-600 text-white px-4 py-5 text-center font-semibold shadow hover:opacity-90"
          >
            <div>Topic</div>
            <div className="text-sm opacity-90 -mt-0.5">Automation</div>
          </Link>

          <Link
            to="/customer/launch/new"
            className="rounded-xl bg-sky-600 text-white px-4 py-5 text-center font-semibold shadow hover:opacity-90"
          >
            <div>Launch</div>
            <div className="text-sm opacity-90 -mt-0.5">Automation</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
