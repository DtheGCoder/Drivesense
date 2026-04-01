import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMap, type RouteStep, type RouteResult } from '@/components/map/MapProvider';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProfileStore } from '@/stores/profileStore';
import { useSavedPlacesStore, PLACE_ICONS, PLACE_COLORS, type PlaceIconKey } from '@/stores/savedPlacesStore';
import { type SpeedCamera, type CameraType } from '@/stores/radarStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  name: string;
  address: string;
  center: [number, number];
  category?: string;
}

interface RouteWaypoint {
  id: string;
  label: string;
  center: [number, number];
}

interface RouteInfo {
  distance: number;
  duration: number;
  coordinates: [number, number][];
  steps: RouteStep[];
}

// ─── Maneuver Icons ──────────────────────────────────────────────────────────

function ManeuverIcon({ maneuver, modifier, size = 20 }: { maneuver: string; modifier: string; size?: number }) {
  const color = 'currentColor';
  const s = size;

  if (modifier?.includes('right')) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 9 6 15 6" /><polyline points="13 4 15 6 13 8" />
      </svg>
    );
  }
  if (modifier?.includes('left')) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 15 6 9 6" /><polyline points="11 4 9 6 11 8" />
      </svg>
    );
  }
  if (maneuver === 'depart' || maneuver === 'arrive' || modifier === 'straight') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="8 9 12 5 16 9" />
      </svg>
    );
  }
  if (maneuver.includes('roundabout') || maneuver.includes('rotary')) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="4" /><line x1="12" y1="14" x2="12" y2="20" />
      </svg>
    );
  }
  if (maneuver === 'merge' || maneuver === 'fork') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="12" /><line x1="12" y1="12" x2="6" y2="4" /><line x1="12" y1="12" x2="18" y2="4" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="8 9 12 5 16 9" />
    </svg>
  );
}

// ─── Place Icon SVGs ─────────────────────────────────────────────────────────

function PlaceIcon({ icon, size = 20, color = 'currentColor' }: { icon: PlaceIconKey; size?: number; color?: string }) {
  const s = size;
  const p = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (icon) {
    case 'home': return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case 'work': return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>;
    case 'star': return <svg {...p} fill={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case 'heart': return <svg {...p} fill={color}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>;
    case 'gym': return <svg {...p}><path d="M6.5 6.5h11M6.5 17.5h11" /><rect x="2" y="8.5" width="4" height="7" rx="1" /><rect x="18" y="8.5" width="4" height="7" rx="1" /><line x1="12" y1="6.5" x2="12" y2="17.5" /></svg>;
    case 'school': return <svg {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" /></svg>;
    case 'shop': return <svg {...p}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>;
    case 'food': return <svg {...p}><path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>;
    case 'fuel': return <svg {...p}><path d="M3 22V5a2 2 0 012-2h8a2 2 0 012 2v17" /><path d="M15 10h2a2 2 0 012 2v3a2 2 0 002 2" /><rect x="6" y="6" width="6" height="5" /></svg>;
    case 'parking': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 17V7h4a3 3 0 010 6H9" /></svg>;
    case 'hospital': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>;
    case 'pin': return <svg {...p} fill={color}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" fill="none" stroke="#1a1a26" /></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="3" /></svg>;
  }
}

// ─── Mapbox Geocoding ────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

function getResultIcon(category?: string): string {
  if (!category) return '📍';
  const c = category.toLowerCase();
  if (c.includes('fuel') || c.includes('gas') || c.includes('petrol')) return '⛽';
  if (c.includes('restaurant') || c.includes('food') || c.includes('cafe') || c.includes('coffee')) return '🍽️';
  if (c.includes('shop') || c.includes('store') || c.includes('grocery') || c.includes('supermarket') || c.includes('mall')) return '🛒';
  if (c.includes('parking')) return '🅿️';
  if (c.includes('hotel') || c.includes('lodging')) return '🏨';
  if (c.includes('hospital') || c.includes('pharmacy') || c.includes('doctor') || c.includes('medical')) return '🏥';
  if (c.includes('school') || c.includes('university') || c.includes('college')) return '🎓';
  if (c.includes('park') || c.includes('garden')) return '🌳';
  if (c.includes('bank') || c.includes('atm')) return '🏦';
  if (c.includes('bar') || c.includes('pub') || c.includes('nightlife')) return '🍺';
  if (c.includes('gym') || c.includes('fitness') || c.includes('sport')) return '🏋️';
  if (c.includes('cinema') || c.includes('theater') || c.includes('museum')) return '🎭';
  if (c.includes('church') || c.includes('worship')) return '⛪';
  if (c.includes('airport')) return '✈️';
  if (c.includes('train') || c.includes('station') || c.includes('transit')) return '🚆';
  if (c.includes('bus')) return '🚌';
  if (c.includes('charging')) return '🔌';
  return '📍';
}

async function geocodeSearch(query: string, proximity?: [number, number]): Promise<SearchResult[]> {
  if (!MAPBOX_TOKEN || query.length < 1) return [];

  // Sequential radius search: try nearby first, expand if no results
  const radiiKm = [15, 50, 150, 0]; // 0 = no bbox (worldwide)
  for (const radiusKm of radiiKm) {
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN,
        limit: '8',
        language: 'de',
        autocomplete: 'true',
        types: 'address,poi,place,locality',
      });
      if (proximity) {
        params.set('proximity', `${proximity[0]},${proximity[1]}`);
        if (radiusKm > 0) {
          // bbox = [minLng, minLat, maxLng, maxLat]
          const latDeg = radiusKm / 110.574;
          const lngDeg = radiusKm / (111.320 * Math.cos(proximity[1] * Math.PI / 180));
          params.set('bbox', `${proximity[0] - lngDeg},${proximity[1] - latDeg},${proximity[0] + lngDeg},${proximity[1] + latDeg}`);
        }
      }
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const results: SearchResult[] = (data.features ?? []).map((f: Record<string, unknown>) => ({
        id: f.id as string,
        name: (f.text ?? f.place_name) as string,
        address: (f.place_name ?? '') as string,
        center: f.center as [number, number],
        category: ((f.properties as Record<string, unknown>)?.category as string) ?? undefined,
      }));
      if (results.length > 0) return results;
      // No results at this radius — try wider
    } catch {
      return [];
    }
  }
  return [];
}

async function reverseGeocode(coords: [number, number]): Promise<string> {
  if (!MAPBOX_TOKEN) return 'Mein Standort';
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${MAPBOX_TOKEN}&language=de&limit=1&types=address,poi`;
    const res = await fetch(url);
    if (!res.ok) return 'Mein Standort';
    const data = await res.json();
    return (data.features?.[0]?.place_name as string) ?? 'Mein Standort';
  } catch {
    return 'Mein Standort';
  }
}

// ─── Geometry Helpers ────────────────────────────────────────────────────────

/** Extract only the diverging segment of an alt route vs main route */
function getDivergingSegment(altCoords: [number, number][], mainCoords: [number, number][], thresholdM = 50): [number, number][] {
  // Find first point where alt diverges from main
  let startIdx = 0;
  for (let i = 0; i < altCoords.length; i++) {
    if (distanceToPolyline(altCoords[i]!, mainCoords) > thresholdM) {
      startIdx = Math.max(0, i - 1); // include one point before divergence for continuity
      break;
    }
  }
  // Find last point where alt diverges from main (scan from end)
  let endIdx = altCoords.length - 1;
  for (let i = altCoords.length - 1; i >= startIdx; i--) {
    if (distanceToPolyline(altCoords[i]!, mainCoords) > thresholdM) {
      endIdx = Math.min(altCoords.length - 1, i + 1); // include one point after for continuity
      break;
    }
  }
  if (startIdx >= endIdx) return altCoords; // fully divergent or fully same — show all
  return altCoords.slice(startIdx, endIdx + 1);
}

function distanceToSegment(p: [number, number], a: [number, number], b: [number, number]): number {
  const cosLat = Math.cos(p[1] * Math.PI / 180);
  const toM = (lng: number, lat: number) => [lng * 111320 * cosLat, lat * 110540] as const;
  const [px, py] = toM(p[0], p[1]);
  const [ax, ay] = toM(a[0], a[1]);
  const [bx, by] = toM(b[0], b[1]);
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

function distanceToPolyline(point: [number, number], coords: [number, number][]): number {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distanceToSegment(point, coords[i]!, coords[i + 1]!);
    if (d < min) min = d;
  }
  return min;
}

// ─── Speed Camera Route Check ────────────────────────────────────────────────

async function fetchRouteCameras(coords: [number, number][]): Promise<SpeedCamera[]> {
  if (coords.length < 2) return [];
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDist = (maxLat - minLat) * 110540;
  const lngDist = (maxLng - minLng) * 111320 * Math.cos(centerLat * Math.PI / 180);
  const radiusM = Math.min(Math.max(Math.max(latDist, lngDist) / 2 + 500, 5000), 25000);

  const query = `[out:json][timeout:25];
(
  node["highway"="speed_camera"](around:${radiusM},${centerLat},${centerLng});
  node["enforcement"~"^(maxspeed|speed|average_speed)$"](around:${radiusM},${centerLat},${centerLng});
);
out body;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<number>();
    const cameras: SpeedCamera[] = [];
    for (const el of data.elements ?? []) {
      if (el.type !== 'node' || seen.has(el.id)) continue;
      seen.add(el.id);
      const tags = (el.tags ?? {}) as Record<string, string>;
      const enforcement = tags['enforcement'] ?? '';
      let type: CameraType = 'fixed';
      if (enforcement === 'traffic_signals') type = 'traffic_signals';
      else if (enforcement === 'average_speed') type = 'section';
      cameras.push({
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        type,
        maxspeed: tags['maxspeed'] ? parseInt(tags['maxspeed'], 10) || undefined : undefined,
      });
    }
    return cameras;
  } catch {
    return [];
  }
}

function countCamerasOnRoute(cameras: SpeedCamera[], coords: [number, number][], maxDist = 200): number {
  let count = 0;
  for (const cam of cameras) {
    if (distanceToPolyline([cam.lng, cam.lat], coords) <= maxDist) count++;
  }
  return count;
}

// ─── Format Helpers ──────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  return `${mins} min`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatStepDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  if (meters >= 100) return `${Math.round(meters / 10) * 10} m`;
  return `${Math.round(meters)} m`;
}

// ─── POI Categories ──────────────────────────────────────────────────────────

type PoiCategory = 'fuel' | 'supermarket' | 'restaurant' | 'parking' | 'ev_charging';

const POI_CATEGORIES: { key: PoiCategory; label: string; icon: string; mapboxCategory: string }[] = [
  { key: 'fuel', label: 'Tanken', icon: '⛽', mapboxCategory: 'fuel' },
  { key: 'supermarket', label: 'Einkauf', icon: '🛒', mapboxCategory: 'grocery' },
  { key: 'restaurant', label: 'Essen', icon: '🍽️', mapboxCategory: 'restaurant' },
  { key: 'parking', label: 'Parken', icon: '🅿️', mapboxCategory: 'parking' },
  { key: 'ev_charging', label: 'Laden', icon: '🔌', mapboxCategory: 'charging_station' },
];

// ─── Route Search Component ─────────────────────────────────────────────────

const ALT_ROUTE_COLORS = ['#6366f1', '#f59e0b'];

interface RouteSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RouteSearch({ isOpen, onClose }: RouteSearchProps) {
  const { flyTo, easeTo, drawRoute, clearRoute, drawAlternativeRoutes, clearAlternativeRoutes, fetchRoute, fetchRoutes, map } = useMap();
  const { position: gpsPosition } = useGeolocation({ autoStart: true });
  const calculateFuelCost = useProfileStore((s) => s.calculateFuelCost);

  // View state
  const [view, setView] = useState<'search' | 'overview' | 'navigation'>('search');

  // Input state
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Route state
  const [startPoint, setStartPoint] = useState<RouteWaypoint | null>(null);
  const [endPoint, setEndPoint] = useState<RouteWaypoint | null>(null);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Navigation state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [eta, setEta] = useState('');
  const [remainingDistance, setRemainingDistance] = useState(0);

  // Alternative routes & rerouting
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteResult[]>([]);
  const [isRerouting, setIsRerouting] = useState(false);
  const offRouteCountRef = useRef(0);

  // POI
  const [poiResults, setPoiResults] = useState<SearchResult[]>([]);
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<PoiCategory | null>(null);

  // Speed camera state
  const [routeCameras, setRouteCameras] = useState<SpeedCamera[]>([]);
  const [routeCameraCount, setRouteCameraCount] = useState(0);
  const [isFetchingCameras, setIsFetchingCameras] = useState(false);

  // Saved places
  const { places: savedPlaces, addPlace, removePlace } = useSavedPlacesStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveIcon, setSaveIcon] = useState<PlaceIconKey>('pin');
  const [saveColor, setSaveColor] = useState(PLACE_COLORS[0]!);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const endInputRef = useRef<HTMLInputElement>(null);
  const smoothNavBearingRef = useRef<number>(0);
  const lastNavBearingUpdateRef = useRef<number>(0);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Collapsed state for overview — map interaction collapses panels
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);

  // Auto-fill start with GPS position — set immediately, reverse geocode in background
  const hasAutoFilledStart = useRef(false);
  useEffect(() => {
    if (gpsPosition && !startPoint && !hasAutoFilledStart.current) {
      hasAutoFilledStart.current = true;
      const center: [number, number] = [gpsPosition.lng, gpsPosition.lat];
      setStartPoint({ id: 'gps', label: 'Mein Standort', center });
      setStartQuery('Mein Standort');
      // Background reverse geocode — non-blocking
      reverseGeocode(center).then((name) => {
        const short = name.split(',')[0]!;
        setStartQuery(short);
        setStartPoint((prev) => prev ? { ...prev, label: short } : prev);
      });
    }
  }, [gpsPosition, startPoint]);

  // Auto-focus end input when start is set
  useEffect(() => {
    if (startPoint && !endPoint && endInputRef.current) {
      setTimeout(() => endInputRef.current?.focus(), 300);
    }
  }, [startPoint, endPoint]);

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      // Prefer GPS position for proximity, fall back to map center
      const proximity: [number, number] | undefined = gpsPosition
        ? [gpsPosition.lng, gpsPosition.lat]
        : map?.getCenter() ? [map.getCenter().lng, map.getCenter().lat] : undefined;
      const results = await geocodeSearch(query, proximity);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  }, [map, gpsPosition]);

  // Calculate route (with alternatives when no waypoints)
  const calculateRoute = useCallback(async () => {
    if (!startPoint || !endPoint) return;
    setIsCalculating(true);
    setAlternativeRoutes([]);
    clearAlternativeRoutes();

    const hasWaypoints = waypoints.length > 0;

    const fitBounds = (coords: [number, number][]) => {
      if (!map || coords.length === 0) return;
      const bounds = coords.reduce(
        (b, c) => {
          b[0] = [Math.min(b[0][0], c[0]), Math.min(b[0][1], c[1])];
          b[1] = [Math.max(b[1][0], c[0]), Math.max(b[1][1], c[1])];
          return b;
        },
        [[Infinity, Infinity], [-Infinity, -Infinity]] as [[number, number], [number, number]],
      );
      map.fitBounds(bounds, { padding: { top: 120, bottom: 300, left: 40, right: 40 }, duration: 1500 });
    };

    if (!hasWaypoints) {
      // Direct route — fetch with alternatives
      const routes = await fetchRoutes(startPoint.center, endPoint.center);
      if (routes.length > 0) {
        const main = routes[0]!;
        drawRoute(main.coordinates);
        setRouteInfo({ distance: main.distance, duration: main.duration, coordinates: main.coordinates, steps: main.steps });
        setRemainingDistance(main.distance);

        if (routes.length > 1) {
          setAlternativeRoutes(routes.slice(1));
          drawAlternativeRoutes(routes.slice(1).map((r) => getDivergingSegment(r.coordinates, main.coordinates)));
        }

        const arrivalTime = new Date(Date.now() + main.duration * 1000);
        setEta(arrivalTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        fitBounds(routes.flatMap((r) => r.coordinates));
        setView('overview');
      }
    } else {
      // Waypoints — segment-by-segment (no alternatives)
      const points = [startPoint, ...waypoints, endPoint];
      let totalDistance = 0;
      let totalDuration = 0;
      let allCoords: [number, number][] = [];
      let allSteps: RouteStep[] = [];

      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i]!.center;
        const to = points[i + 1]!.center;
        const result = await fetchRoute(from, to);
        if (result) {
          totalDistance += result.distance;
          totalDuration += result.duration;
          allCoords = allCoords.length > 0 ? [...allCoords, ...result.coordinates.slice(1)] : result.coordinates;
          allSteps = [...allSteps, ...result.steps];
        }
      }

      if (allCoords.length > 0) {
        drawRoute(allCoords);
        setRouteInfo({ distance: totalDistance, duration: totalDuration, coordinates: allCoords, steps: allSteps });
        setRemainingDistance(totalDistance);

        const arrivalTime = new Date(Date.now() + totalDuration * 1000);
        setEta(arrivalTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
        fitBounds(allCoords);
        setView('overview');
      }
    }
    setIsCalculating(false);
  }, [startPoint, endPoint, waypoints, fetchRoute, fetchRoutes, drawRoute, drawAlternativeRoutes, clearAlternativeRoutes, map]);

  // Auto-calculate when both points are set
  useEffect(() => {
    if (startPoint && endPoint) calculateRoute();
  }, [startPoint, endPoint, waypoints, calculateRoute]);

  // Fetch speed cameras along route
  useEffect(() => {
    if (!routeInfo) {
      setRouteCameras([]);
      setRouteCameraCount(0);
      return;
    }
    let cancelled = false;
    setIsFetchingCameras(true);
    fetchRouteCameras(routeInfo.coordinates).then((cameras) => {
      if (cancelled) return;
      setRouteCameras(cameras);
      setRouteCameraCount(countCamerasOnRoute(cameras, routeInfo.coordinates));
      setIsFetchingCameras(false);
    });
    return () => { cancelled = true; };
  }, [routeInfo]);

  // Collapse overview panels when user interacts with map, expand after idle
  useEffect(() => {
    if (view !== 'overview' || !map) return;
    const handleMoveStart = () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      setIsMapCollapsed(true);
    };
    const handleIdle = () => {
      collapseTimerRef.current = setTimeout(() => setIsMapCollapsed(false), 1500);
    };
    map.on('movestart', handleMoveStart);
    map.on('idle', handleIdle);
    return () => {
      map.off('movestart', handleMoveStart);
      map.off('idle', handleIdle);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      setIsMapCollapsed(false);
    };
  }, [view, map]);

  // Select an alternative route (swap with main)
  const selectAlternativeRoute = useCallback((altIndex: number) => {
    if (!routeInfo || altIndex >= alternativeRoutes.length) return;
    const selected = alternativeRoutes[altIndex]!;
    const oldMain: RouteResult = {
      coordinates: routeInfo.coordinates,
      duration: routeInfo.duration,
      distance: routeInfo.distance,
      steps: routeInfo.steps,
    };
    const newAlts = [...alternativeRoutes];
    newAlts[altIndex] = oldMain;

    drawRoute(selected.coordinates);
    setRouteInfo({ distance: selected.distance, duration: selected.duration, coordinates: selected.coordinates, steps: selected.steps });
    setRemainingDistance(selected.distance);

    const arrivalTime = new Date(Date.now() + selected.duration * 1000);
    setEta(arrivalTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));

    setAlternativeRoutes(newAlts);
    drawAlternativeRoutes(newAlts.map((r) => getDivergingSegment(r.coordinates, selected.coordinates)));
  }, [routeInfo, alternativeRoutes, drawRoute, drawAlternativeRoutes]);

  // Avoid cameras — select alternative route with fewest cameras
  const handleAvoidCameras = useCallback(() => {
    if (alternativeRoutes.length === 0 || routeCameras.length === 0) return;
    let bestIdx = -1;
    let bestCount = routeCameraCount;
    for (let i = 0; i < alternativeRoutes.length; i++) {
      const count = countCamerasOnRoute(routeCameras, alternativeRoutes[i]!.coordinates);
      if (count < bestCount) {
        bestCount = count;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      selectAlternativeRoute(bestIdx);
    }
  }, [alternativeRoutes, routeCameras, routeCameraCount, selectAlternativeRoute]);

  // Click alternative route on map to select it
  useEffect(() => {
    if (view !== 'overview' || !map || alternativeRoutes.length === 0) return;
    const handlers: { layer: string; fn: () => void }[] = [];
    for (let i = 0; i < alternativeRoutes.length; i++) {
      const layerId = `alt-route-layer-${i}`;
      if (!map.getLayer(layerId)) continue;
      const fn = () => selectAlternativeRoute(i);
      map.on('click', layerId, fn);
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
      handlers.push({ layer: layerId, fn });
    }
    return () => {
      for (const { layer, fn } of handlers) {
        map.off('click', layer, fn);
      }
      map.getCanvas().style.cursor = '';
    };
  }, [view, map, alternativeRoutes, selectAlternativeRoute]);

  // Navigation: track current position against route steps + off-route detection
  useEffect(() => {
    if (view !== 'navigation' || !routeInfo?.steps.length || !gpsPosition) return;

    const userPos: [number, number] = [gpsPosition.lng, gpsPosition.lat];

    // Off-route detection: if > 50m from route polyline for 3+ ticks → reroute
    if (routeInfo.coordinates.length > 1 && !isRerouting && endPoint) {
      const distToRoute = distanceToPolyline(userPos, routeInfo.coordinates);
      if (distToRoute > 50) {
        offRouteCountRef.current += 1;
        if (offRouteCountRef.current >= 3) {
          offRouteCountRef.current = 0;
          setIsRerouting(true);
          fetchRoute(userPos, endPoint.center).then((result) => {
            if (result) {
              drawRoute(result.coordinates);
              setRouteInfo({ distance: result.distance, duration: result.duration, coordinates: result.coordinates, steps: result.steps });
              setRemainingDistance(result.distance);
              setCurrentStepIndex(0);
              const arr = new Date(Date.now() + result.duration * 1000);
              setEta(arr.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
            }
            setIsRerouting(false);
          });
          return;
        }
      } else {
        offRouteCountRef.current = 0;
      }
    }

    let closestIdx = currentStepIndex;
    let closestDist = Infinity;
    for (let i = currentStepIndex; i < routeInfo.steps.length; i++) {
      const step = routeInfo.steps[i]!;
      const dx = (step.coordinate[0] - userPos[0]) * 111320 * Math.cos(userPos[1] * Math.PI / 180);
      const dy = (step.coordinate[1] - userPos[1]) * 110540;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (closestDist < 30 && closestIdx > currentStepIndex) {
      setCurrentStepIndex(closestIdx);
    }

    let remaining = 0;
    for (let i = currentStepIndex; i < routeInfo.steps.length; i++) {
      remaining += routeInfo.steps[i]!.distance;
    }
    setRemainingDistance(remaining);

    let remainTime = 0;
    for (let i = currentStepIndex; i < routeInfo.steps.length; i++) {
      remainTime += routeInfo.steps[i]!.duration;
    }
    const arrivalTime = new Date(Date.now() + remainTime * 1000);
    setEta(arrivalTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));

    // Smooth heading for navigation
    const rawHeading = gpsPosition.heading ?? 0;
    const speed = gpsPosition.speed ?? 0;
    const speedKmh = speed * 3.6;

    if (speedKmh > 5 && rawHeading != null) {
      const prev = smoothNavBearingRef.current;
      let diff = rawHeading - prev;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      let smoothed = prev + diff * 0.35;
      if (smoothed < 0) smoothed += 360;
      if (smoothed >= 360) smoothed -= 360;
      smoothNavBearingRef.current = smoothed;

      let bearingDiff = Math.abs(smoothed - prev);
      if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
      const now = Date.now();
      const elapsed = now - lastNavBearingUpdateRef.current;

      if (bearingDiff > 8 || elapsed > 3000) {
        lastNavBearingUpdateRef.current = now;
        easeTo({ center: userPos, zoom: 17, pitch: 60, bearing: smoothed, duration: 1000 });
      } else {
        easeTo({ center: userPos, duration: 800 });
      }
    } else {
      easeTo({ center: userPos, zoom: 17, pitch: 60, duration: 800 });
    }
  }, [view, gpsPosition, routeInfo, currentStepIndex, easeTo, isRerouting, endPoint, fetchRoute, drawRoute]);

  // Select search result
  const handleSelectResult = useCallback((result: SearchResult) => {
    const wp: RouteWaypoint = { id: result.id, label: result.name, center: result.center };
    if (activeInput === 'start') {
      setStartPoint(wp);
      setStartQuery(result.name);
    } else if (activeInput === 'end') {
      setEndPoint(wp);
      setEndQuery(result.name);
    }
    setSearchResults([]);
    setActiveInput(null);
  }, [activeInput]);

  // Start navigation
  const startNavigation = useCallback(() => {
    setCurrentStepIndex(0);
    setAlternativeRoutes([]);
    clearAlternativeRoutes();
    offRouteCountRef.current = 0;
    setView('navigation');
    if (gpsPosition) {
      flyTo({ center: [gpsPosition.lng, gpsPosition.lat], zoom: 17, pitch: 60, bearing: gpsPosition.heading ?? 0, duration: 1500 });
    }
  }, [gpsPosition, flyTo, clearAlternativeRoutes]);

  // Handle close — single action, resets everything
  const handleClose = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setStartQuery('');
    setEndQuery('');
    setWaypoints([]);
    setRouteInfo(null);
    setAlternativeRoutes([]);
    setIsRerouting(false);
    offRouteCountRef.current = 0;
    setPoiResults([]);
    setSelectedPoiCategory(null);
    setSearchResults([]);
    setView('search');
    setCurrentStepIndex(0);
    hasAutoFilledStart.current = false;
    clearRoute();
    clearAlternativeRoutes();
    flyTo({ pitch: 30, zoom: 14, bearing: 0, duration: 1000 });
    onClose();
  }, [clearRoute, clearAlternativeRoutes, flyTo, onClose]);

  // Search POIs
  const handlePoiSearch = useCallback(async (category: PoiCategory) => {
    setSelectedPoiCategory(category);
    const cat = POI_CATEGORIES.find((c) => c.key === category);
    if (!cat) return;
    const routeCoords = routeInfo?.coordinates ?? [];
    if (routeCoords.length > 0) {
      const mid = routeCoords[Math.floor(routeCoords.length / 2)]!;
      const results = await geocodeSearch(cat.mapboxCategory, mid);
      setPoiResults(results);
    } else {
      const center = map?.getCenter();
      if (center) {
        const results = await geocodeSearch(cat.mapboxCategory, [center.lng, center.lat]);
        setPoiResults(results);
      }
    }
  }, [routeInfo, map]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setSearchResults([]); setActiveInput(null); }
  }, []);

  // Quick-route from saved place
  const handleQuickRoute = useCallback((place: { id: string; name: string; center: [number, number] }) => {
    setEndPoint({ id: place.id, label: place.name, center: place.center });
    setEndQuery(place.name);
  }, []);

  // Save current destination as a place
  const handleSavePlace = useCallback(() => {
    if (!endPoint || !saveName.trim()) return;
    addPlace({
      name: saveName.trim(),
      address: endQuery || endPoint.label,
      center: endPoint.center,
      icon: saveIcon,
      color: saveColor,
    });
    setShowSaveModal(false);
    setSaveName('');
  }, [endPoint, saveName, endQuery, saveIcon, saveColor, addPlace]);

  // Filter saved places matching current query
  const matchingSavedPlaces = activeInput && (activeInput === 'start' ? startQuery : endQuery).length >= 1
    ? savedPlaces.filter((p) => p.name.toLowerCase().includes((activeInput === 'start' ? startQuery : endQuery).toLowerCase()))
    : [];

  if (!isOpen) return null;

  const currentStep = routeInfo?.steps[currentStepIndex];
  const nextStep = routeInfo?.steps[currentStepIndex + 1];

  // ─── Navigation View ────────────────────────────────────────────────────────

  if (view === 'navigation' && routeInfo && currentStep) {
    return (
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Top: Current instruction */}
        <motion.div
          className="absolute top-0 left-0 right-0 pt-safe-top pointer-events-auto"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
        >
          <div className="mx-3 mt-3 bg-ds-surface-2/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div className="flex items-center gap-4 p-4">
              <div className="w-14 h-14 rounded-xl bg-ds-primary/15 flex items-center justify-center text-ds-primary flex-shrink-0">
                <ManeuverIcon maneuver={currentStep.maneuver} modifier={currentStep.modifier} size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ds-primary font-bold uppercase tracking-wider mb-0.5">
                  In {formatStepDistance(currentStep.distance)}
                </div>
                <div className="text-base font-bold text-white leading-snug truncate">
                  {currentStep.instruction || currentStep.name || 'Weiter geradeaus'}
                </div>
                {currentStep.name && currentStep.instruction && (
                  <div className="text-xs text-white/60 truncate mt-0.5">{currentStep.name}</div>
                )}
              </div>
            </div>

            {nextStep && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 border-t border-white/5">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/50 flex-shrink-0">
                  <ManeuverIcon maneuver={nextStep.maneuver} modifier={nextStep.modifier} size={16} />
                </div>
                <span className="text-xs text-white/50 truncate">
                  Danach: {nextStep.instruction || 'Weiter geradeaus'}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Rerouting indicator */}
        {isRerouting && (
          <motion.div
            className="absolute top-[140px] left-0 right-0 pt-safe-top pointer-events-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="mx-3 bg-amber-500/20 backdrop-blur-xl rounded-xl px-4 py-3 flex items-center gap-3 border border-amber-500/20">
              <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm font-medium text-amber-400">Neue Route wird berechnet...</span>
            </div>
          </motion.div>
        )}

        {/* Bottom: Stats + stop */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 pointer-events-auto"
          style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          <div className="mx-3 mb-3 bg-ds-surface-2/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-center">
                <div className="text-xl font-bold text-ds-primary">{formatDistance(remainingDistance)}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Entfernung</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">{formatDuration(routeInfo.duration)}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Fahrzeit</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              {(() => {
                const avgSpeedEstimate = routeInfo.duration > 0 ? (routeInfo.distance / routeInfo.duration) * 3.6 : 50;
                const fuel = calculateFuelCost(remainingDistance, avgSpeedEstimate);
                if (fuel) return (
                  <>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-400">{fuel.cost.toFixed(2)}€</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">Kosten</div>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                  </>
                );
                return null;
              })()}
              <div className="text-center">
                <div className="text-xl font-bold text-ds-success">{eta}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Ankunft</div>
              </div>
            </div>

            <button
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-ds-danger/15 text-ds-danger font-bold text-sm border-t border-white/5 active:bg-ds-danger/25 transition-colors"
              onClick={handleClose}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              Navigation beenden
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Overview View ──────────────────────────────────────────────────────────

  if (view === 'overview' && routeInfo) {
    return (
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Top bar with route summary */}
        <motion.div
          className="absolute top-0 left-0 right-0 pt-safe-top pointer-events-auto"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: isMapCollapsed ? -300 : 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="mx-3 mt-3 bg-ds-surface-2/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-ds-success flex-shrink-0" />
                <span className="text-sm text-white/80 truncate flex-1">{startPoint?.label ?? 'Start'}</span>
                <button
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:bg-white/10 flex-shrink-0"
                  onClick={handleClose}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              {waypoints.map((wp) => (
                <div key={wp.id} className="flex items-center gap-3 pl-1">
                  <div className="w-2 h-2 rounded-sm bg-amber-400 flex-shrink-0" />
                  <span className="text-xs text-white/50 truncate">{wp.label}</span>
                  <button className="text-xs text-ds-danger ml-auto" onClick={() => setWaypoints((p) => p.filter((w) => w.id !== wp.id))}>&#x2715;</button>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-ds-danger flex-shrink-0" />
                <span className="text-sm text-white/80 truncate flex-1">{endPoint?.label ?? 'Ziel'}</span>
                {endPoint && (
                  <button
                    className="text-[10px] text-ds-primary font-medium px-2 py-1 rounded-full bg-ds-primary/10 active:bg-ds-primary/20 flex-shrink-0"
                    onClick={() => { setSaveName(endQuery || endPoint.label); setShowSaveModal(true); }}
                  >
                    Speichern
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-t border-white/5">
              <div>
                <span className="text-lg font-bold text-ds-primary">{formatDistance(routeInfo.distance)}</span>
                <span className="text-xs text-white/40 ml-2">{formatDuration(routeInfo.duration)}</span>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const avgSpeedEstimate = routeInfo.duration > 0 ? (routeInfo.distance / routeInfo.duration) * 3.6 : 50;
                  const fuel = calculateFuelCost(routeInfo.distance, avgSpeedEstimate);
                  if (!fuel) return null;
                  return (
                    <span className="text-sm font-bold text-amber-400">~{fuel.cost.toFixed(2)} €</span>
                  );
                })()}
                <div className="text-sm text-white/50">~{eta}</div>
              </div>
            </div>

            {/* Speed camera info */}
            {(routeCameraCount > 0 || isFetchingCameras) && (
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="var(--color-ds-danger)" />
                  </svg>
                  <span className="text-sm text-white/70">
                    {isFetchingCameras ? 'Blitzer werden geladen…' : `${routeCameraCount} Blitzer auf der Route`}
                  </span>
                </div>
                {routeCameraCount > 0 && alternativeRoutes.length > 0 && (
                  <button
                    className="text-[10px] text-ds-primary font-medium px-2.5 py-1 rounded-full bg-ds-primary/10 active:bg-ds-primary/20"
                    onClick={handleAvoidCameras}
                  >
                    Umfahren
                  </button>
                )}
              </div>
            )}

            {/* Alternative routes */}
            {alternativeRoutes.length > 0 && (
              <div className="border-t border-white/5">
                <div className="px-4 py-1.5 text-[10px] text-white/30 uppercase tracking-wider font-semibold">Alternative Routen</div>
                {alternativeRoutes.map((alt, i) => {
                  const timeDiff = alt.duration - routeInfo.duration;
                  const diffLabel = Math.abs(timeDiff) < 60
                    ? 'gleich'
                    : timeDiff > 0
                      ? `+${formatDuration(timeDiff)}`
                      : `${formatDuration(Math.abs(timeDiff))} schneller`;
                  const altCameraCount = routeCameras.length > 0 ? countCamerasOnRoute(routeCameras, alt.coordinates) : 0;
                  return (
                    <button
                      key={i}
                      className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-white/5 active:bg-white/5 transition-colors"
                      onClick={() => selectAlternativeRoute(i)}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ALT_ROUTE_COLORS[i] ?? '#888' }} />
                      <div className="flex-1 text-left">
                        <span className="text-sm text-white/70">{formatDistance(alt.distance)}</span>
                        <span className="text-xs text-white/40 ml-2">{formatDuration(alt.duration)}</span>
                      </div>
                      {altCameraCount > 0 && (
                        <span className="text-[10px] text-ds-danger/70 font-medium flex items-center gap-0.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /></svg>
                          {altCameraCount}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        timeDiff > 60 ? 'text-amber-400 bg-amber-400/10' : timeDiff < -60 ? 'text-emerald-400 bg-emerald-400/10' : 'text-white/50 bg-white/5'
                      }`}>
                        {diffLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto no-scrollbar border-t border-white/5">
              {POI_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    selectedPoiCategory === cat.key ? 'bg-ds-primary/20 text-ds-primary' : 'bg-white/5 text-white/50'
                  }`}
                  onClick={() => handlePoiSearch(cat.key)}
                >
                  <span>{cat.icon}</span>{cat.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Compact floating stats bar — visible when panels are collapsed */}
        <AnimatePresence>
          {isMapCollapsed && (
            <motion.div
              className="absolute top-0 left-0 right-0 pt-safe-top pointer-events-auto"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="mx-3 mt-3 flex items-center justify-between bg-ds-surface-2/90 backdrop-blur-xl rounded-xl px-4 py-2.5 shadow-2xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ds-primary">{formatDistance(routeInfo.distance)}</span>
                  <span className="text-xs text-white/40">{formatDuration(routeInfo.duration)}</span>
                  {routeCameraCount > 0 && (
                    <span className="text-[10px] text-ds-danger flex items-center gap-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /></svg>
                      {routeCameraCount}
                    </span>
                  )}
                </div>
                <button
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:bg-white/10"
                  onClick={() => setIsMapCollapsed(false)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* POI results overlay */}
        <AnimatePresence>
          {poiResults.length > 0 && !isMapCollapsed && (
            <motion.div
              className="absolute top-[250px] left-3 right-3 z-40 pointer-events-auto bg-ds-surface-2/95 backdrop-blur-xl rounded-2xl overflow-hidden max-h-48 overflow-y-auto shadow-2xl border border-white/5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="text-xs font-semibold text-white/40 uppercase">{POI_CATEGORIES.find((c) => c.key === selectedPoiCategory)?.label}</span>
                <button className="text-xs text-white/30 p-1" onClick={() => { setPoiResults([]); setSelectedPoiCategory(null); }}>&#x2715;</button>
              </div>
              {poiResults.map((poi, i) => (
                <button
                  key={poi.id || `poi-${i}`}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-white/5 last:border-0 active:bg-white/5"
                  onClick={() => {
                    setWaypoints((prev) => [...prev, { id: poi.id, label: poi.name, center: poi.center }]);
                    setPoiResults([]);
                    flyTo({ center: poi.center, zoom: 15, duration: 1000 });
                  }}
                >
                  <span className="text-base">{POI_CATEGORIES.find((c) => c.key === selectedPoiCategory)?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">{poi.name}</div>
                    <div className="text-[11px] text-white/30 truncate">{poi.address}</div>
                  </div>
                  <span className="text-[10px] text-ds-primary font-medium">+ Stopp</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: Step list + navigation start */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 pointer-events-auto"
          style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: isMapCollapsed ? 200 : 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="mx-3 mb-3 bg-ds-surface-2/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div className="max-h-36 overflow-y-auto">
              {routeInfo.steps.filter((s) => s.instruction).slice(0, 8).map((step, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 flex-shrink-0">
                    <ManeuverIcon maneuver={step.maneuver} modifier={step.modifier} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">{step.instruction}</div>
                    {step.name && <div className="text-[11px] text-white/30 truncate">{step.name}</div>}
                  </div>
                  <span className="text-xs text-white/30 flex-shrink-0">{formatStepDistance(step.distance)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 p-3 border-t border-white/5">
              <button
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-medium active:bg-white/10 transition-colors"
                onClick={handleClose}
              >
                Abbrechen
              </button>
              <button
                className="flex-[2] py-3 rounded-xl bg-ds-primary text-ds-bg text-sm font-bold active:opacity-80 transition-opacity flex items-center justify-center gap-2"
                onClick={startNavigation}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="3,12 22,2 12,22 10,14" /></svg>
                Los geht's
              </button>
            </div>
          </div>
        </motion.div>

        {/* Floating "Los geht's" button when collapsed */}
        <AnimatePresence>
          {isMapCollapsed && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 pointer-events-auto"
              style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="mx-3 mb-3 flex gap-2">
                <button
                  className="flex-1 py-3 rounded-xl bg-ds-surface-2/90 backdrop-blur-xl text-white/60 text-sm font-medium active:bg-ds-surface-2 transition-colors shadow-2xl border border-white/5"
                  onClick={handleClose}
                >
                  Abbrechen
                </button>
                <button
                  className="flex-[2] py-3 rounded-xl bg-ds-primary text-ds-bg text-sm font-bold active:opacity-80 transition-opacity flex items-center justify-center gap-2 shadow-2xl"
                  onClick={startNavigation}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="3,12 22,2 12,22 10,14" /></svg>
                  Los geht's
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save place modal (overview) */}
        <AnimatePresence>
          {showSaveModal && endPoint && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
            >
              <motion.div
                className="w-[85%] max-w-sm bg-ds-surface rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white">Ort speichern</h3>
                  <p className="text-[11px] text-white/40 mt-0.5 truncate">{endPoint.label}</p>
                </div>
                <div className="p-4 space-y-4">
                  <input
                    className="w-full bg-ds-surface-2 rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-ds-primary/50 placeholder:text-white/30"
                    placeholder="Name..."
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    autoFocus
                  />
                  <div>
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 block">Icon</span>
                    <div className="grid grid-cols-6 gap-2">
                      {PLACE_ICONS.map((pi) => (
                        <button
                          key={pi.key}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${saveIcon === pi.key ? 'bg-ds-primary/20 border border-ds-primary/40 scale-110' : 'bg-white/5 border border-transparent'}`}
                          onClick={() => setSaveIcon(pi.key)}
                          title={pi.label}
                        >
                          <PlaceIcon icon={pi.key} size={18} color={saveIcon === pi.key ? saveColor : '#ffffff80'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 block">Farbe</span>
                    <div className="flex flex-wrap gap-2">
                      {PLACE_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`w-8 h-8 rounded-full transition-all ${saveColor === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setSaveColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t border-white/5">
                  <button className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-medium active:bg-white/10" onClick={() => setShowSaveModal(false)}>
                    Abbrechen
                  </button>
                  <button
                    className="flex-1 py-2.5 rounded-xl bg-ds-primary text-ds-bg text-sm font-bold disabled:opacity-30 active:opacity-80"
                    disabled={!saveName.trim()}
                    onClick={handleSavePlace}
                  >
                    Speichern
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Search View (default) ────────────────────────────────────────────────

  return (
    <motion.div
      className="absolute top-0 left-0 right-0 z-30 pt-safe-top pointer-events-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="mx-3 mt-3 space-y-2">
        {/* Search card */}
        <div className="bg-ds-surface-2/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
          {/* Header with close */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Route planen</span>
            <button
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:bg-white/10 active:text-white/70 transition-colors"
              onClick={handleClose}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Start input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-ds-success flex-shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <input
              type="text"
              placeholder="Startpunkt..."
              className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-white/30"
              value={startQuery}
              onChange={(e) => { setStartQuery(e.target.value); setActiveInput('start'); handleSearch(e.target.value); }}
              onFocus={() => setActiveInput('start')}
              onKeyDown={handleKeyDown}
            />
            {!startPoint && (
              <button
                className="text-[11px] text-ds-primary font-bold px-2.5 py-1 rounded-full bg-ds-primary/10 active:bg-ds-primary/20"
                onClick={() => {
                  if (gpsPosition) {
                    const center: [number, number] = [gpsPosition.lng, gpsPosition.lat];
                    setStartPoint({ id: 'gps', label: 'Mein Standort', center });
                    setStartQuery('Mein Standort');
                  }
                }}
              >
                GPS
              </button>
            )}
            {startPoint && (
              <button className="text-xs text-white/30 p-1" onClick={() => { setStartPoint(null); setStartQuery(''); }}>&#x2715;</button>
            )}
          </div>

          {/* Connector line */}
          <div className="pl-[26px] py-0">
            <div className="w-px h-3 bg-white/10 ml-px" />
          </div>

          {/* Waypoints */}
          {waypoints.map((wp) => (
            <div key={wp.id} className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
              <div className="w-2.5 h-2.5 rounded-[3px] bg-amber-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-white/60 truncate">{wp.label}</span>
              <button className="text-xs text-ds-danger p-1" onClick={() => setWaypoints((p) => p.filter((w) => w.id !== wp.id))}>&#x2715;</button>
            </div>
          ))}

          {/* End input */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-3 h-3 rounded-full bg-ds-danger flex-shrink-0 shadow-[0_0_8px_rgba(255,51,85,0.4)]" />
            <input
              ref={endInputRef}
              type="text"
              placeholder="Wohin möchtest du?"
              className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-white/30"
              value={endQuery}
              onChange={(e) => { setEndQuery(e.target.value); setActiveInput('end'); handleSearch(e.target.value); }}
              onFocus={() => setActiveInput('end')}
              onKeyDown={handleKeyDown}
            />
            {endPoint && (
              <button className="text-xs text-white/30 p-1" onClick={() => { setEndPoint(null); setEndQuery(''); setRouteInfo(null); clearRoute(); }}>&#x2715;</button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/5">
            {routeInfo && (
              <button className="text-[11px] text-amber-400 font-medium px-3 py-1.5 rounded-full bg-amber-400/10 active:bg-amber-400/20" onClick={() => setActiveInput('end')}>
                + Zwischenstopp
              </button>
            )}
            {endPoint && (
              <button
                className="text-[11px] text-ds-primary font-medium px-3 py-1.5 rounded-full bg-ds-primary/10 active:bg-ds-primary/20"
                onClick={() => { setSaveName(endQuery || endPoint.label); setShowSaveModal(true); }}
              >
                Ort speichern
              </button>
            )}
            {isCalculating && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-3.5 h-3.5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
                Route wird berechnet...
              </div>
            )}
          </div>
        </div>

        {/* Saved places quick-route buttons — show when no query text */}
        {savedPlaces.length > 0 && !endQuery && !routeInfo && (
          <div className="bg-ds-surface-2/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Gespeicherte Orte</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedPlaces.map((place) => (
                <button
                  key={place.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 active:bg-white/10 transition-colors border border-white/5"
                  onClick={() => handleQuickRoute(place)}
                  onContextMenu={(e) => { e.preventDefault(); removePlace(place.id); }}
                >
                  <PlaceIcon icon={place.icon} size={16} color={place.color} />
                  <span className="text-xs text-white/70 font-medium">{place.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        <AnimatePresence>
          {(searchResults.length > 0 || matchingSavedPlaces.length > 0 || isSearching) && activeInput && (
            <motion.div
              className="bg-ds-surface-2/95 backdrop-blur-xl rounded-2xl overflow-hidden max-h-64 overflow-y-auto shadow-2xl border border-white/5"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              style={{ transformOrigin: 'top' }}
            >
              {/* Matching saved places */}
              {matchingSavedPlaces.map((place) => (
                <button
                  key={`saved-${place.id}`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/5 active:bg-white/5 transition-colors"
                  onClick={() => handleSelectResult({ id: place.id, name: place.name, address: place.address, center: place.center })}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <PlaceIcon icon={place.icon} size={18} color={place.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate">{place.name}</div>
                    <div className="text-[11px] text-white/30 truncate">{place.address}</div>
                  </div>
                  <span className="text-[9px] text-ds-primary bg-ds-primary/10 rounded-full px-2 py-0.5 flex-shrink-0">Gespeichert</span>
                </button>
              ))}
              {isSearching && searchResults.length === 0 && matchingSavedPlaces.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-4 text-sm text-white/30">
                  <div className="w-4 h-4 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
                  Suche...
                </div>
              )}
              {searchResults.map((result, i) => (
                <button
                  key={result.id || `sr-${i}`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/5 last:border-0 active:bg-white/5 transition-colors"
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-sm flex-shrink-0">
                    {getResultIcon(result.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate">{result.name}</div>
                    <div className="text-[11px] text-white/30 truncate">{result.address}</div>
                  </div>
                  {result.category && (
                    <span className="text-[9px] text-white/25 bg-white/5 rounded-full px-2 py-0.5 flex-shrink-0">{result.category}</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save place modal */}
      <AnimatePresence>
        {showSaveModal && endPoint && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              className="w-[85%] max-w-sm bg-ds-surface rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Ort speichern</h3>
                <p className="text-[11px] text-white/40 mt-0.5 truncate">{endPoint.label}</p>
              </div>
              <div className="p-4 space-y-4">
                <input
                  className="w-full bg-ds-surface-2 rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-ds-primary/50 placeholder:text-white/30"
                  placeholder="Name..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  autoFocus
                />
                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 block">Icon</span>
                  <div className="grid grid-cols-6 gap-2">
                    {PLACE_ICONS.map((pi) => (
                      <button
                        key={pi.key}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${saveIcon === pi.key ? 'bg-ds-primary/20 border border-ds-primary/40 scale-110' : 'bg-white/5 border border-transparent'}`}
                        onClick={() => setSaveIcon(pi.key)}
                        title={pi.label}
                      >
                        <PlaceIcon icon={pi.key} size={18} color={saveIcon === pi.key ? saveColor : '#ffffff80'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 block">Farbe</span>
                  <div className="flex flex-wrap gap-2">
                    {PLACE_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-8 h-8 rounded-full transition-all ${saveColor === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setSaveColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 p-4 border-t border-white/5">
                <button className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-medium active:bg-white/10" onClick={() => setShowSaveModal(false)}>
                  Abbrechen
                </button>
                <button
                  className="flex-1 py-2.5 rounded-xl bg-ds-primary text-ds-bg text-sm font-bold disabled:opacity-30 active:opacity-80"
                  disabled={!saveName.trim()}
                  onClick={handleSavePlace}
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
