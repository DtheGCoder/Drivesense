import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string | null;
  role: 'admin' | 'user';
  isVerified?: boolean;
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

// ─── Persistence (30 days) ───────────────────────────────────────────────────

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
}

// ─── Registered Users (client-side for demo/offline mode) ────────────────────

const USERS_STORAGE_KEY = 'drivesense_users';

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // Simple hash — NOT for production
  role: 'admin' | 'user';
  createdAt: number;
}

// Default admin account
const DEFAULT_ADMIN: StoredUser = {
  id: 'admin-dtheg',
  username: 'DtheG',
  email: 'admin@drivesense.de',
  passwordHash: simpleHash('Admin0815A'),
  role: 'admin',
  createdAt: Date.now(),
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

export function getRegisteredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      // Initialize with default admin
      const initial = [DEFAULT_ADMIN];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_ADMIN];
  }
}

export function registerUser(username: string, email: string, password: string, role: 'admin' | 'user' = 'user'): StoredUser | { error: string } {
  const users = getRegisteredUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'E-Mail bereits registriert' };
  }
  if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { error: 'Benutzername bereits vergeben' };
  }
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash: simpleHash(password),
    role,
    createdAt: Date.now(),
  };
  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return newUser;
}

export function authenticateUser(email: string, password: string): User | { error: string } {
  const users = getRegisteredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { error: 'Benutzer nicht gefunden' };
  if (user.passwordHash !== simpleHash(password)) return { error: 'Falsches Passwort' };
  return { id: user.id, username: user.username, email: user.email, role: user.role };
}

export function deleteUser(id: string): boolean {
  const users = getRegisteredUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export { simpleHash };

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
    set({ user, isAuthenticated: !!user, isLoading: false });
  },
}));
