import React from "react";
import { useNavigate } from "react-router-dom";
import { login, logout, currentUser, USER_KEY, TOKEN_KEY } from "@/auth";

export default function Home() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState(import.meta.env.VITE_DEMO_USERNAME || "sumoncse07");
  const [password, setPassword] = React.useState(import.meta.env.VITE_DEMO_PASSWORD || "obs@1234#");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Get demo credentials from environment variables
  const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME || "sumoncse07";
  const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "obs@1234#";
  const DEMO_ROLE = import.meta.env.VITE_DEMO_ROLE || "admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check for manual/demo login first
      if (email === DEMO_USERNAME && password === DEMO_PASSWORD) {
        // Manual login for demo user
        const demoUser = {
          id: 999,
          name: "Sumon Ahmed",
          email: `${DEMO_USERNAME}@demo.com`,
          role: DEMO_ROLE
        };
        
        // Store demo user data
        localStorage.setItem("toma_token", "DEMO_ADMIN_TOKEN");
        localStorage.setItem("toma_user", JSON.stringify(demoUser));
        
        // Navigate based on demo role
        const route = DEMO_ROLE === "admin" ? "/admin" : 
                     DEMO_ROLE === "customer" ? "/customer" : "/dashboard";
        nav(route, { replace: true });
        return;
      }
      
      // Otherwise, try API login
      const user = await login(email, password);
      
      // Navigate based on user role
      switch (user.role) {
        case "admin":
          nav("/admin", { replace: true });
          break;
        case "customer":
          nav("/customer", { replace: true });
          break;
        case "user":
        default:
          nav("/dashboard", { replace: true });
          break;
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 bg-[url('/social-automation-bg2.jpg')]" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/65 via-slate-900/20 to-sky-700/35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_20%_40%,transparent,rgba(2,6,23,0.85))]" />

      {/* Content */}
      <div className="relative min-h-screen max-w-6xl mx-auto grid md:grid-cols-2 gap-8 px-6 md:px-10">
        {/* Left: hero */}
        <section className="py-12 flex flex-col justify-center gap-4 text-white">
          <span className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm">
            <strong>TOMA</strong> <span className="opacity-80">Social Automation</span>
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight max-w-xl">
            Automate posts. <span className="text-blue-600">Stay top-of-mind.</span>
          </h1>
          <p className="text-slate-200 max-w-lg">
            Draft once, publish everywhere. Log in to access your dashboard.
          </p>
        </section>

        {/* Right: login */}
        <section className="py-12 flex items-center md:justify-end">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-sm text-slate-900 rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-1">Login</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username/Email</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400 bg-yellow-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="Enter username or email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400 bg-yellow-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter password"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}