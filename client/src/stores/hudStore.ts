import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type HudWidgetId =
  | 'speed'
  | 'gforce'
  | 'score'
  | 'stats'
  | 'fuelCost'
  | 'altitude'
  | 'heading';

export interface HudWidgetConfig {
  id: HudWidgetId;
  label: string;
  visible: boolean;
  /** Position order (0-based, lower = higher on screen) */
  order: number;
  /** Size: 'sm' | 'md' | 'lg' */
  size: 'sm' | 'md' | 'lg';
}

interface HudState {
  widgets: HudWidgetConfig[];
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  toggleWidget: (id: HudWidgetId) => void;
  setWidgetSize: (id: HudWidgetId, size: 'sm' | 'md' | 'lg') => void;
  reorderWidgets: (from: number, to: number) => void;
  resetDefaults: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_WIDGETS: HudWidgetConfig[] = [
  { id: 'speed', label: 'Geschwindigkeit', visible: true, order: 0, size: 'lg' },
  { id: 'gforce', label: 'G-Kraft', visible: true, order: 1, size: 'md' },
  { id: 'score', label: 'Score', visible: true, order: 2, size: 'md' },
  { id: 'stats', label: 'Trip-Stats', visible: true, order: 3, size: 'md' },
  { id: 'fuelCost', label: 'Spritkosten', visible: true, order: 4, size: 'sm' },
  { id: 'altitude', label: 'Höhe', visible: false, order: 5, size: 'sm' },
  { id: 'heading', label: 'Kompass', visible: false, order: 6, size: 'sm' },
];

const STORAGE_KEY = 'drivesense_hud_config';

function loadFromStorage(): HudWidgetConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HudWidgetConfig[];
      // Merge with defaults to catch new widgets added in updates
      const ids = new Set(parsed.map((w) => w.id));
      const merged = [...parsed];
      for (const dw of DEFAULT_WIDGETS) {
        if (!ids.has(dw.id)) merged.push(dw);
      }
      return merged;
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDGETS;
}

function saveToStorage(widgets: HudWidgetConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useHudStore = create<HudState>((set, get) => ({
  widgets: loadFromStorage(),
  editMode: false,

  setEditMode: (on) => set({ editMode: on }),

  toggleWidget: (id) => {
    const widgets = get().widgets.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w,
    );
    saveToStorage(widgets);
    set({ widgets });
  },

  setWidgetSize: (id, size) => {
    const widgets = get().widgets.map((w) =>
      w.id === id ? { ...w, size } : w,
    );
    saveToStorage(widgets);
    set({ widgets });
  },

  reorderWidgets: (from, to) => {
    const widgets = [...get().widgets].sort((a, b) => a.order - b.order);
    const [moved] = widgets.splice(from, 1);
    if (!moved) return;
    widgets.splice(to, 0, moved);
    const reordered = widgets.map((w, i) => ({ ...w, order: i }));
    saveToStorage(reordered);
    set({ widgets: reordered });
  },

  resetDefaults: () => {
    saveToStorage(DEFAULT_WIDGETS);
    set({ widgets: DEFAULT_WIDGETS });
  },
}));
