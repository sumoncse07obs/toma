// src/auth.ts
export const TOKEN_KEY = "toma_token";
export const USER_KEY  = "toma_user";

const API_BASE_URL = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE}/api`
  : "/api";

export type User = { 
  id: number;
  name: string;
  email: string;
  role: "admin" | "customer" | "user";
  is_active?: boolean | number | null;
  customer_id?: number | null;
};

export type LoginResponse = { user: User; token: string; message?: string };

/* ================= TOKEN REPAIR & VALIDATION ================= */
function repairAndPersistToken(raw: string | null): string | null {
  if (!raw) return null;
  let t = raw;

  // Known corruption: '100}abcdef...' should be '100|abcdef...'
  if (!t.includes("|") && t.includes("}")) t = t.replace("}", "|");

  // If still no pipe, treat as invalid
  if (!t.includes("|")) return null;

  if (t !== raw) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch {}
  }
  return t;
}

function getValidToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  return repairAndPersistToken(raw);
}

function hardLogoutAndBounce() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
  // hard redirect so app never keeps rendering an unauth state
  if (typeof window !== "undefined") window.location.replace("/login");
}

/* ===================== API HELPER ===================== */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getValidToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  // If auth fails anywhere, force logout + redirect immediately
  if (res.status === 401) {
    hardLogoutAndBounce();
    throw new Error("Unauthenticated");
  }

  if (!res.ok) {
    let message = "Network error";
    try { const data = await res.json(); message = data?.message || message; }
    catch { try { message = await res.text(); } catch {} }
    throw new Error(message || `HTTP ${res.status}`);
  }

  return res.json();
}

/* ===================== AUTH FLOWS ===================== */
export async function login(email: string, password: string): Promise<User> {
  const response = (await apiCall("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })) as LoginResponse;

  const fixed = repairAndPersistToken(response.token);
  if (!fixed) {
    // token malformed → fail fast
    throw new Error("Invalid auth token received");
  }

  localStorage.setItem(TOKEN_KEY, fixed);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  return response.user;
}

export async function logout(): Promise<void> {
  // Clear first so UI updates immediately
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
  try { await fetch(`${API_BASE_URL}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  }); } catch {}
}

export function isAuthed(): boolean {
  const t = getValidToken();
  return !!t && t.includes("|"); // require Sanctum format
}

export function currentUser(): User | null {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? (JSON.parse(s) as User) : null;
  } catch { return null; }
}

export function isAdmin(): boolean    { return currentUser()?.role === "admin"; }
export function isCustomer(): boolean { return currentUser()?.role === "customer"; }
export function isRegularUser(): boolean { return currentUser()?.role === "user"; }

export function getDashboardRoute(): string {
  const user = currentUser();
  if (!user) return "/";
  if (user.role === "admin") return "/admin";
  if (user.role === "customer") return "/customer";
  return "/dashboard";
}

/** Always refresh /user with hard redirect on failure */
export async function refreshUser(): Promise<User | null> {
  try {
    const response = await apiCall("/user");
    const user: User = (response as any)?.user || (response as any);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    hardLogoutAndBounce();
    return null;
  }
}
