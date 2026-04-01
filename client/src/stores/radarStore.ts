import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CameraType = 'fixed' | 'red_light' | 'section' | 'mobile' | 'traffic_signals';

export interface SpeedCamera {
  id: number;
  lat: number;
  lng: number;
  type: CameraType;
  maxspeed?: number;
  direction?: number;
}

interface RadarState {
  cameras: SpeedCamera[];
  lastFetchCenter: [number, number] | null;
  isLoading: boolean;
  enabled: boolean;
  warningDistance: number; // meters
  nearbyCamera: SpeedCamera | null;
  setEnabled: (enabled: boolean) => void;
  setWarningDistance: (distance: number) => void;
  fetchCameras: (center: [number, number], radiusKm?: number) => Promise<void>;
  checkProximity: (lat: number, lng: number, heading?: number) => SpeedCamera | null;
  clearCameras: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifyCamera(tags: Record<string, string>): CameraType {
  const enforcement = tags['enforcement'] ?? '';
  if (enforcement === 'traffic_signals') return 'traffic_signals';
  if (enforcement === 'average_speed') return 'section';
  if (tags['highway'] === 'speed_camera') return 'fixed';
  if (enforcement === 'maxspeed' || enforcement === 'speed') return 'fixed';
  return 'fixed';
}

// ─── Overpass API fetch ──────────────────────────────────────────────────────

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const FETCH_COOLDOWN_MS = 30_000; // min 30s between fetches
const REFETCH_DISTANCE_KM = 2; // refetch if user moved >2km from last center

let lastFetchTime = 0;

async function fetchFromOverpass(center: [number, number], radiusKm: number): Promise<SpeedCamera[]> {
  const [lng, lat] = center;
  const radiusM = radiusKm * 1000;

  const query = `
[out:json][timeout:15];
(
  node["highway"="speed_camera"](around:${radiusM},${lat},${lng});
  node["enforcement"~"^(maxspeed|speed|average_speed)$"](around:${radiusM},${lat},${lng});
);
out body;
`;

  let lastErr: Error | null = null;
  for (const server of OVERPASS_SERVERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) { lastErr = new Error(`${res.status}`); continue; }
      const data = await res.json();

      const seen = new Set<number>();
      const cameras: SpeedCamera[] = [];

      for (const el of data.elements ?? []) {
        if (el.type !== 'node' || seen.has(el.id)) continue;
        seen.add(el.id);
        const tags = (el.tags ?? {}) as Record<string, string>;
        const type = classifyCamera(tags);
        const maxspeedStr = tags['maxspeed'];
        const directionStr = tags['direction'];

        cameras.push({
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          type,
          maxspeed: maxspeedStr ? parseInt(maxspeedStr, 10) || undefined : undefined,
          direction: directionStr ? parseFloat(directionStr) || undefined : undefined,
        });
      }

      return cameras;
    } catch (err) {
      lastErr = err as Error;
      continue;
    }
  }

  throw lastErr ?? new Error('All Overpass servers failed');
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useRadarStore = create<RadarState>((set, get) => ({
  cameras: [],
  lastFetchCenter: null,
  isLoading: false,
  enabled: localStorage.getItem('ds_radar_enabled') !== 'false', // default on
  warningDistance: parseInt(localStorage.getItem('ds_radar_warning_dist') ?? '500', 10),
  nearbyCamera: null,

  setEnabled: (enabled) => {
    localStorage.setItem('ds_radar_enabled', String(enabled));
    set({ enabled });
    if (!enabled) set({ cameras: [], nearbyCamera: null });
  },

  setWarningDistance: (distance) => {
    localStorage.setItem('ds_radar_warning_dist', String(distance));
    set({ warningDistance: distance });
  },

  fetchCameras: async (center, radiusKm = 10) => {
    const state = get();
    if (!state.enabled || state.isLoading) return;

    // Cooldown
    const now = Date.now();
    if (now - lastFetchTime < FETCH_COOLDOWN_MS) return;

    // Skip if user hasn't moved far from last fetch
    if (state.lastFetchCenter) {
      const dist = haversineDistance(center[1], center[0], state.lastFetchCenter[1], state.lastFetchCenter[0]);
      if (dist < REFETCH_DISTANCE_KM * 1000) return;
    }

    set({ isLoading: true });
    lastFetchTime = now;

    try {
      const cameras = await fetchFromOverpass(center, radiusKm);
      set({ cameras, lastFetchCenter: center, isLoading: false });
    } catch (err) {
      console.warn('[Radar] Fetch failed:', err);
      set({ isLoading: false });
    }
  },

  checkProximity: (lat, lng, heading) => {
    const state = get();
    if (!state.enabled || state.cameras.length === 0) return null;

    let closest: SpeedCamera | null = null;
    let closestDist = Infinity;

    for (const cam of state.cameras) {
      const dist = haversineDistance(lat, lng, cam.lat, cam.lng);
      if (dist < state.warningDistance && dist < closestDist) {
        // If camera has a direction, check if user is heading towards it
        if (cam.direction !== undefined && heading !== undefined) {
          const bearingToCamera = Math.atan2(
            Math.sin(((cam.lng - lng) * Math.PI) / 180) * Math.cos((cam.lat * Math.PI) / 180),
            Math.cos((lat * Math.PI) / 180) * Math.sin((cam.lat * Math.PI) / 180) -
              Math.sin((lat * Math.PI) / 180) * Math.cos((cam.lat * Math.PI) / 180) *
                Math.cos(((cam.lng - lng) * Math.PI) / 180),
          ) * (180 / Math.PI);
          const normalized = ((bearingToCamera % 360) + 360) % 360;
          const headingDiff = Math.abs(normalized - heading);
          const angleDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;
          // Only warn if heading roughly towards camera (within 90°)
          if (angleDiff > 90) continue;
        }
        closest = cam;
        closestDist = dist;
      }
    }

    set({ nearbyCamera: closest });
    return closest;
  },

  clearCameras: () => set({ cameras: [], nearbyCamera: null, lastFetchCenter: null }),
}));
