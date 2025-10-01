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

function randomPassword(len = 14) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Register() {
  const nav = useNavigate();

  const [form, setForm] = React.useState({
    user_name: "",
    user_email: "",
    temp_password: "",
    business_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    about: "",
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

    // Use provided password or generate one (so we can fall back to /login if needed)
    const password = (form.temp_password || "").trim() || randomPassword(14);

    try {
      // 1) Public registration call (no Authorization header)
      const res = await fetch(norm("/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.user_name,
          email: form.user_email,
          password: form.temp_password ? password : undefined, // send only if provided
          business_name: form.business_name || null,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          about: form.about || null,
          // is_active defaults to 0 on the backend register() method
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

      // If backend auto-generated the password, it may return raw_password; prefer that for fallback login
      const backendRawPassword: string | undefined = data?.raw_password;

      // 3) If no token returned, fall back to calling /login
      if (!token) {
        const loginResp = await loginRequest(form.user_email, backendRawPassword || password);
        token =
          loginResp?.token ||
          loginResp?.data?.token ||
          loginResp?.access_token ||
          loginResp?.data?.access_token;

        if (!token) {
          throw new Error("Login returned no token.");
        }
        // Optionally store user from /login
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
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">User Name</label>
                <input
                  name="user_name"
                  value={form.user_name}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">User Email</label>
                <input
                  type="email"
                  name="user_email"
                  value={form.user_email}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Temp Password <span className="opacity-60">(optional)</span>
                </label>
                <input
                  type="text"
                  name="temp_password"
                  value={form.temp_password}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Leave blank to auto-generate"
                />
                <p className="text-xs text-slate-500 mt-1">
                  If blank, a secure password will be generated for login.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="123 Main St"
                />
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  name="state"
                  value={form.state}
                  onChange={onChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="State"
                />
              </div>
              <div className="hidden md:block" />
            </div>

            {/* About */}
            <div>
              <label className="block text-sm font-medium mb-1">About</label>
              <textarea
                name="about"
                value={form.about}
                onChange={onChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400 resize-y"
                placeholder="Tell us a bit about the business…"
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
