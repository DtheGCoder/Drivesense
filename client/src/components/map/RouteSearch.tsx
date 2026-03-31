import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMap, type RouteStep } from '@/components/map/MapProvider';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProfileStore } from '@/stores/profileStore';

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
  if (!MAPBOX_TOKEN || query.length < 2) return [];
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: '8',
      language: 'de',
      country: 'de,at,ch',
      types: 'address,poi,place,locality,neighborhood',
    });
    if (proximity) params.set('proximity', `${proximity[0]},${proximity[1]}`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features ?? []).map((f: Record<string, unknown>) => ({
      id: f.id as string,
      name: (f.text ?? f.place_name) as string,
      address: (f.place_name ?? '') as string,
      center: f.center as [number, number],
      category: ((f.properties as Record<string, unknown>)?.category as string) ?? undefined,
    }));
  } catch {
    return [];
  }
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

interface RouteSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RouteSearch({ isOpen, onClose }: RouteSearchProps) {
  const { flyTo, drawRoute, clearRoute, fetchRoute, map } = useMap();
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

  // POI
  const [poiResults, setPoiResults] = useState<SearchResult[]>([]);
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<PoiCategory | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const endInputRef = useRef<HTMLInputElement>(null);

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
      const center = map?.getCenter();
      const proximity: [number, number] | undefined = center ? [center.lng, center.lat] : undefined;
      const results = await geocodeSearch(query, proximity);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  }, [map]);

  // Calculate route
  const calculateRoute = useCallback(async () => {
    if (!startPoint || !endPoint) return;
    setIsCalculating(true);

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
      const info: RouteInfo = { distance: totalDistance, duration: totalDuration, coordinates: allCoords, steps: allSteps };
      setRouteInfo(info);
      setRemainingDistance(totalDistance);

      const arrivalTime = new Date(Date.now() + totalDuration * 1000);
      setEta(arrivalTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));

      if (map) {
        const bounds = allCoords.reduce(
          (b, c) => {
            b[0] = [Math.min(b[0][0], c[0]), Math.min(b[0][1], c[1])];
            b[1] = [Math.max(b[1][0], c[0]), Math.max(b[1][1], c[1])];
            return b;
          },
          [[Infinity, Infinity], [-Infinity, -Infinity]] as [[number, number], [number, number]],
        );
        map.fitBounds(bounds, { padding: { top: 120, bottom: 300, left: 40, right: 40 }, duration: 1500 });
      }
      setView('overview');
    }
    setIsCalculating(false);
  }, [startPoint, endPoint, waypoints, fetchRoute, drawRoute, map]);

  // Auto-calculate when both points are set
  useEffect(() => {
    if (startPoint && endPoint) calculateRoute();
  }, [startPoint, endPoint, waypoints, calculateRoute]);

  // Navigation: track current position against route steps
  useEffect(() => {
    if (view !== 'navigation' || !routeInfo?.steps.length || !gpsPosition) return;

    const userPos: [number, number] = [gpsPosition.lng, gpsPosition.lat];

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

    flyTo({ center: userPos, zoom: 17, pitch: 60, bearing: gpsPosition.heading ?? 0, duration: 800 });
  }, [view, gpsPosition, routeInfo, currentStepIndex, flyTo]);

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
    setView('navigation');
    if (gpsPosition) {
      flyTo({ center: [gpsPosition.lng, gpsPosition.lat], zoom: 17, pitch: 60, bearing: gpsPosition.heading ?? 0, duration: 1500 });
    }
  }, [gpsPosition, flyTo]);

  // Stop navigation
  const stopNavigation = useCallback(() => {
    setView('overview');
    flyTo({ pitch: 30, zoom: 14, bearing: 0, duration: 1000 });
  }, [flyTo]);

  // Handle close — single action, resets everything
  const handleClose = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setStartQuery('');
    setEndQuery('');
    setWaypoints([]);
    setRouteInfo(null);
    setPoiResults([]);
    setSelectedPoiCategory(null);
    setSearchResults([]);
    setView('search');
    setCurrentStepIndex(0);
    hasAutoFilledStart.current = false;
    clearRoute();
    onClose();
  }, [clearRoute, onClose]);

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
          <div className="mx-3 mt-3 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
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

        {/* Bottom: Stats + stop */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 pointer-events-auto"
          style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          <div className="mx-3 mb-3 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
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
              onClick={() => { stopNavigation(); handleClose(); }}
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
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="mx-3 mt-3 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
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
                <span className="text-sm text-white/80 truncate">{endPoint?.label ?? 'Ziel'}</span>
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

        {/* POI results overlay */}
        <AnimatePresence>
          {poiResults.length > 0 && (
            <motion.div
              className="absolute top-[250px] left-3 right-3 z-40 pointer-events-auto bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl overflow-hidden max-h-48 overflow-y-auto shadow-2xl border border-white/5"
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
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="mx-3 mb-3 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
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
      </div>
    );
  }

  // ─── Search View (default) ────────────────────────────────────────────────

  return (
    <motion.div
      className="absolute top-0 left-0 right-0 z-30 pt-safe-top"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="mx-3 mt-3 space-y-2">
        {/* Search card */}
        <div className="bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/5">
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
            {isCalculating && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-3.5 h-3.5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
                Route wird berechnet...
              </div>
            )}
          </div>
        </div>

        {/* Search results */}
        <AnimatePresence>
          {(searchResults.length > 0 || isSearching) && activeInput && (
            <motion.div
              className="bg-[#1a1a2e]/95 backdrop-blur-xl rounded-2xl overflow-hidden max-h-64 overflow-y-auto shadow-2xl border border-white/5"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              style={{ transformOrigin: 'top' }}
            >
              {isSearching && searchResults.length === 0 && (
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
    </motion.div>
  );
}
