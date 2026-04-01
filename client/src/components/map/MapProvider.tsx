import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_DARK_STYLE } from './mapStyle';

// ─── Token Setup ─────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

// ─── Singleton map container (survives React StrictMode double-invoke) ───────

let singletonMap: mapboxgl.Map | null = null;
let singletonContainer: HTMLDivElement | null = null;
let mapLoadedResolve: (() => void) | null = null;
const mapLoadedPromise = new Promise<void>((resolve) => { mapLoadedResolve = resolve; });

function getOrCreateContainer(): HTMLDivElement {
  if (singletonContainer) return singletonContainer;
  const el = document.createElement('div');
  el.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;';
  singletonContainer = el;
  return el;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
  modifier: string;
  coordinate: [number, number];
  name: string;
}

export interface RouteResult {
  coordinates: [number, number][];
  duration: number;
  distance: number;
  steps: RouteStep[];
  maxspeeds?: (number | null)[];
}

interface MapContextValue {
  map: mapboxgl.Map | null;
  loaded: boolean;
  hasToken: boolean;
  flyTo: (opts: { center?: [number, number]; zoom?: number; pitch?: number; bearing?: number; duration?: number }) => void;
  easeTo: (opts: { center?: [number, number]; zoom?: number; pitch?: number; bearing?: number; duration?: number }) => void;
  drawRoute: (coordinates: [number, number][]) => void;
  clearRoute: () => void;
  drawAlternativeRoutes: (routes: [number, number][][]) => void;
  clearAlternativeRoutes: () => void;
  drawBreadcrumb: (coordinates: [number, number][]) => void;
  clearBreadcrumb: () => void;
  fetchRoute: (from: [number, number], to: [number, number]) => Promise<RouteResult | null>;
  fetchRoutes: (from: [number, number], to: [number, number]) => Promise<RouteResult[]>;
  addUserRoute: (userId: string, coordinates: [number, number][], color: string) => void;
  removeUserRoute: (userId: string) => void;
  clearAllUserRoutes: () => void;
  setInteractive: (enabled: boolean) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export function useMap() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMap must be used within MapProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [8.6821, 50.1109]; // Frankfurt
const ROUTE_SOURCE_ID = 'route-source';
const ROUTE_LAYER_ID = 'route-layer';
const ROUTE_OUTLINE_LAYER_ID = 'route-outline-layer';
const ALT_ROUTE_COLORS = ['#6366f1', '#f59e0b']; // indigo, amber for alt routes
const MAX_ALT_ROUTES = 2;
const BREADCRUMB_SOURCE_ID = 'breadcrumb-source';
const BREADCRUMB_LAYER_ID = 'breadcrumb-layer';
const BREADCRUMB_OUTLINE_LAYER_ID = 'breadcrumb-outline-layer';

export function MapProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(!!singletonMap?.isStyleLoaded());
  const hasToken = !!MAPBOX_TOKEN;

  // Initialize map once — survives StrictMode double-invoke
  useEffect(() => {
    if (singletonMap || !hasToken) {
      // Map already exists — just wait for load if needed
      if (singletonMap && !loaded) {
        mapLoadedPromise.then(() => setLoaded(true));
      }
      return;
    }

    const container = getOrCreateContainer();

    // Disable Mapbox telemetry to prevent ERR_BLOCKED_BY_CLIENT from ad blockers
    (mapboxgl as Record<string, unknown>).config = {
      ...(mapboxgl as Record<string, unknown>).config as object,
      EVENTS_URL: '',
    };

    const map = new mapboxgl.Map({
      container,
      style: MAPBOX_DARK_STYLE,
      center: DEFAULT_CENTER,
      zoom: 14,
      pitch: 40,
      bearing: -15,
      interactive: true,
      antialias: true,
      attributionControl: true,
      logoPosition: 'bottom-right',
      maxPitch: 70,
      fadeDuration: 200,
      collectResourceTiming: false,
    });

    singletonMap = map;

    map.on('load', () => {
      // 3D buildings
      const layers = map.getStyle().layers;
      let labelLayerId: string | undefined;
      if (layers) {
        for (const layer of layers) {
          if (layer.type === 'symbol' && (layer.layout as Record<string, unknown>)?.['text-field']) {
            labelLayerId = layer.id;
            break;
          }
        }
      }

      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#14141e',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 16, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 16, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.5,
          },
        },
        labelLayerId,
      );

      // Route source (empty initially)
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });

      // Route outline (glow)
      map.addLayer({
        id: ROUTE_OUTLINE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00f0ff',
          'line-width': 10,
          'line-opacity': 0.15,
          'line-blur': 6,
        },
      });

      // Route line
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00f0ff',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });

      // Alternative route sources + layers (drawn BEFORE main route so main is on top)
      for (let i = 0; i < MAX_ALT_ROUTES; i++) {
        map.addSource(`alt-route-source-${i}`, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
        });
        // Invisible wide hitbox for easier tap/click
        map.addLayer({
          id: `alt-route-hitbox-${i}`,
          type: 'line',
          source: `alt-route-source-${i}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#000', 'line-width': 30, 'line-opacity': 0 },
        });
        map.addLayer({
          id: `alt-route-outline-${i}`,
          type: 'line',
          source: `alt-route-source-${i}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ALT_ROUTE_COLORS[i]!, 'line-width': 8, 'line-opacity': 0.1, 'line-blur': 6 },
        });
        map.addLayer({
          id: `alt-route-layer-${i}`,
          type: 'line',
          source: `alt-route-source-${i}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ALT_ROUTE_COLORS[i]!, 'line-width': 4, 'line-opacity': 0.45, 'line-dasharray': [2, 2] },
        });
      }

      // Breadcrumb trail source (recording, separate from planned route)
      map.addSource(BREADCRUMB_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });

      // Breadcrumb glow
      map.addLayer({
        id: BREADCRUMB_OUTLINE_LAYER_ID,
        type: 'line',
        source: BREADCRUMB_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#a855f7',
          'line-width': 10,
          'line-opacity': 0.15,
          'line-blur': 6,
        },
      });

      // Breadcrumb line
      map.addLayer({
        id: BREADCRUMB_LAYER_ID,
        type: 'line',
        source: BREADCRUMB_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#a855f7',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });

      // Geolocate control
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
          showAccuracyCircle: false,
        }),
        'top-right',
      );

      setLoaded(true);
      mapLoadedResolve?.();
    });

    // Do NOT destroy in cleanup — singleton survives StrictMode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flyTo = useCallback((opts: { center?: [number, number]; zoom?: number; pitch?: number; bearing?: number; duration?: number }) => {
    singletonMap?.flyTo({
      ...opts,
      essential: true,
      duration: opts.duration ?? 1500,
    });
  }, []);

  const easeTo = useCallback((opts: { center?: [number, number]; zoom?: number; pitch?: number; bearing?: number; duration?: number }) => {
    singletonMap?.easeTo({
      ...opts,
      essential: true,
      duration: opts.duration ?? 800,
    });
  }, []);

  const drawRoute = useCallback((coordinates: [number, number][]) => {
    const source = singletonMap?.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    });
  }, []);

  const clearRoute = useCallback(() => {
    drawRoute([]);
  }, [drawRoute]);

  const drawBreadcrumb = useCallback((coordinates: [number, number][]) => {
    const source = singletonMap?.getSource(BREADCRUMB_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    });
  }, []);

  const clearBreadcrumb = useCallback(() => {
    drawBreadcrumb([]);
  }, [drawBreadcrumb]);

  const drawAlternativeRoutes = useCallback((routes: [number, number][][]) => {
    for (let i = 0; i < MAX_ALT_ROUTES; i++) {
      const source = singletonMap?.getSource(`alt-route-source-${i}`) as mapboxgl.GeoJSONSource | undefined;
      if (!source) continue;
      const coords = routes[i] ?? [];
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      });
    }
  }, []);

  const clearAlternativeRoutes = useCallback(() => {
    drawAlternativeRoutes([]);
  }, [drawAlternativeRoutes]);

  const fetchRoute = useCallback(async (from: [number, number], to: [number, number]): Promise<RouteResult | null> => {
    if (!MAPBOX_TOKEN) return null;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&overview=full&steps=true&banner_instructions=true&annotations=maxspeed&language=de&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const route = data.routes?.[0];
      if (!route) return null;
      const steps: RouteStep[] = (route.legs ?? []).flatMap((leg: Record<string, unknown>) =>
        ((leg.steps as unknown[]) ?? []).map((s) => {
          const step = s as Record<string, unknown>;
          return ({
          instruction: ((step.maneuver as Record<string, unknown>)?.instruction as string) ?? '',
          distance: (step.distance as number) ?? 0,
          duration: (step.duration as number) ?? 0,
          maneuver: ((step.maneuver as Record<string, unknown>)?.type as string) ?? '',
          modifier: ((step.maneuver as Record<string, unknown>)?.modifier as string) ?? '',
          coordinate: ((step.maneuver as Record<string, unknown>)?.location as [number, number]) ?? [0, 0],
          name: (step.name as string) ?? '',
        });
        })
      );
      // Parse maxspeed annotations (one per coordinate pair in each leg)
      const maxspeeds: (number | null)[] = (route.legs ?? []).flatMap((leg: Record<string, unknown>) => {
        const annotation = leg.annotation as Record<string, unknown> | undefined;
        const speeds = annotation?.maxspeed as { speed: number; unit: string; unknown?: boolean }[] | undefined;
        if (!speeds) return [];
        return speeds.map((s) => s.unknown ? null : (s.unit === 'mph' ? Math.round(s.speed * 1.60934) : s.speed));
      });
      return {
        coordinates: route.geometry.coordinates as [number, number][],
        duration: route.duration as number,
        distance: route.distance as number,
        steps,
        maxspeeds: maxspeeds.length > 0 ? maxspeeds : undefined,
      };
    } catch {
      return null;
    }
  }, []);

  // Fetch multiple routes (with alternatives)
  const parseRoute = (route: Record<string, unknown>): RouteResult => {
    const steps: RouteStep[] = ((route.legs as unknown[]) ?? []).flatMap((leg: unknown) => {
      const l = leg as Record<string, unknown>;
      return ((l.steps as unknown[]) ?? []).map((s) => {
        const step = s as Record<string, unknown>;
        return {
          instruction: ((step.maneuver as Record<string, unknown>)?.instruction as string) ?? '',
          distance: (step.distance as number) ?? 0,
          duration: (step.duration as number) ?? 0,
          maneuver: ((step.maneuver as Record<string, unknown>)?.type as string) ?? '',
          modifier: ((step.maneuver as Record<string, unknown>)?.modifier as string) ?? '',
          coordinate: ((step.maneuver as Record<string, unknown>)?.location as [number, number]) ?? [0, 0],
          name: (step.name as string) ?? '',
        };
      });
    });
    const maxspeeds: (number | null)[] = ((route.legs as unknown[]) ?? []).flatMap((leg: unknown) => {
      const l = leg as Record<string, unknown>;
      const annotation = l.annotation as Record<string, unknown> | undefined;
      const speeds = annotation?.maxspeed as { speed: number; unit: string; unknown?: boolean }[] | undefined;
      if (!speeds) return [];
      return speeds.map((s) => s.unknown ? null : (s.unit === 'mph' ? Math.round(s.speed * 1.60934) : s.speed));
    });
    return {
      coordinates: (route.geometry as Record<string, unknown>).coordinates as [number, number][],
      duration: route.duration as number,
      distance: route.distance as number,
      steps,
      maxspeeds: maxspeeds.length > 0 ? maxspeeds : undefined,
    };
  };

  const fetchRoutes = useCallback(async (from: [number, number], to: [number, number]): Promise<RouteResult[]> => {
    if (!MAPBOX_TOKEN) return [];
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&overview=full&steps=true&alternatives=true&banner_instructions=true&annotations=maxspeed&language=de&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const routes = data.routes as Record<string, unknown>[] | undefined;
      if (!routes?.length) return [];
      return routes.map(parseRoute);
    } catch {
      return [];
    }
  }, []);

  // Track user route source/layer IDs for cleanup
  const userRouteLayers = useRef<Set<string>>(new Set());

  const addUserRoute = useCallback((userId: string, coordinates: [number, number][], color: string) => {
    const map = singletonMap;
    if (!map || !map.isStyleLoaded()) return;
    const sourceId = `user-route-${userId}`;
    const layerId = `user-route-layer-${userId}`;
    const glowId = `user-route-glow-${userId}`;

    const geojson: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    };

    // Update existing or create new
    const existing = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
      map.setPaintProperty(layerId, 'line-color', color);
      map.setPaintProperty(glowId, 'line-color', color);
      return;
    }

    map.addSource(sourceId, { type: 'geojson', data: geojson });

    map.addLayer({
      id: glowId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': 10, 'line-opacity': 0.12, 'line-blur': 6 },
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': 3.5, 'line-opacity': 0.85 },
    });

    userRouteLayers.current.add(userId);
  }, []);

  const removeUserRoute = useCallback((userId: string) => {
    const map = singletonMap;
    if (!map) return;
    const sourceId = `user-route-${userId}`;
    const layerId = `user-route-layer-${userId}`;
    const glowId = `user-route-glow-${userId}`;

    if (map.getLayer(glowId)) map.removeLayer(glowId);
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    userRouteLayers.current.delete(userId);
  }, []);

  const clearAllUserRoutes = useCallback(() => {
    for (const userId of userRouteLayers.current) {
      removeUserRoute(userId);
    }
  }, [removeUserRoute]);

  const setInteractive = useCallback((enabled: boolean) => {
    const map = singletonMap;
    if (!map) return;
    const action = enabled ? 'enable' : 'disable';
    map.boxZoom[action]();
    map.scrollZoom[action]();
    map.dragPan[action]();
    map.dragRotate[action]();
    map.keyboard[action]();
    map.doubleClickZoom[action]();
    map.touchZoomRotate[action]();
    map.touchPitch[action]();
  }, []);

  return (
    <MapContext.Provider value={{ map: singletonMap, loaded, hasToken, flyTo, easeTo, drawRoute, clearRoute, drawAlternativeRoutes, clearAlternativeRoutes, drawBreadcrumb, clearBreadcrumb, fetchRoute, fetchRoutes, addUserRoute, removeUserRoute, clearAllUserRoutes, setInteractive }}>
      {children}
    </MapContext.Provider>
  );
}

// ─── Persistent Map Canvas (renders ONCE in Layout — do NOT duplicate) ───────

export function PersistentMapCanvas() {
  const { hasToken } = useMap();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const attached = useRef(false);

  // Attach the singleton container div into the DOM
  useEffect(() => {
    if (!hasToken || attached.current || !wrapperRef.current) return;
    const container = getOrCreateContainer();
    wrapperRef.current.appendChild(container);
    attached.current = true;

    // If the map already exists, tell it the container resized
    if (singletonMap) {
      setTimeout(() => singletonMap?.resize(), 0);
    }

    return () => {
      // Don't remove the container — just detach flag so it can reattach
      attached.current = false;
    };
  }, [hasToken]);

  return (
    <div className="fixed inset-0 z-0">
      {hasToken ? (
        <div ref={wrapperRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full bg-ds-surface overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,240,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,240,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-ds-primary/5 blur-[120px]" />
        </div>
      )}
    </div>
  );
}
