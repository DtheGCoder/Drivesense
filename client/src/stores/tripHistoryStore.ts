import { create } from 'zustand';
import type { TripMode } from './tripStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TripRecord {
  id: string;
  userId: string;
  mode: TripMode;
  score: number;
  startedAt: number;
  endedAt: number;
  duration: number; // seconds
  distance: number; // meters
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h
  maxGForce: number;
  startAddress: string;
  endAddress: string;
  route: [number, number][]; // recorded GPS points [lng, lat]
  scores: {
    braking: number;
    acceleration: number;
    cornering: number;
    speed: number;
    consistency: number;
  };
  events: TripEvent[];
  fuelUsed?: number; // liters (estimated)
  fuelCost?: number; // EUR (estimated)
}

export interface TripEvent {
  type: 'positive' | 'negative' | 'neutral';
  message: string;
  details?: string;
  points: number;
  timestamp: number;
}

interface TripHistoryState {
  trips: TripRecord[];
  loadTrips: (userId: string) => void;
  addTrip: (trip: TripRecord) => void;
  getTrip: (id: string) => TripRecord | undefined;
  deleteTrip: (id: string) => void;
  getUserStats: (userId: string) => {
    totalTrips: number;
    totalDistance: number;
    totalDuration: number;
    avgScore: number;
    bestScore: number;
  };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const TRIPS_STORAGE_KEY = 'drivesense_trips';

function loadTripsFromStorage(userId: string): TripRecord[] {
  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!raw) return [];
    const all: TripRecord[] = JSON.parse(raw);
    return all.filter((t) => t.userId === userId).sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

function saveTripsToStorage(trips: TripRecord[]) {
  try {
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
  } catch { /* quota */ }
}

function getAllTripsFromStorage(): TripRecord[] {
  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useTripHistoryStore = create<TripHistoryState>((set, get) => ({
  trips: [],

  loadTrips: (userId: string) => {
    set({ trips: loadTripsFromStorage(userId) });
  },

  addTrip: (trip: TripRecord) => {
    const all = getAllTripsFromStorage();
    all.unshift(trip);
    saveTripsToStorage(all);
    set((s) => ({ trips: [trip, ...s.trips] }));
  },

  getTrip: (id: string) => {
    // Check state first
    const inState = get().trips.find((t) => t.id === id);
    if (inState) return inState;
    // Fall back to storage
    const all = getAllTripsFromStorage();
    return all.find((t) => t.id === id);
  },

  deleteTrip: (id: string) => {
    const all = getAllTripsFromStorage().filter((t) => t.id !== id);
    saveTripsToStorage(all);
    set((s) => ({ trips: s.trips.filter((t) => t.id !== id) }));
  },

  getUserStats: (userId: string) => {
    const trips = get().trips.filter((t) => t.userId === userId && t.mode !== 'free');
    if (trips.length === 0) {
      return { totalTrips: 0, totalDistance: 0, totalDuration: 0, avgScore: 0, bestScore: 0 };
    }
    return {
      totalTrips: trips.length,
      totalDistance: trips.reduce((sum, t) => sum + t.distance, 0),
      totalDuration: trips.reduce((sum, t) => sum + t.duration, 0),
      avgScore: Math.round(trips.reduce((sum, t) => sum + t.score, 0) / trips.length),
      bestScore: Math.max(...trips.map((t) => t.score)),
    };
  },
}));
