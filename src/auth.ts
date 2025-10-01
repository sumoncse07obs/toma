// src/auth.ts
export const TOKEN_KEY = "toma_token";
export const USER_KEY  = "toma_user";

// Update this to your Laravel API base URL
const API_BASE_URL = `${import.meta.env.VITE_API_BASE}/api`; // or your Laravel API URL

export type User = { 
  id: number;
  name: string;
  email: string;
  role: string;
};

export type LoginResponse = {
  user: User;
  token: string;
  message: string;
};

// ⬇️ Exported so other files can import it
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem(TOKEN_KEY);

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Network error" }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Login function
export async function login(email: string, password: string): Promise<User> {
  const response: LoginResponse = await apiCall("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem(TOKEN_KEY, response.token);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  return response.user;
}

// Logout function
export async function logout(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  try {
    await apiCall("/logout", { method: "POST" });
  } catch { /* ignore */ }
}

// Check if user is authenticated
export function isAuthed(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

// Get current user
export function currentUser(): User | null {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

// Role checking functions
export function isAdmin(): boolean {
  const user = currentUser();
  return user?.role === "admin";
}
export function isCustomer(): boolean {
  const user = currentUser();
  return user?.role === "customer";
}
export function isRegularUser(): boolean {
  const user = currentUser();
  return user?.role === "user";
}

// Get the appropriate dashboard route for the current user
export function getDashboardRoute(): string {
  const user = currentUser();
  if (!user) return "/";
  switch (user.role) {
    case "admin": return "/admin";
    case "customer": return "/customer";
    case "user":return "/user";
    default: return "/dashboard";
  }
}

// Refresh user data from API
export async function refreshUser(): Promise<User | null> {
  try {
    const response = await apiCall("/user");
    const user = (response as any).user || response;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user as User;
  } catch (e) {
    // If refresh fails, user might be logged out
    await logout();
    return null;
  }
}
