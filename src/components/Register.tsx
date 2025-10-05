// src/pages/Register.tsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";

/* ========= API base =========*/
const API_BASE_URL = `${import.meta.env.VITE_API_BASE}/api`;
const TOKEN_KEY = "toma_token";

function norm(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );
}

// Unauthenticated fetch for /login (fallback if /register doesn't return token)
async function loginRequest(email: string, password: string) {
  const res = await fetch(norm("/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = "Login failed";
    try {
      const j = JSON.parse(text || "{}");
      message = j?.message || message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return res.json(); // expect { token, user } or similar
}

export default function Register() {
  const nav = useNavigate();

  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    mobile_phone: "",
    business_name: "",
    business_website: "",
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fullName = `${(form.first_name || "").trim()} ${(form.last_name || "").trim()}`.trim();

    try {
      // 1) Public registration call (no Authorization header)
      const res = await fetch(norm("/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: fullName, // First Name + Last Name
          email: (form.email || "").trim(),
          password: form.password, // required now
          business_name: form.business_name || null,
          business_website: form.business_website || null,
          phone: form.mobile_phone || null, // keeping backend "phone" field name
          // is_active defaults to 0 on backend register() if that's your logic
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const j = JSON.parse(text || "{}");
          message = j?.message || message;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }

      const data = await res.json().catch(() => ({} as any));

      // 2) Prefer token from /register if present
      let token: string | undefined =
        data?.token ||
        data?.data?.token ||
        data?.access_token ||
        data?.data?.access_token;

      // 3) If no token returned, fall back to calling /login with provided password
      if (!token) {
        const loginResp = await loginRequest(form.email, form.password);
        token =
          loginResp?.token ||
          loginResp?.data?.token ||
          loginResp?.access_token ||
          loginResp?.data?.access_token;

        if (!token) {
          throw new Error("Login returned no token.");
        }
        if (loginResp?.user) {
          localStorage.setItem("toma_user", JSON.stringify(loginResp.user));
        }
      } else {
        // If /register also returned 'user', store it
        if (data?.user) {
          localStorage.setItem("toma_user", JSON.stringify(data.user));
        }
      }

      // 4) Save token and go to dashboard
      localStorage.setItem(TOKEN_KEY, token);
      nav("/user/home", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image (optional, matches your login style) */}
      <div className="absolute inset-0 bg-[url('/social-automation-bg2.jpg')]" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/65 via-slate-900/20 to-sky-700/35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_20%_40%,transparent,rgba(2,6,23,0.85))]" />

      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-white/95 backdrop-blur-sm text-slate-900 rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold">Add New Customer</h1>
            <button
              onClick={() => nav(-1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Row 1: First/Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            {/* Row 2: Email / Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Choose a strong password"
                  required
                />
              </div>
            </div>

            {/* Row 3: Mobile / Business Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Phone</label>
                <input
                  name="mobile_phone"
                  value={form.mobile_phone}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Business Name</label>
                <input
                  name="business_name"
                  value={form.business_name}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Company LLC"
                />
              </div>
            </div>

            {/* Row 4: Business Website */}
            <div>
              <label className="block text-sm font-medium mb-1">Business Website</label>
              <input
                name="business_website"
                value={form.business_website}
                onChange={onChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="https://example.com"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => nav(-1)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-indigo-600 text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Creating…" : "Submit"}
              </button>
            </div>

            {/* Login link */}
            <p className="text-sm text-center text-slate-600">
              Already have an account?{" "}
              <Link to="/" className="text-sky-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
