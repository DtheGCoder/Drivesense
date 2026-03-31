import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMap } from './MapProvider';
import { useRadarStore, type CameraType } from '@/stores/radarStore';

// ─── Camera Icon SVGs ────────────────────────────────────────────────────────

function cameraIconSvg(type: CameraType, maxspeed?: number): string {
  const size = 36;
  const colors: Record<CameraType, string> = {
    fixed: '#ff3355',
    red_light: '#ff8800',
    section: '#ff3355',
    mobile: '#ffcc00',
    traffic_signals: '#ff8800',
  };
  const color = colors[type] ?? '#ff3355';

  const icons: Record<CameraType, string> = {
    fixed: `<circle cx="18" cy="15" r="7" fill="none" stroke="${color}" stroke-width="2"/><circle cx="18" cy="15" r="3" fill="${color}"/><rect x="12" y="23" width="12" height="3" rx="1.5" fill="${color}" opacity="0.5"/>`,
    red_light: `<circle cx="18" cy="10" r="3.5" fill="${color}"/><circle cx="18" cy="18" r="3.5" fill="${color}" opacity="0.4"/><rect x="15" y="6" width="6" height="16" rx="3" fill="none" stroke="${color}" stroke-width="1.5"/>`,
    section: `<path d="M10 12h16M10 18h16" stroke="${color}" stroke-width="2" stroke-linecap="round"/><path d="M18 8v20" stroke="${color}" stroke-width="1.5" stroke-dasharray="2 2"/>`,
    mobile: `<circle cx="18" cy="15" r="7" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/><circle cx="18" cy="15" r="3" fill="${color}"/><rect x="12" y="23" width="12" height="3" rx="1.5" fill="${color}" opacity="0.5"/>`,
    traffic_signals: `<circle cx="18" cy="10" r="3" fill="#ff3333"/><circle cx="18" cy="18" r="3" fill="${color}"/><circle cx="18" cy="26" r="3" fill="#33cc33" opacity="0.3"/>`,
  };

  const speedLabel = maxspeed ? `<text x="18" y="35" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="system-ui">${maxspeed}</text>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="18" cy="18" r="17" fill="rgba(20,20,30,0.85)" stroke="${color}" stroke-width="1.5"/>
    ${icons[type] ?? icons.fixed}
    ${speedLabel}
  </svg>`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SpeedCameraLayer() {
  const { map, loaded } = useMap();
  const cameras = useRadarStore((s) => s.cameras);
  const enabled = useRadarStore((s) => s.enabled);
  const fetchCameras = useRadarStore((s) => s.fetchCameras);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());

  // Fetch cameras when map loads and on significant movement
  const handleMapMove = useCallback(() => {
    if (!map || !enabled) return;
    const center = map.getCenter();
    fetchCameras([center.lng, center.lat]);
  }, [map, enabled, fetchCameras]);

  useEffect(() => {
    if (!map || !loaded || !enabled) return;
    // Initial fetch
    handleMapMove();
    // Fetch on moveend
    map.on('moveend', handleMapMove);
    return () => { map.off('moveend', handleMapMove); };
  }, [map, loaded, enabled, handleMapMove]);

  // Sync markers with camera data
  useEffect(() => {
    if (!map || !loaded) return;

    const currentMarkers = markersRef.current;
    const cameraIds = new Set(cameras.map((c) => c.id));

    // Remove markers no longer in data
    for (const [id, marker] of currentMarkers) {
      if (!cameraIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    }

    if (!enabled) {
      // Remove all markers if disabled
      for (const [, marker] of currentMarkers) marker.remove();
      currentMarkers.clear();
      return;
    }

    // Add/update markers
    for (const cam of cameras) {
      if (currentMarkers.has(cam.id)) continue;

      const el = document.createElement('div');
      el.innerHTML = cameraIconSvg(cam.type, cam.maxspeed);
      el.style.cursor = 'pointer';
      el.style.width = '36px';
      el.style.height = '36px';

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([cam.lng, cam.lat])
        .addTo(map);

      currentMarkers.set(cam.id, marker);
    }
  }, [map, loaded, cameras, enabled]);

  // Cleanup all markers on unmount
  useEffect(() => {
    return () => {
      for (const [, marker] of markersRef.current) marker.remove();
      markersRef.current.clear();
    };
  }, []);

  return null;
}
