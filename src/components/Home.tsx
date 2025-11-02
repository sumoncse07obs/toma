// src/components/Home.tsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, getDashboardRoute } from "@/auth";
import Topnav from "@/components/Topnav";

export default function Home() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);            // ✅ real login only
      nav(getDashboardRoute(), { replace: true });
      
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <Topnav />
      {/* Background image (no fixed on mobile to avoid jank) */}
      <div
        className="absolute inset-0 bg-[url('/social-automation-bg2.jpg')] bg-cover bg-center md:bg-fixed"
        aria-hidden
      />

      {/* Overlay: stronger on small for readability */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/40 to-sky-800/40 md:bg-gradient-to-r md:from-slate-900/65 md:via-slate-900/25 md:to-sky-700/35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_20%_40%,transparent,rgba(2,6,23,0.85))]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mobile-first single column, split at md */}
        <div className="grid min-h-[100svh] grid-cols-1 gap-8 py-10 md:grid-cols-2 md:py-16">
          {/* Hero / copy */}
          <section className="order-1 flex flex-col justify-center gap-4 text-white">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs sm:text-sm">
              <strong className="font-semibold"> TOMAA </strong>
              <span className="opacity-80">Social Automation</span>
            </span>

            <h1 className="max-w-2xl text-[clamp(1.8rem,5.5vw,3.5rem)] font-extrabold leading-tight tracking-tight">
              Automate posts. <span className="text-sky-400">Stay top-of-mind.</span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-slate-200">
              Draft once, publish everywhere. Log in to access your dashboard.
            </p>

            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/15"
              >
                Create an account
              </Link>
              <a
                href="tel:+12693654321"
                className="rounded-lg border border-white/25 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Need help? +1 2693654321
              </a>
            </div>
          </section>

          {/* Auth card */}
          <section className="order-2 flex items-start justify-center md:items-center md:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
              <h2 className="mb-1 text-lg font-bold sm:text-xl">Login</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-800">
                    Username / Email
                  </label>
                  <input
                    id="email"
                    type="text"
                    className="w-full rounded-lg border border-slate-300 bg-yellow-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    placeholder="Enter username or email"
                    inputMode="email"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-800">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="w-full rounded-lg border border-slate-300 bg-yellow-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>

                <p className="mt-3 text-center text-xs text-slate-600 sm:text-sm">
                  Don’t have an account?{" "}
                  <Link to="/register" className="font-medium text-sky-600 hover:underline">
                    Register here
                  </Link>
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
