// src/components/Payment.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "@/auth";

export default function Payment() {
  const nav = useNavigate();

  async function handleLogout() {
    await logout();
    nav("/", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Activate Your Account</h1>
            <p className="text-slate-600 mt-1">
              Your account is inactive. Complete a payment below to unlock your dashboard.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 md:mt-0 rounded-lg bg-red-600 text-white px-4 py-2 font-medium hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900">Starter</h2>
            <p className="text-sm text-slate-600 mt-1">Great to get moving.</p>
            <p className="text-3xl font-bold mt-4">
              $99<span className="text-base font-medium">/mo</span>
            </p>
            <ul className="mt-4 text-sm text-slate-700 space-y-2">
              <li>✓ Core automations</li>
              <li>✓ 3 social channels</li>
              <li>✓ Basic support</li>
            </ul>
            <a
              href="https://link.fastpaydirect.com/payment-link/69505469d545d816e38f0466"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex justify-center items-center w-full rounded-xl bg-slate-900 text-white py-2.5 font-medium hover:opacity-90"
            >
              Continue to Checkout
            </a>
          </div>

          {/* Pro */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900">Founders club</h2>
            <p className="text-sm text-slate-600 mt-1">For serious scaling.</p>
            <p className="text-3xl font-bold mt-4">
              $199<span className="text-base font-medium">/mo</span>
            </p>
            <ul className="mt-4 text-sm text-slate-700 space-y-2">
              <li>✓ All Growth features</li>
              <li>✓ 9+ social channels</li>
              <li>✓ VIP onboarding</li>
            </ul>
            <a
              href="https://link.fastpaydirect.com/payment-link/69505160df9e92224ef8d11b"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex justify-center items-center w-full rounded-xl bg-emerald-600 text-white py-2.5 font-medium hover:opacity-90"
            >
              Continue to Checkout
            </a>
          </div>

          {/* Growth */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900">Growth</h2>
            <p className="text-sm text-slate-600 mt-1">Most popular for SMBs.</p>
            <p className="text-3xl font-bold mt-4">
              $279<span className="text-base font-medium">/mo</span>
            </p>
            <ul className="mt-4 text-sm text-slate-700 space-y-2">
              <li>✓ All Starter features</li>
              <li>✓ 6 social channels</li>
              <li>✓ Priority support</li>
            </ul>
            <a
              href="https://link.fastpaydirect.com/payment-link/6950561a3b4f6510603a9c7e"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex justify-center items-center w-full rounded-xl bg-blue-600 text-white py-2.5 font-medium hover:opacity-90"
            >
              Continue to Checkout
            </a>
          </div>

          
        </div>

        <div className="mt-10 text-center">
          <p className="text-slate-700">
            Need help? Call{" "}
            <a href="tel:+12693654321" className="font-semibold underline">
              +1 2693654321
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
