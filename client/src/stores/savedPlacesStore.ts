import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── SVG Icon Keys ───────────────────────────────────────────────────────────

export const PLACE_ICONS = [
  { key: 'home', label: 'Zuhause' },
  { key: 'work', label: 'Arbeit' },
  { key: 'star', label: 'Favorit' },
  { key: 'heart', label: 'Herz' },
  { key: 'gym', label: 'Fitness' },
  { key: 'school', label: 'Schule' },
  { key: 'shop', label: 'Einkauf' },
  { key: 'food', label: 'Essen' },
  { key: 'fuel', label: 'Tanken' },
  { key: 'parking', label: 'Parken' },
  { key: 'hospital', label: 'Krankenhaus' },
  { key: 'pin', label: 'Pin' },
] as const;

export type PlaceIconKey = (typeof PLACE_ICONS)[number]['key'];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  center: [number, number];
  icon: PlaceIconKey;
  color: string;
  createdAt: number;
}

interface SavedPlacesState {
  places: SavedPlace[];
  addPlace: (place: Omit<SavedPlace, 'id' | 'createdAt'>) => void;
  removePlace: (id: string) => void;
  updatePlace: (id: string, partial: Partial<Omit<SavedPlace, 'id' | 'createdAt'>>) => void;
}

// ─── Color Presets ───────────────────────────────────────────────────────────

export const PLACE_COLORS = [
  '#00f0ff', '#ff3355', '#00ff88', '#f59e0b', '#a78bfa',
  '#3b82f6', '#ec4899', '#14b8a6', '#ef4444', '#8b5cf6',
];

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSavedPlacesStore = create<SavedPlacesState>()(
  persist(
    (set) => ({
      places: [],
      addPlace: (place) =>
        set((s) => ({
          places: [...s.places, { ...place, id: crypto.randomUUID(), createdAt: Date.now() }],
        })),
      removePlace: (id) => set((s) => ({ places: s.places.filter((p) => p.id !== id) })),
      updatePlace: (id, partial) =>
        set((s) => ({
          places: s.places.map((p) => (p.id === id ? { ...p, ...partial } : p)),
        })),
    }),
    { name: 'drivesense-saved-places' },
  ),
);
