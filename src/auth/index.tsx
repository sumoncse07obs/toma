// src/auth.ts
export const TOKEN_KEY = "toma_token";
export const USER_KEY  = "toma_user";

// If you're using the Vite proxy for /api, set base to "/api".
// Otherwise, set VITE_API_BASE=http://127.0.0.1:8000 in .env and use `${...}/api`.
const API_BASE_URL = import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api` : "/api";

export type User = { 
  id: number;
  name: string;
  email: string;
  role: "admin" | "customer" | "user";
  is_active?: boolean | number | null; // sometimes included by backend
  customer_id?: number | null;
};

export type LoginResponse = {
  user: User;
  token: string;
  message?: string;
};

// ---------- API helper ----------
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem(TOKEN_KEY);

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  };

  const res = await fetch(url, config);
  if (!res.ok) {
    let message = "Network error";
    try {
      const data = await res.json();
      message = data?.message || message;
    } catch {
      try { message = await res.text(); } catch {}
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------- Auth flows ----------
export async function login(email: string, password: string): Promise<User> {
  const response: LoginResponse = await apiCall("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem(TOKEN_KEY, response.token);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));

  return response.user;
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {} finally {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}


export function isAuthed(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function currentUser(): User | null {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? (JSON.parse(s) as User) : null;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return currentUser()?.role === "admin";
}
export function isCustomer(): boolean {
  return currentUser()?.role === "customer";
}
export function isRegularUser(): boolean {
  return currentUser()?.role === "user";
}

/** Where should an authed user land by default */
export function getDashboardRoute(): string {
  const user = currentUser();
  if (!user) return "/";
  if (user.role === "admin") return "/admin";
  if (user.role === "customer") return "/customer"; // guard will enforce active
  return "/dashboard";
}

/** Refresh /user  */
export async function refreshUser(): Promise<User | null> {
  try {
    const response = await apiCall("/user");
    const user: User = response?.user || response;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    await logout();
    return null;
  }
}
