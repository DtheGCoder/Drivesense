import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type GpsStatus =
  | 'initializing'
  | 'requesting_permission'
  | 'granted'
  | 'tracking'
  | 'error_denied'
  | 'error_unavailable'
  | 'error_timeout'
  | 'retrying'
  | 'unsupported';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // meters
  altitude: number | null;
  heading: number | null;
  speed: number | null; // m/s
  timestamp: number;
}

interface UseGeolocationOptions {
  /** Auto-start watching position on mount */
  autoStart?: boolean;
  /** Maximum age of cached position in ms */
  maxAge?: number;
  /** Timeout per position request in ms */
  timeout?: number;
  /** Retry interval when GPS fails (ms) */
  retryInterval?: number;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  status: GpsStatus;
  statusMessage: string;
  /** Start watching position */
  startTracking: () => void;
  /** Stop watching position */
  stopTracking: () => void;
  /** Request a single position fix */
  getCurrentPosition: () => Promise<GeoPosition | null>;
  /** Whether GPS is actively tracking */
  isTracking: boolean;
}

// ─── Status Messages ─────────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<GpsStatus, string> = {
  initializing: 'GPS wird initialisiert…',
  requesting_permission: 'GPS-Berechtigung wird angefragt…',
  granted: 'GPS bereit',
  tracking: 'GPS aktiv',
  error_denied: 'GPS-Zugriff verweigert. Bitte erlaube den Standortzugriff in deinen Einstellungen.',
  error_unavailable: 'GPS nicht verfügbar. Versuche es erneut…',
  error_timeout: 'GPS-Signal zu schwach. Versuche es erneut…',
  retrying: 'GPS-Verbindung wird wiederhergestellt…',
  unsupported: 'GPS wird von deinem Gerät nicht unterstützt.',
};

// ─── Detect iOS / Android for permission hints ──────────────────────────────

export function getDeviceType(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export function getPermissionHint(): string {
  const device = getDeviceType();
  if (device === 'ios') {
    return 'iOS: Gehe zu Einstellungen → Safari → Standort → „Erlauben"';
  }
  if (device === 'android') {
    return 'Android: Tippe auf das Schloss-Symbol in der Adressleiste → Standort → „Zulassen"';
  }
  return 'Bitte erlaube den Standortzugriff in deinem Browser.';
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    autoStart = false,
    maxAge = 5000,
    timeout = 15000,
    retryInterval = 5000,
  } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus] = useState<GpsStatus>('initializing');
  const [isTracking, setIsTracking] = useState(false);

  const watchHiRef = useRef<number | null>(null);
  const watchLoRef = useRef<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // Track last high-accuracy timestamp so we prefer GPS when fresh
  const lastHiTimestampRef = useRef(0);
  // Staleness threshold: if GPS is older than this, accept network position
  const GPS_STALE_MS = 8000;

  // Clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (watchHiRef.current !== null) {
        navigator.geolocation.clearWatch(watchHiRef.current);
        watchHiRef.current = null;
      }
      if (watchLoRef.current !== null) {
        navigator.geolocation.clearWatch(watchLoRef.current);
        watchLoRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  const toGeoPosition = useCallback((pos: GeolocationPosition): GeoPosition => ({
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    altitude: pos.coords.altitude,
    heading: pos.coords.heading,
    speed: pos.coords.speed,
    timestamp: pos.timestamp,
  }), []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    if (!mountedRef.current) return;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setStatus('error_denied');
        break;
      case error.POSITION_UNAVAILABLE:
        setStatus('error_unavailable');
        // Auto-retry
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current && isTracking) {
            setStatus('retrying');
          }
        }, retryInterval);
        break;
      case error.TIMEOUT:
        setStatus('error_timeout');
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current && isTracking) {
            setStatus('retrying');
          }
        }, retryInterval);
        break;
    }
  }, [isTracking, retryInterval]);

  const startWatch = useCallback(() => {
    // Clear any existing watches
    if (watchHiRef.current !== null) {
      navigator.geolocation.clearWatch(watchHiRef.current);
    }
    if (watchLoRef.current !== null) {
      navigator.geolocation.clearWatch(watchLoRef.current);
    }

    setIsTracking(true);

    // High-accuracy watcher (GPS) — preferred source
    const hiId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return;
        lastHiTimestampRef.current = Date.now();
        setPosition(toGeoPosition(pos));
        setStatus('tracking');
      },
      (err) => handleError(err),
      { enableHighAccuracy: true, maximumAge: maxAge, timeout },
    );
    watchHiRef.current = hiId;

    // Low-accuracy watcher (network/WiFi/cell) — fallback for tunnels etc.
    const loId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const gpsStale = Date.now() - lastHiTimestampRef.current > GPS_STALE_MS;
        // Only use network position if GPS hasn't reported recently
        if (gpsStale) {
          setPosition(toGeoPosition(pos));
          setStatus('tracking');
        }
      },
      () => { /* low-accuracy errors are non-critical, ignore */ },
      { enableHighAccuracy: false, maximumAge: maxAge, timeout: timeout * 2 },
    );
    watchLoRef.current = loId;
  }, [maxAge, timeout, toGeoPosition, handleError]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }

    // Check permission state first
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (!mountedRef.current) return;
        if (result.state === 'granted') {
          setStatus('granted');
          startWatch();
        } else if (result.state === 'denied') {
          setStatus('error_denied');
        } else {
          // 'prompt' — use getCurrentPosition to trigger the browser prompt
          // (watchPosition sometimes silently fails on iOS without a prompt)
          setStatus('requesting_permission');
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!mountedRef.current) return;
              setPosition(toGeoPosition(pos));
              setStatus('granted');
              startWatch();
            },
            (err) => {
              if (!mountedRef.current) return;
              handleError(err);
            },
            { enableHighAccuracy: false, maximumAge: maxAge, timeout },
          );
        }
      }).catch(() => {
        // Permissions API failed — trigger prompt via getCurrentPosition
        setStatus('requesting_permission');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mountedRef.current) return;
            setPosition(toGeoPosition(pos));
            setStatus('granted');
            startWatch();
          },
          (err) => {
            if (!mountedRef.current) return;
            handleError(err);
          },
          { enableHighAccuracy: false, maximumAge: maxAge, timeout },
        );
      });
    } else {
      // No Permissions API (e.g. iOS Safari) — trigger prompt via getCurrentPosition
      setStatus('requesting_permission');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mountedRef.current) return;
          setPosition(toGeoPosition(pos));
          setStatus('granted');
          startWatch();
        },
        (err) => {
          if (!mountedRef.current) return;
          handleError(err);
        },
        { enableHighAccuracy: false, maximumAge: maxAge, timeout },
      );
    }
  }, [startWatch, maxAge, timeout, toGeoPosition, handleError]);

  const stopTracking = useCallback(() => {
    if (watchHiRef.current !== null) {
      navigator.geolocation.clearWatch(watchHiRef.current);
      watchHiRef.current = null;
    }
    if (watchLoRef.current !== null) {
      navigator.geolocation.clearWatch(watchLoRef.current);
      watchLoRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setIsTracking(false);
    setStatus('initializing');
  }, []);

  const getCurrentPosition = useCallback((): Promise<GeoPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setStatus('unsupported');
        resolve(null);
        return;
      }

      let resolved = false;
      const resolveOnce = (gp: GeoPosition | null) => {
        if (resolved) return;
        resolved = true;
        resolve(gp);
      };

      const doFetch = () => {
        // Race GPS vs network — first good result wins
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const gp = toGeoPosition(pos);
            if (mountedRef.current) {
              setPosition(gp);
              setStatus('granted');
            }
            resolveOnce(gp);
          },
          () => { /* high-accuracy fail is ok, network may succeed */ },
          { enableHighAccuracy: true, maximumAge: maxAge, timeout },
        );
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const gp = toGeoPosition(pos);
            if (!resolved && mountedRef.current) {
              setPosition(gp);
              setStatus('granted');
            }
            resolveOnce(gp);
          },
          (err) => {
            if (mountedRef.current) handleError(err);
            resolveOnce(null);
          },
          { enableHighAccuracy: false, maximumAge: maxAge, timeout: timeout * 2 },
        );
      };

      // Check permission state to avoid re-prompting
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (!mountedRef.current) { resolve(null); return; }
          if (result.state === 'denied') {
            setStatus('error_denied');
            resolve(null);
          } else if (result.state === 'granted') {
            setStatus('granted');
            doFetch();
          } else {
            setStatus('requesting_permission');
            doFetch();
          }
        }).catch(() => doFetch());
      } else {
        setStatus('requesting_permission');
        doFetch();
      }
    });
  }, [maxAge, timeout, toGeoPosition, handleError]);

  // Auto-start
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }
  }, [autoStart, startTracking]);

  const statusMessage = STATUS_MESSAGES[status];

  return {
    position,
    status,
    statusMessage,
    startTracking,
    stopTracking,
    getCurrentPosition,
    isTracking,
  };
}
