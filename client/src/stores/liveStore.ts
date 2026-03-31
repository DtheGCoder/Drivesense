import { create } from 'zustand';
import type { TripMode } from './tripStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LiveUser {
  id: string;
  username: string;
  initials: string;
  color: string;
  position: [number, number]; // [lng, lat]
  heading: number;
  status: 'idle' | 'driving' | 'offline';
  mode?: TripMode;
  speed: number;
  score: number;
  profilePicture?: string;
  isSelf?: boolean;
  destination?: string;
  route?: [number, number][];
  eta?: number; // seconds
  distanceRemaining?: number; // meters
  tripDuration?: number; // seconds
  tripDistance?: number; // meters
  lastUpdate: number;
}

interface LiveState {
  users: LiveUser[];
  selectedUserId: string | null;
  setUsers: (users: LiveUser[]) => void;
  addUser: (user: LiveUser) => void;
  removeUser: (id: string) => void;
  updateUser: (id: string, partial: Partial<LiveUser>) => void;
  selectUser: (id: string | null) => void;
}

// ─── Assigned Colors ─────────────────────────────────────────────────────────

export const USER_COLORS = [
  '#00f0ff', '#f59e0b', '#a78bfa', '#22c55e', '#f43f5e',
  '#3b82f6', '#ec4899', '#14b8a6', '#ef4444', '#8b5cf6',
];

// ─── Store ───────────────────────────────────────────────────────────────────

export const useLiveStore = create<LiveState>((set) => ({
  users: [],
  selectedUserId: null,
  setUsers: (users) => set({ users }),
  addUser: (user) => set((s) => ({ users: [...s.users, user] })),
  removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
  updateUser: (id, partial) =>
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, ...partial, lastUpdate: Date.now() } : u)),
    })),
  selectUser: (id) => set({ selectedUserId: id }),
}));
