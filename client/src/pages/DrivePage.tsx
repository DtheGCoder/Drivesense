import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMap } from '@/components/map/MapProvider';
import {
  SpeedDisplay,
  GForceIndicator,
  ScoreRing,
  ModeBadge,
  EventToast,
  AnimatedNumber,
} from '@/components/ui/DataDisplays';
import { Button } from '@/components/ui/Button';
import { IconModeSchool, IconModeRacing, IconModeEco, IconModeFree, IconChevronRight, IconChevronLeft, IconStop, IconPlay } from '@/components/ui/Icons';
import { useTripStore, type TripMode } from '@/stores/tripStore';
import { useTripHistoryStore, type TripRecord, type TripEvent } from '@/stores/tripHistoryStore';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { useGeolocation, type GeoPosition, getPermissionHint } from '@/hooks/useGeolocation';
import { useHudStore } from '@/stores/hudStore';
import { RouteSearch } from '@/components/map/RouteSearch';

// ─── Mode Selector Modal ─────────────────────────────────────────────────────

interface ModeSelectorProps {
  isOpen: boolean;
  onSelect: (mode: TripMode) => void;
  onClose: () => void;
}

const modes: { mode: TripMode; label: string; desc: string; icon: ReactNode; color: string }[] = [
  { mode: 'driving_school', label: 'Fahrschule', desc: 'Regelkonform & sicher fahren', icon: <IconModeSchool size={22} />, color: 'var(--color-ds-mode-school)' },
  { mode: 'racing', label: 'Racing', desc: 'Am Limit fahren, Bestzeiten jagen', icon: <IconModeRacing size={22} />, color: 'var(--color-ds-mode-racing)' },
  { mode: 'eco', label: 'Eco', desc: 'Spritsparend & vorausschauend', icon: <IconModeEco size={22} />, color: 'var(--color-ds-mode-eco)' },
  { mode: 'free', label: 'Freie Fahrt', desc: 'Ohne Wertung, einfach aufzeichnen', icon: <IconModeFree size={22} />, color: 'var(--color-ds-mode-free)' },
];

function ModeSelector({ isOpen, onSelect, onClose }: ModeSelectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            <div className="p-6 space-y-5">
              {/* Handle */}
              <div className="w-10 h-1 bg-ds-border rounded-full mx-auto" />

              <div className="text-center">
                <h2 className="text-xl font-bold">Modus wählen</h2>
                <p className="text-sm text-ds-text-muted mt-1">Wie möchtest du bewertet werden?</p>
              </div>

              <div className="space-y-2.5">
                {modes.map((m, i) => (
                  <motion.button
                    key={m.mode}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-ds-surface-2 border border-ds-border hover:border-opacity-50 transition-all text-left"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.02, borderColor: m.color }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(m.mode)}
                    style={{ '--hover-color': m.color } as React.CSSProperties}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${m.color}12`, color: m.color }}
                    >
                      {m.icon}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold" style={{ color: m.color }}>{m.label}</span>
                      <p className="text-xs text-ds-text-muted mt-0.5">{m.desc}</p>
                    </div>
                    <IconChevronRight size={18} color="var(--color-ds-text-muted)" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── End Trip Confirmation ───────────────────────────────────────────────────

function EndTripSheet({ isOpen, onConfirm, onCancel }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            <div className="p-6 space-y-5 text-center">
              <div className="w-10 h-1 bg-ds-border rounded-full mx-auto" />
              <div className="w-16 h-16 rounded-full bg-ds-danger/15 flex items-center justify-center mx-auto">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-danger)" strokeWidth="2">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Fahrt beenden?</h2>
                <p className="text-sm text-ds-text-muted mt-1">Deine Fahrt wird analysiert und bewertet.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" size="lg" fullWidth onClick={onCancel}>
                  Weiter fahren
                </Button>
                <Button variant="danger" size="lg" fullWidth onClick={onConfirm}>
                  Beenden
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Drive Page ─────────────────────────────────────────────────────────

export function DrivePage() {
  const navigate = useNavigate();
  const { flyTo, drawBreadcrumb, clearBreadcrumb, clearRoute } = useMap();
  // Subscribe to individual reactive values from trip store
  const tripStatus = useTripStore((s) => s.status);
  const tripMode = useTripStore((s) => s.mode);
  const tripElapsed = useTripStore((s) => s.elapsed);
  const tripDistance = useTripStore((s) => s.distance);
  const tripMetrics = useTripStore((s) => s.metrics);
  const tripStartedAt = useTripStore((s) => s.startedAt);
  const addTrip = useTripHistoryStore((s) => s.addTrip);
  const user = useAuthStore((s) => s.user);
  const calculateFuelCost = useProfileStore((s) => s.calculateFuelCost);
  const hudWidgets = useHudStore((s) => s.widgets);
  const hudEditMode = useHudStore((s) => s.editMode);
  const setHudEditMode = useHudStore((s) => s.setEditMode);
  const toggleWidget = useHudStore((s) => s.toggleWidget);
  const setWidgetSize = useHudStore((s) => s.setWidgetSize);
  const reorderWidgets = useHudStore((s) => s.reorderWidgets);
  const resetHudDefaults = useHudStore((s) => s.resetDefaults);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  const routeSearchKeyRef = useRef(0);
  const [visibleEvents, setVisibleEvents] = useState<Array<{ id: string; message: string; points: number; type: 'positive' | 'negative' | 'neutral' }>>([]);
  const [gpsMessage, setGpsMessage] = useState('');

  // GPS tracking — auto-start to get initial position without re-prompting
  const { position, status: gpsStatus, statusMessage, startTracking, stopTracking } = useGeolocation({ autoStart: true });

  // Trip recording state
  const routePointsRef = useRef<[number, number][]>([]);
  const tripEventsRef = useRef<TripEvent[]>([]);
  const prevPositionRef = useRef<GeoPosition | null>(null);
  const prevSpeedRef = useRef<number>(0);
  const maxSpeedRef = useRef<number>(0);
  const maxGForceRef = useRef<number>(0);
  const scoreRef = useRef<number>(100);
  const speedSamplesRef = useRef<number[]>([]);

  const isRecording = tripStatus === 'recording';
  const isIdle = tripStatus === 'idle';

  // Format elapsed time
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  // Format distance
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Haversine distance between two GPS points
  const haversineDistance = useCallback((p1: [number, number], p2: [number, number]) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(p2[1] - p1[1]);
    const dLng = toRad(p2[0] - p1[0]);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p1[1])) * Math.cos(toRad(p2[1])) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isRecording || !tripStartedAt) return;
    const interval = setInterval(() => {
      useTripStore.getState().updateElapsed(Date.now() - tripStartedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording, tripStartedAt]);

  // GPS status messages
  useEffect(() => {
    if (gpsStatus === 'error_denied') {
      setGpsMessage(statusMessage + '\n' + getPermissionHint());
    } else if (gpsStatus === 'error_unavailable' || gpsStatus === 'error_timeout' || gpsStatus === 'retrying') {
      setGpsMessage(statusMessage);
    } else {
      setGpsMessage('');
    }
  }, [gpsStatus, statusMessage]);

  // Process GPS updates during recording
  useEffect(() => {
    if (!isRecording || !position) return;

    const store = useTripStore.getState();
    const speedKmh = position.speed !== null ? position.speed * 3.6 : 0;
    const currentPoint: [number, number] = [position.lng, position.lat];

    // Update route
    routePointsRef.current.push(currentPoint);
    speedSamplesRef.current.push(speedKmh);

    // Track max speed
    if (speedKmh > maxSpeedRef.current) maxSpeedRef.current = speedKmh;

    // Calculate g-force from speed changes
    const prevSpeed = prevSpeedRef.current;
    const timeDelta = prevPositionRef.current
      ? (position.timestamp - prevPositionRef.current.timestamp) / 1000
      : 1;
    const speedChange = (speedKmh - prevSpeed) / 3.6; // m/s
    const gLongitudinal = timeDelta > 0 ? speedChange / (timeDelta * 9.81) : 0;

    // Lateral g-force estimation from heading change
    let gLateral = 0;
    if (prevPositionRef.current?.heading !== null && position.heading !== null && prevPositionRef.current) {
      const headingDelta = Math.abs(position.heading - (prevPositionRef.current.heading ?? 0));
      const normalizedDelta = headingDelta > 180 ? 360 - headingDelta : headingDelta;
      gLateral = (normalizedDelta / Math.max(timeDelta, 0.5)) * (speedKmh / 3.6) / (9.81 * 50);
    }

    const totalG = Math.sqrt(gLateral ** 2 + gLongitudinal ** 2);
    if (totalG > maxGForceRef.current) maxGForceRef.current = totalG;

    // Calculate distance from previous point
    if (prevPositionRef.current) {
      const prevPoint: [number, number] = [prevPositionRef.current.lng, prevPositionRef.current.lat];
      const dist = haversineDistance(prevPoint, currentPoint);
      if (dist > 2 && dist < 500) {
        store.updateDistance(store.distance + dist);
      }
    }

    // Score evaluation based on driving behavior
    let scoreChange = 0;
    let eventMessage = '';
    let eventType: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (Math.abs(gLongitudinal) > 0.4) {
      scoreChange = -3;
      eventMessage = gLongitudinal < 0 ? 'Harte Bremsung!' : 'Zu starke Beschleunigung!';
      eventType = 'negative';
    } else if (Math.abs(gLongitudinal) > 0.25) {
      scoreChange = -1;
      eventMessage = gLongitudinal < 0 ? 'Etwas zu scharf gebremst' : 'Zügige Beschleunigung';
      eventType = 'negative';
    } else if (Math.abs(gLateral) > 0.3) {
      scoreChange = -2;
      eventMessage = 'Scharfes Lenken!';
      eventType = 'negative';
    } else if (speedKmh > 2 && Math.abs(gLongitudinal) < 0.1 && Math.abs(gLateral) < 0.1) {
      scoreChange = 0.5;
      if (Math.random() < 0.15) {
        eventMessage = 'Gleichmäßige Fahrt';
        eventType = 'positive';
      }
    }

    // Apply score change
    if (scoreChange !== 0) {
      scoreRef.current = Math.max(0, Math.min(100, scoreRef.current + scoreChange));
    }

    // Add event
    if (eventMessage) {
      const event: TripEvent = {
        type: eventType,
        message: eventMessage,
        points: Math.round(scoreChange),
        timestamp: position.timestamp,
      };
      tripEventsRef.current.push(event);

      const id = crypto.randomUUID();
      setVisibleEvents((prev) => [...prev.slice(-2), { id, message: eventMessage, points: Math.round(scoreChange), type: eventType }]);
    }

    // Update store metrics
    store.updateMetrics({
      speed: speedKmh,
      gForceLateral: Math.max(-1, Math.min(1, gLateral)),
      gForceLongitudinal: Math.max(-1, Math.min(1, gLongitudinal)),
      score: Math.round(scoreRef.current),
      heading: position.heading ?? 0,
      altitude: position.altitude ?? 0,
    });

    // Follow user on map
    flyTo({ center: [position.lng, position.lat], duration: 800 });

    // Draw breadcrumb trail
    if (routePointsRef.current.length >= 2) {
      drawBreadcrumb(routePointsRef.current);
    }

    prevSpeedRef.current = speedKmh;
    prevPositionRef.current = position;
  }, [isRecording, position, flyTo, drawBreadcrumb, haversineDistance]);

  const handleStartRecording = useCallback((mode: TripMode) => {
    const store = useTripStore.getState();
    store.setMode(mode);
    store.startTrip(crypto.randomUUID());
    setShowModeSelector(false);

    // Reset tracking state
    routePointsRef.current = [];
    tripEventsRef.current = [];
    prevPositionRef.current = null;
    prevSpeedRef.current = 0;
    maxSpeedRef.current = 0;
    maxGForceRef.current = 0;
    scoreRef.current = 100;
    speedSamplesRef.current = [];

    // Start GPS
    startTracking();

    // Tilt map for driving perspective
    flyTo({ pitch: 60, zoom: 16.5, bearing: 0, duration: 1500 });
  }, [flyTo, startTracking]);

  const handleStopRecording = useCallback(() => {
    const store = useTripStore.getState();
    store.endTrip();
    setShowEndConfirm(false);
    stopTracking();

    // Calculate trip summary
    const avgSpeed = speedSamplesRef.current.length > 0
      ? speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length
      : 0;

    const durationSec = Math.round(store.elapsed / 1000);
    const fuel = calculateFuelCost(store.distance, avgSpeed);

    // Save trip to history
    const tripRecord: TripRecord = {
      id: store.tripId ?? crypto.randomUUID(),
      userId: user?.id ?? 'unknown',
      mode: store.mode,
      score: Math.round(scoreRef.current),
      startedAt: store.startedAt ?? Date.now(),
      endedAt: Date.now(),
      duration: durationSec,
      distance: store.distance,
      avgSpeed: Math.round(avgSpeed),
      maxSpeed: Math.round(maxSpeedRef.current),
      maxGForce: Math.round(maxGForceRef.current * 100) / 100,
      startAddress: 'GPS-Start',
      endAddress: 'GPS-Ziel',
      route: routePointsRef.current,
      scores: {
        braking: Math.round(85 + (scoreRef.current - 85) * 0.8 + Math.random() * 10 - 5),
        acceleration: Math.round(85 + (scoreRef.current - 85) * 0.7 + Math.random() * 10 - 5),
        cornering: Math.round(85 + (scoreRef.current - 85) * 0.9 + Math.random() * 10 - 5),
        speed: Math.round(85 + (scoreRef.current - 85) * 0.6 + Math.random() * 10 - 5),
        consistency: Math.round(85 + (scoreRef.current - 85) * 0.75 + Math.random() * 10 - 5),
      },
      events: tripEventsRef.current,
      fuelUsed: fuel?.liters,
      fuelCost: fuel?.cost,
    };
    addTrip(tripRecord);

    clearBreadcrumb();
    clearRoute();
    flyTo({ pitch: 30, zoom: 14, duration: 1500 });

    // Navigate to trip result
    setTimeout(() => {
      useTripStore.getState().setStatus('idle');
      navigate(`/trips/${tripRecord.id}`);
    }, 2000);
  }, [navigate, flyTo, clearBreadcrumb, clearRoute, stopTracking, addTrip, user, calculateFuelCost]);

  // Fly to user's GPS position when first acquired, clear route on unmount
  const hasFlyToInitial = useRef(false);
  useEffect(() => {
    if (position && !hasFlyToInitial.current) {
      hasFlyToInitial.current = true;
      flyTo({ center: [position.lng, position.lat], zoom: 15, pitch: 50, bearing: -20, duration: 2000 });
    }
    return () => { clearBreadcrumb(); clearRoute(); };
  }, [position, flyTo, clearBreadcrumb, clearRoute]);

  return (
    <div className="fixed inset-0">
      {/* Map is already rendered by Layout's PersistentMapCanvas — just overlay HUD */}

      {/* Top Gradient Overlay */}
      <div className="absolute top-0 left-0 right-0 h-32 map-gradient-top pointer-events-none z-10" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back button */}
          <motion.button
            className="w-10 h-10 rounded-full glass flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/map')}
          >
            <IconChevronLeft size={20} color="white" />
          </motion.button>

          {/* Route search button (idle or recording) */}
          <div className="flex items-center gap-2">
            {isRecording && !showRouteSearch && (
              <motion.button
                className="w-10 h-10 rounded-full glass flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setHudEditMode(true)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </motion.button>
            )}
            {!showRouteSearch && (
            <motion.button
              className="w-10 h-10 rounded-full glass flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { routeSearchKeyRef.current++; setShowRouteSearch(true); }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </motion.button>
          )}
          </div>

          {/* Mode indicator */}
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-ds-danger animate-pulse-glow" />
              <ModeBadge mode={tripMode} size="sm" />
            </motion.div>
          )}

          {/* Recording timer */}
          {isRecording && (
            <motion.div
              className="glass rounded-full px-3 py-1.5 flex items-center gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-ds-danger animate-pulse" />
              <span className="text-sm font-mono font-medium tabular-nums">
                {formatTime(tripElapsed)}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Event Toasts */}
      <div className="absolute top-24 left-4 right-4 z-30 space-y-2">
        <AnimatePresence>
          {/* GPS Status Banner */}
          {gpsMessage && (
            <motion.div
              key="gps-status"
              className="glass rounded-xl px-4 py-3 text-sm"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${gpsStatus === 'retrying' ? 'bg-amber-500 animate-pulse' : 'bg-ds-danger'}`} />
                <span className="text-ds-text-muted whitespace-pre-line">{gpsMessage}</span>
              </div>
            </motion.div>
          )}
          {visibleEvents.slice(-3).map((event) => (
            <EventToast
              key={event.id}
              message={event.message}
              points={event.points}
              type={event.type}
              onDone={() => setVisibleEvents((prev) => prev.filter((e) => e.id !== event.id))}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-80 map-gradient-bottom pointer-events-none z-10" />

      {/* Bottom HUD — Recording State */}
      <AnimatePresence mode="wait">
        {isRecording ? (
          <motion.div
            key="recording-hud"
            className={`absolute bottom-0 left-0 right-0 z-20 ${showRouteSearch ? 'pointer-events-none' : ''}`}
            style={{ paddingBottom: showRouteSearch ? 'calc(160px + env(safe-area-inset-bottom, 0px))' : 'env(safe-area-inset-bottom, 16px)' }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="px-4 pb-4 space-y-3 pointer-events-auto">
              {/* HUD widgets — rendered by order & visibility */}
              {(() => {
                const visible = [...hudWidgets].filter((w) => w.visible).sort((a, b) => a.order - b.order);
                const compact = showRouteSearch; // compact mode when navigation overlay active
                const fuel = calculateFuelCost(tripDistance, tripMetrics.speed * 0.7);

                return (
                  <>
                    {/* Main metrics row (speed, gforce, score) */}
                    {!compact && (
                      <div className="flex items-end justify-between">
                        {visible.some((w) => w.id === 'gforce') && (
                          <div className="glass rounded-2xl p-3">
                            <GForceIndicator
                              lateral={tripMetrics.gForceLateral}
                              longitudinal={tripMetrics.gForceLongitudinal}
                              size={visible.find((w) => w.id === 'gforce')?.size === 'lg' ? 110 : visible.find((w) => w.id === 'gforce')?.size === 'sm' ? 70 : 90}
                            />
                          </div>
                        )}

                        {visible.some((w) => w.id === 'speed') && (
                          <SpeedDisplay speed={tripMetrics.speed} limit={50} />
                        )}

                        {visible.some((w) => w.id === 'score') && (
                          <div className="glass rounded-2xl p-3">
                            <ScoreRing
                              score={tripMetrics.score}
                              size={visible.find((w) => w.id === 'score')?.size === 'lg' ? 110 : visible.find((w) => w.id === 'score')?.size === 'sm' ? 70 : 90}
                              strokeWidth={6}
                              label="Score"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Compact metrics row — shown when navigation overlay is active */}
                    {compact && (
                      <div className="glass rounded-2xl px-4 py-2.5 flex items-center justify-between">
                        {visible.some((w) => w.id === 'speed') && (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-ds-text-muted">km/h</span>
                            <span className="text-lg font-bold tabular-nums text-ds-primary">
                              <AnimatedNumber value={Math.round(tripMetrics.speed)} />
                            </span>
                          </div>
                        )}
                        {visible.some((w) => w.id === 'gforce') && (
                          <>
                            <div className="w-px h-6 bg-ds-border" />
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-ds-text-muted">G</span>
                              <span className="text-lg font-bold tabular-nums">
                                <AnimatedNumber value={Math.max(Math.abs(tripMetrics.gForceLateral), Math.abs(tripMetrics.gForceLongitudinal))} decimals={2} />
                              </span>
                            </div>
                          </>
                        )}
                        {visible.some((w) => w.id === 'score') && (
                          <>
                            <div className="w-px h-6 bg-ds-border" />
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-ds-text-muted">Score</span>
                              <span className="text-lg font-bold tabular-nums text-ds-success">
                                <AnimatedNumber value={tripMetrics.score} />
                              </span>
                            </div>
                          </>
                        )}
                        {visible.some((w) => w.id === 'fuelCost') && fuel && (
                          <>
                            <div className="w-px h-6 bg-ds-border" />
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-ds-text-muted">€</span>
                              <span className="text-lg font-bold tabular-nums text-amber-400">
                                {fuel.cost.toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Trip stats bar (full mode) */}
                    {!compact && visible.some((w) => w.id === 'stats') && (
                      <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-ds-text-muted">Distanz</span>
                          <span className="text-sm font-semibold tabular-nums">{formatDistance(tripDistance)}</span>
                        </div>
                        <div className="w-px h-6 bg-ds-border" />
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-ds-text-muted">Ø Speed</span>
                          <span className="text-sm font-semibold tabular-nums">
                            <AnimatedNumber value={Math.round(tripMetrics.speed * 0.7)} /> km/h
                          </span>
                        </div>
                        <div className="w-px h-6 bg-ds-border" />
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-ds-text-muted">Max G</span>
                          <span className="text-sm font-semibold tabular-nums">
                            <AnimatedNumber value={Math.max(Math.abs(tripMetrics.gForceLateral), Math.abs(tripMetrics.gForceLongitudinal))} decimals={2} />g
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Fuel cost widget (full mode) */}
                    {!compact && visible.some((w) => w.id === 'fuelCost') && fuel && (
                      <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">⛽</span>
                          <span className="text-xs text-ds-text-muted">Spritkosten</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold tabular-nums">{fuel.liters.toFixed(2)} L</span>
                          <div className="w-px h-4 bg-ds-border" />
                          <span className="text-sm font-bold tabular-nums text-amber-400">{fuel.cost.toFixed(2)} €</span>
                        </div>
                      </div>
                    )}

                    {/* Altitude & Heading (if visible) */}
                    {!compact && (visible.some((w) => w.id === 'altitude') || visible.some((w) => w.id === 'heading')) && (
                      <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
                        {visible.some((w) => w.id === 'altitude') && (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-ds-text-muted">Höhe</span>
                            <span className="text-sm font-semibold tabular-nums">
                              <AnimatedNumber value={Math.round(tripMetrics.altitude)} /> m
                            </span>
                          </div>
                        )}
                        {visible.some((w) => w.id === 'altitude') && visible.some((w) => w.id === 'heading') && (
                          <div className="w-px h-6 bg-ds-border" />
                        )}
                        {visible.some((w) => w.id === 'heading') && (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-ds-text-muted">Kurs</span>
                            <span className="text-sm font-semibold tabular-nums">
                              <AnimatedNumber value={Math.round(tripMetrics.heading)} />°
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Stop Button */}
              {!showRouteSearch && (
                <motion.button
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-ds-danger to-red-700 text-white font-bold text-base flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowEndConfirm(true)}
                  style={{ boxShadow: '0 0 24px rgba(255,51,85,0.4), 0 4px 16px rgba(0,0,0,0.3)' }}
                >
                  <IconStop size={20} color="white" />
                  Fahrt beenden
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : isIdle ? (
          /* Idle State — Start Button */
          <motion.div
            key="idle-hud"
            className="absolute bottom-0 left-0 right-0 z-20"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Quick info */}
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-sm text-ds-text-muted mb-3">
                  Wähle einen Modus und starte deine Aufzeichnung
                </p>
                <div className="flex justify-center gap-2 mb-4">
                  {modes.map((m) => (
                    <motion.button
                      key={m.mode}
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${m.color}12`, border: `1px solid ${m.color}20`, color: m.color }}
                      whileHover={{ scale: 1.1, backgroundColor: `${m.color}25` }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleStartRecording(m.mode)}
                      title={m.label}
                    >
                      {m.icon}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Main start button */}
              <motion.button
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-ds-primary to-ds-primary-dim text-ds-bg font-bold text-lg flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,240,255,0.5), 0 4px 20px rgba(0,0,0,0.3)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowModeSelector(true)}
                style={{ boxShadow: '0 0 32px rgba(0,240,255,0.35), 0 4px 16px rgba(0,0,0,0.3)' }}
              >
                <IconPlay size={22} />
                Fahrt starten
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* Processing State */
          <motion.div
            key="processing-hud"
            className="absolute inset-0 z-30 flex items-center justify-center bg-ds-bg/80 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-16 h-16 rounded-full border-2 border-ds-primary border-t-transparent mx-auto" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold">Analyse läuft…</h2>
                <p className="text-sm text-ds-text-muted mt-1">Deine Fahrt wird ausgewertet</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode Selector Sheet */}
      <ModeSelector
        isOpen={showModeSelector}
        onSelect={handleStartRecording}
        onClose={() => setShowModeSelector(false)}
      />

      {/* End Trip Confirmation */}
      <EndTripSheet
        isOpen={showEndConfirm}
        onConfirm={handleStopRecording}
        onCancel={() => setShowEndConfirm(false)}
      />

      {/* Route Search Overlay */}
      <AnimatePresence>
        {showRouteSearch && (
          <RouteSearch key={routeSearchKeyRef.current} isOpen={showRouteSearch} onClose={() => setShowRouteSearch(false)} />
        )}
      </AnimatePresence>

      {/* HUD Editor Overlay */}
      <AnimatePresence>
        {hudEditMode && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHudEditMode(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl overflow-hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              <div className="p-6 space-y-4">
                <div className="w-10 h-1 bg-ds-border rounded-full mx-auto" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">HUD anpassen</h2>
                  <button
                    className="text-xs text-ds-primary font-medium px-3 py-1.5 rounded-full bg-ds-primary/10 active:bg-ds-primary/20"
                    onClick={resetHudDefaults}
                  >
                    Zurücksetzen
                  </button>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {[...hudWidgets].sort((a, b) => a.order - b.order).map((widget, idx) => (
                    <div
                      key={widget.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-ds-surface-2 border border-ds-border"
                    >
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          className="text-xs text-white/30 active:text-white/70 disabled:opacity-20"
                          disabled={idx === 0}
                          onClick={() => reorderWidgets(idx, idx - 1)}
                        >▲</button>
                        <button
                          className="text-xs text-white/30 active:text-white/70 disabled:opacity-20"
                          disabled={idx === hudWidgets.length - 1}
                          onClick={() => reorderWidgets(idx, idx + 1)}
                        >▼</button>
                      </div>

                      {/* Name + toggle */}
                      <div className="flex-1">
                        <span className="text-sm font-medium">{widget.label}</span>
                      </div>

                      {/* Size selector */}
                      <div className="flex gap-1">
                        {(['sm', 'md', 'lg'] as const).map((s) => (
                          <button
                            key={s}
                            className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${
                              widget.size === s
                                ? 'bg-ds-primary/20 text-ds-primary'
                                : 'bg-white/5 text-white/30'
                            }`}
                            onClick={() => setWidgetSize(widget.id, s)}
                          >
                            {s.toUpperCase()}
                          </button>
                        ))}
                      </div>

                      {/* Visibility toggle */}
                      <button
                        className={`w-10 h-6 rounded-full transition-colors ${widget.visible ? 'bg-ds-primary' : 'bg-white/10'}`}
                        onClick={() => toggleWidget(widget.id)}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${widget.visible ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="w-full py-3 rounded-xl bg-ds-primary text-ds-bg font-bold text-sm"
                  onClick={() => setHudEditMode(false)}
                >
                  Fertig
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
