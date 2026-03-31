import { create } from 'zustand';

export type TripMode = 'driving_school' | 'racing' | 'eco' | 'free';
export type TripStatus = 'idle' | 'recording' | 'processing' | 'completed';

interface TripEvent {
  type: string;
  message: string;
  points: number;
  timestamp: number;
}

interface LiveMetrics {
  speed: number; // km/h
  gForceLateral: number;
  gForceLongitudinal: number;
  score: number;
  heading: number;
  altitude: number;
}

interface TripState {
  status: TripStatus;
  mode: TripMode;
  tripId: string | null;
  startedAt: number | null;
  elapsed: number;
  distance: number; // meters
  metrics: LiveMetrics;
  events: TripEvent[];
  setStatus: (status: TripStatus) => void;
  setMode: (mode: TripMode) => void;
  startTrip: (tripId: string) => void;
  endTrip: () => void;
  updateMetrics: (metrics: Partial<LiveMetrics>) => void;
  addEvent: (event: TripEvent) => void;
  updateElapsed: (elapsed: number) => void;
  updateDistance: (distance: number) => void;
}

export const useTripStore = create<TripState>((set) => ({
  status: 'idle',
  mode: 'driving_school',
  tripId: null,
  startedAt: null,
  elapsed: 0,
  distance: 0,
  metrics: {
    speed: 0,
    gForceLateral: 0,
    gForceLongitudinal: 0,
    score: 100,
    heading: 0,
    altitude: 0,
  },
  events: [],
  setStatus: (status) => set({ status }),
  setMode: (mode) => set({ mode }),
  startTrip: (tripId) =>
    set({
      status: 'recording',
      tripId,
      startedAt: Date.now(),
      elapsed: 0,
      distance: 0,
      events: [],
      metrics: { speed: 0, gForceLateral: 0, gForceLongitudinal: 0, score: 100, heading: 0, altitude: 0 },
    }),
  endTrip: () => set({ status: 'processing' }),
  updateMetrics: (partial) =>
    set((s) => ({ metrics: { ...s.metrics, ...partial } })),
  addEvent: (event) =>
    set((s) => ({ events: [...s.events.slice(-20), event] })),
  updateElapsed: (elapsed) => set({ elapsed }),
  updateDistance: (distance) => set({ distance }),
}));
