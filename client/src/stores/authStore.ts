import { create } from 'zustand';
import {
  apiLogin, apiMe, apiListUsers, apiCreateUser, apiDeleteUser,
  clearToken, getToken,
  type ApiUser,
} from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string | null;
  role: 'admin' | 'user';
  isVerified?: boolean;
}

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: number;
}

interface AuthSession {
  user: User;
  expiresAt: number; // Unix timestamp ms
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initFromStorage: () => void;
}

// ─── Persistence (30 days — local cache of current session) ──────────────────

const AUTH_STORAGE_KEY = 'drivesense_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function saveSession(user: User) {
  const session: AuthSession = { user, expiresAt: Date.now() + SESSION_DURATION_MS };
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch { /* quota exceeded — ignore */ }
}

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session.user;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  clearToken();
}

// ─── API-backed Auth Functions ───────────────────────────────────────────────

function apiUserToUser(u: ApiUser): User {
  return { id: u.id, username: u.username, email: u.email, role: u.role };
}

export async function authenticateUser(email: string, password: string): Promise<User | { error: string }> {
  try {
    const { user } = await apiLogin(email, password);
    return apiUserToUser(user);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Login fehlgeschlagen' };
  }
}

export async function getRegisteredUsers(): Promise<StoredUser[]> {
  try {
    const { users } = await apiListUsers();
    return users.map((u) => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt ?? 0 }));
  } catch {
    return [];
  }
}

export async function registerUser(username: string, email: string, password: string, role: 'admin' | 'user' = 'user'): Promise<StoredUser | { error: string }> {
  try {
    const { user } = await apiCreateUser(username, email, password, role);
    return { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt ?? Date.now() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erstellen fehlgeschlagen' };
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await apiDeleteUser(id);
    return true;
  } catch {
    return false;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    if (user) saveSession(user);
    else clearSession();
    set({ user, isAuthenticated: !!user, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    clearSession();
    set({ user: null, isAuthenticated: false });
  },
  initFromStorage: () => {
    const user = loadSession();
    // If we have a token, verify it's still valid in the background
    if (user && getToken()) {
      apiMe()
        .then(({ user: u }) => {
          const freshUser = apiUserToUser(u);
          saveSession(freshUser);
          set({ user: freshUser, isAuthenticated: true, isLoading: false });
        })
        .catch(() => {
          // Token expired — keep cached session for now (offline support)
        });
    }
    set({ user, isAuthenticated: !!user, isLoading: false });
  },
}));
