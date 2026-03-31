import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_DARK_STYLE } from './mapStyle';

// Token should come from env in production
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface MapViewProps {
  className?: string;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
  interactive?: boolean;
  followUser?: boolean;
  showUserLocation?: boolean;
  show3DBuildings?: boolean;
  onMapReady?: (map: mapboxgl.Map) => void;
  onMove?: (center: { lng: number; lat: number }, zoom: number) => void;
}

export function MapView({
  className = '',
  center = [10.0, 51.0], // Germany center
  zoom = 13,
  pitch = 0,
  bearing = 0,
  interactive = true,
  followUser = false,
  showUserLocation = false,
  show3DBuildings = true,
  onMapReady,
  onMove,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const hasToken = !!MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !hasToken) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_DARK_STYLE,
      center,
      zoom,
      pitch,
      bearing,
      interactive,
      antialias: true,
      attributionControl: true,
      logoPosition: 'bottom-right',
      maxPitch: 70,
      fadeDuration: 200,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Add 3D buildings layer
      if (show3DBuildings) {
        const layers = map.getStyle().layers;
        // Find the first label layer to insert buildings before labels
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
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                14, 0, 16, ['get', 'height'],
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                14, 0, 16, ['get', 'min_height'],
              ],
              'fill-extrusion-opacity': 0.5,
            },
          },
          labelLayerId,
        );
      }

      // Add user location with custom pulsing dot
      if (showUserLocation) {
        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: followUser,
            showUserHeading: true,
            showAccuracyCircle: false,
          }),
        );
      }

      setLoaded(true);
      onMapReady?.(map);
    });

    if (onMove) {
      map.on('moveend', () => {
        const c = map.getCenter();
        onMove({ lng: c.lng, lat: c.lat }, map.getZoom());
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative ${className}`}>
      {hasToken ? (
        <>
          <div ref={containerRef} className="w-full h-full" />
          {!loaded && (
            <div className="absolute inset-0 bg-ds-bg flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-ds-text-muted">Karte wird geladen…</span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Beautiful fallback when no Mapbox token is configured */
        <div className="w-full h-full bg-ds-surface flex items-center justify-center overflow-hidden">
          {/* Animated grid background */}
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,240,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,240,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-ds-primary/8 blur-[100px]" />
          {/* Content */}
          <div className="relative text-center px-6 space-y-3">
            <div className="text-5xl mb-2">🗺️</div>
            <p className="text-base font-semibold text-ds-text">Karte im Demo-Modus</p>
            <p className="text-xs text-ds-text-muted max-w-[240px] mx-auto leading-relaxed">
              Setze <code className="text-ds-primary bg-ds-primary/10 px-1.5 py-0.5 rounded text-[11px]">VITE_MAPBOX_TOKEN</code> in <code className="text-ds-primary bg-ds-primary/10 px-1.5 py-0.5 rounded text-[11px]">client/.env</code> für die volle Kartenansicht.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom pulsing user marker ──────────────────────────────────────────────

export function createUserMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'user-location-marker';
  el.innerHTML = `
    <div style="
      position: relative;
      width: 20px;
      height: 20px;
    ">
      <div style="
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        background: rgba(0, 240, 255, 0.15);
        animation: pulse-ring 2s ease-out infinite;
      "></div>
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(circle, #00f0ff, #00b8c5);
        border: 3px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 16px rgba(0, 240, 255, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4);
      "></div>
      <div style="
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 8px solid #00f0ff;
        filter: drop-shadow(0 0 4px rgba(0, 240, 255, 0.5));
        transition: transform 0.3s ease;
      " class="heading-indicator"></div>
    </div>
  `;
  return el;
}

// ─── Friend marker element ───────────────────────────────────────────────────

export function createFriendMarkerElement(username: string, color: string = '#aa77ff'): HTMLDivElement {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    ">
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255, 255, 255, 0.7);
        box-shadow: 0 0 12px ${color}80;
      "></div>
      <div style="
        background: rgba(10, 10, 15, 0.8);
        backdrop-filter: blur(8px);
        padding: 2px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
        color: white;
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">${username}</div>
    </div>
  `;
  return el;
}

// ─── Record marker element ───────────────────────────────────────────────────

export function createRecordMarkerElement(recordType: string): HTMLDivElement {
  const icons: Record<string, string> = {
    fastest: '⚡',
    safest: '🛡️',
    smoothest: '🎯',
    most_efficient: '🌿',
  };
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, rgba(18, 18, 26, 0.9), rgba(26, 26, 38, 0.8));
      backdrop-filter: blur(12px);
      border-radius: 10px;
      border: 1px solid rgba(0, 240, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.15), 0 4px 12px rgba(0, 0, 0, 0.4);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    " onmouseover="this.style.transform='scale(1.15)';this.style.boxShadow='0 0 24px rgba(0,240,255,0.3), 0 4px 16px rgba(0,0,0,0.4)'"
       onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 0 16px rgba(0,240,255,0.15), 0 4px 12px rgba(0,0,0,0.4)'"
    >${icons[recordType] ?? '🏆'}</div>
  `;
  return el;
}
