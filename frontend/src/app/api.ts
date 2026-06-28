// API helper functions for the Zombie Subs Tracker frontend.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  unique_email?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  merchant: string;
  amount: number;
  currency: string;
  cycle: string;
  category?: string;
  next_payment?: string;
  start_date?: string;
  source?: string;
  created_at: string;
}

export interface ExchangeRates {
  [key: string]: number;
}

// Normalize MongoDB ObjectID responses (which may come as { "$oid": "..." })
function normalizeId(id: unknown): string {
  if (typeof id === "string") return id;
  if (id && typeof id === "object" && "$oid" in (id as Record<string, unknown>)) {
    return (id as Record<string, string>)["$oid"];
  }
  return String(id);
}

function normalizeSub(raw: Record<string, unknown>): Subscription {
  return {
    ...raw,
    id: normalizeId(raw.id),
  } as Subscription;
}

// Get the stored JWT token
function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("zst_token") || "";
}

// Auth headers helper
function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

// --- Auth ---

export async function loginWithGoogle(idToken: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_URL}/api/v1/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${text}`);
  }

  const data = await res.json();
  
  localStorage.setItem("zst_token", data.token);
  localStorage.setItem("zst_user", JSON.stringify(data.user));
  
  return data;
}

export async function registerManualUser(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Registration failed: ${text}`);
  }

  const data = await res.json();
  localStorage.setItem("zst_token", data.token);
  localStorage.setItem("zst_user", JSON.stringify(data.user));
  return data;
}

export async function loginManualUser(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${text}`);
  }

  const data = await res.json();
  localStorage.setItem("zst_token", data.token);
  localStorage.setItem("zst_user", JSON.stringify(data.user));
  return data;
}

// GitHub login helper to store token and user from URL parameters
export function completeOAuthLogin(token: string) {
  localStorage.setItem("zst_token", token);
  // Ideally, the backend would redirect with user data or we fetch the user profile here.
  // For simplicity, we just set the token. The dashboard will fail if it strictly needs user in localStorage,
  // so we decode the JWT to get the minimal user info.
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const user: User = {
      id: payload.userId,
      email: payload.email,
      name: payload.email.split('@')[0], // Fallback name
      picture: "https://ui-avatars.com/api/?name=" + payload.email + "&background=random",
    };
    localStorage.setItem("zst_user", JSON.stringify(user));
  } catch(e) {
    console.error("Failed to parse JWT payload");
  }
}

export function logout() {
  localStorage.removeItem("zst_token");
  localStorage.removeItem("zst_user");
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("zst_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// --- Subscriptions CRUD ---

export async function getSubscriptions(): Promise<Subscription[]> {
  const res = await fetch(`${API_URL}/api/v1/subscriptions`, {
    headers: authHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch subscriptions");

  const data = await res.json();
  return (data || []).map((s: Record<string, unknown>) => normalizeSub(s));
}

export async function createSubscription(sub: {
  merchant: string;
  amount: number;
  currency: string;
  cycle: string;
  category?: string;
  next_payment?: string;
  start_date?: string;
}): Promise<Subscription> {
  const res = await fetch(`${API_URL}/api/v1/subscriptions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(sub),
  });

  if (!res.ok) throw new Error("Failed to create subscription");

  const data = await res.json();
  return normalizeSub(data);
}

export const updateSubscription = async (id: string, data: Partial<Subscription>): Promise<void> => {
  const token = localStorage.getItem("zst_token");
  const res = await fetch(`${API_URL}/api/v1/subscriptions/${id}`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to update subscription");
  }
};

export const deleteSubscription = async (id: string): Promise<void> => {
  const token = localStorage.getItem("zst_token");
  const res = await fetch(`${API_URL}/api/v1/subscriptions/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to delete subscription");
  }
};

// --- Exchange Rates ---

let cachedRates: ExchangeRates | null = null;

export async function getExchangeRates(): Promise<ExchangeRates> {
  if (cachedRates) return cachedRates;

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data.result === "success") {
      cachedRates = data.rates;
      return data.rates;
    }
  } catch (e) {
    console.error("Failed to fetch exchange rates:", e);
  }

  // Fallback rates
  return { USD: 1, EUR: 0.85, GBP: 0.73, IDR: 15500, JPY: 150 };
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  return (amount / fromRate) * toRate;
}

// Format currency for display
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "IDR" || currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "IDR" || currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
