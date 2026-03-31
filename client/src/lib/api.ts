/**
 * DriveSense API client — talks to the simple-api backend.
 * In dev, Vite proxies /api → localhost:3000.
 * In prod, Nginx proxies /api → the API server.
 */

const TOKEN_KEY = 'drivesense_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: number;
}

export async function apiLogin(email: string, password: string): Promise<{ user: ApiUser; token: string }> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<{ user: ApiUser; token: string }>(res);
  setToken(data.token);
  return data;
}

export async function apiMe(): Promise<{ user: ApiUser }> {
  const res = await fetch('/api/v1/auth/me', {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── User Management ─────────────────────────────────────────────────────────

export async function apiListUsers(): Promise<{ users: ApiUser[] }> {
  const res = await fetch('/api/v1/users', {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiCreateUser(username: string, email: string, password: string, role: string = 'user'): Promise<{ user: ApiUser }> {
  const res = await fetch('/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ username, email, password, role }),
  });
  return handleResponse(res);
}

export async function apiDeleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/v1/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse(res);
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface ApiProfile {
  userId: string;
  profilePicture?: string; // URL
  cars: unknown[];
  selectedCarId?: string;
  fuelPriceBenzin: number;
  fuelPriceDiesel: number;
  fuelPriceElektro: number;
  settings: Record<string, unknown>;
}

export async function apiGetProfile(): Promise<{ profile: ApiProfile | null }> {
  const res = await fetch('/api/v1/profile', {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiUpdateProfile(data: Partial<ApiProfile>): Promise<{ profile: ApiProfile }> {
  const res = await fetch('/api/v1/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiUploadPicture(blob: Blob): Promise<{ url: string }> {
  const res = await fetch('/api/v1/profile/picture', {
    method: 'POST',
    headers: { 'Content-Type': blob.type, ...authHeaders() },
    body: blob,
  });
  return handleResponse(res);
}

export async function apiDeletePicture(): Promise<void> {
  const res = await fetch('/api/v1/profile/picture', {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse(res);
}
