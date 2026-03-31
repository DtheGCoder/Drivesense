import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Map as MapboxMap } from 'mapbox-gl';
import { MapView } from '@/components/map/MapView';
import {
  SpeedDisplay,
  GForceIndicator,
  ScoreRing,
  ModeBadge,
  EventToast,
  AnimatedNumber,
} from '@/components/ui/DataDisplays';
import { Button } from '@/components/ui/Button';
import { useTripStore, type TripMode } from '@/stores/tripStore';

// ─── Mode Selector Modal ─────────────────────────────────────────────────────

interface ModeSelectorProps {
  isOpen: boolean;
  onSelect: (mode: TripMode) => void;
  onClose: () => void;
}

const modes: { mode: TripMode; label: string; desc: string; icon: string; color: string }[] = [
  { mode: 'driving_school', label: 'Fahrschule', desc: 'Regelkonform & sicher fahren', icon: '🎓', color: 'var(--color-ds-mode-school)' },
  { mode: 'racing', label: 'Racing', desc: 'Am Limit fahren, Bestzeiten jagen', icon: '🏁', color: 'var(--color-ds-mode-racing)' },
  { mode: 'eco', label: 'Eco', desc: 'Spritsparend & vorausschauend', icon: '🌿', color: 'var(--color-ds-mode-eco)' },
  { mode: 'free', label: 'Freie Fahrt', desc: 'Ohne Wertung, einfach aufzeichnen', icon: '✨', color: 'var(--color-ds-mode-free)' },
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
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${m.color}15` }}
                    >
                      {m.icon}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold" style={{ color: m.color }}>{m.label}</span>
                      <p className="text-xs text-ds-text-muted mt-0.5">{m.desc}</p>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-text-muted)" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
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
  const tripStore = useTripStore();
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [visibleEvents, setVisibleEvents] = useState<Array<{ id: string; message: string; points: number; type: 'positive' | 'negative' | 'neutral' }>>([]);
  const mapRef = useRef<MapboxMap | null>(null);

  const isRecording = tripStore.status === 'recording';
  const isIdle = tripStore.status === 'idle';

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

  // Timer effect
  useEffect(() => {
    if (!isRecording || !tripStore.startedAt) return;
    const interval = setInterval(() => {
      tripStore.updateElapsed(Date.now() - tripStore.startedAt!);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording, tripStore.startedAt, tripStore]);

  // Demo event simulation
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      const events = [
        { message: 'Saubere Kurve!', points: 3, type: 'positive' as const },
        { message: 'Sanftes Bremsen', points: 2, type: 'positive' as const },
        { message: 'Gleichmäßige Geschwindigkeit', points: 1, type: 'positive' as const },
        { message: 'Harte Bremsung!', points: -5, type: 'negative' as const },
        { message: 'Scharfes Lenken', points: -3, type: 'negative' as const },
      ];
      const event = events[Math.floor(Math.random() * events.length)]!;
      const id = crypto.randomUUID();
      setVisibleEvents((prev) => [...prev.slice(-2), { ...event, id }]);

      // Update demo metrics
      tripStore.updateMetrics({
        speed: 30 + Math.random() * 80,
        gForceLateral: (Math.random() - 0.5) * 0.6,
        gForceLongitudinal: (Math.random() - 0.5) * 0.4,
        score: Math.max(0, Math.min(100, tripStore.metrics.score + event.points)),
      });
      tripStore.updateDistance(tripStore.distance + 50 + Math.random() * 200);
    }, 4000);
    return () => clearInterval(interval);
  }, [isRecording, tripStore]);

  const handleMapReady = useCallback((map: MapboxMap) => {
    mapRef.current = map;
    // Set initial position to a nice German city
    map.flyTo({
      center: [8.6821, 50.1109], // Frankfurt
      zoom: 15,
      pitch: 50,
      bearing: -20,
      duration: 2000,
      essential: true,
    });
  }, []);

  const handleStartRecording = useCallback((mode: TripMode) => {
    tripStore.setMode(mode);
    tripStore.startTrip(crypto.randomUUID());
    setShowModeSelector(false);

    // Tilt map for driving perspective
    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: 60,
        zoom: 16.5,
        bearing: 0,
        duration: 1500,
      });
    }
  }, [tripStore]);

  const handleStopRecording = useCallback(() => {
    tripStore.endTrip();
    setShowEndConfirm(false);

    // Reset map perspective
    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: 30,
        zoom: 14,
        duration: 1500,
      });
    }

    // Navigate to processing/result after short delay
    setTimeout(() => {
      tripStore.setStatus('idle');
      navigate('/trips/demo-result');
    }, 2000);
  }, [tripStore, navigate]);

  return (
    <div className="fixed inset-0 bg-ds-bg">
      {/* Full-Screen Map */}
      <MapView
        className="w-full h-full"
        center={[8.6821, 50.1109]}
        zoom={14}
        pitch={isRecording ? 60 : 30}
        followUser
        showUserLocation
        show3DBuildings
        onMapReady={handleMapReady}
      />

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
            onClick={() => navigate('/dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </motion.button>

          {/* Mode indicator */}
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-ds-danger animate-pulse-glow" />
              <ModeBadge mode={tripStore.mode} size="sm" />
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
                {formatTime(tripStore.elapsed)}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Event Toasts */}
      <div className="absolute top-24 left-4 right-4 z-30 space-y-2">
        <AnimatePresence>
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
            className="absolute bottom-0 left-0 right-0 z-20"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Main metrics row */}
              <div className="flex items-end justify-between">
                {/* G-Force */}
                <motion.div
                  className="glass rounded-2xl p-3"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <GForceIndicator
                    lateral={tripStore.metrics.gForceLateral}
                    longitudinal={tripStore.metrics.gForceLongitudinal}
                    size={90}
                  />
                </motion.div>

                {/* Speed (center, dominant) */}
                <SpeedDisplay speed={tripStore.metrics.speed} limit={50} />

                {/* Score */}
                <motion.div
                  className="glass rounded-2xl p-3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <ScoreRing
                    score={tripStore.metrics.score}
                    size={90}
                    strokeWidth={6}
                    label="Score"
                  />
                </motion.div>
              </div>

              {/* Trip stats bar */}
              <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
                <div className="flex flex-col items-center">
                  <span className="text-xs text-ds-text-muted">Distanz</span>
                  <span className="text-sm font-semibold tabular-nums">{formatDistance(tripStore.distance)}</span>
                </div>
                <div className="w-px h-6 bg-ds-border" />
                <div className="flex flex-col items-center">
                  <span className="text-xs text-ds-text-muted">Ø Speed</span>
                  <span className="text-sm font-semibold tabular-nums">
                    <AnimatedNumber value={Math.round(tripStore.metrics.speed * 0.7)} /> km/h
                  </span>
                </div>
                <div className="w-px h-6 bg-ds-border" />
                <div className="flex flex-col items-center">
                  <span className="text-xs text-ds-text-muted">Max G</span>
                  <span className="text-sm font-semibold tabular-nums">
                    <AnimatedNumber value={Math.max(Math.abs(tripStore.metrics.gForceLateral), Math.abs(tripStore.metrics.gForceLongitudinal))} decimals={2} />g
                  </span>
                </div>
              </div>

              {/* Stop Button */}
              <motion.button
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-ds-danger to-red-700 text-white font-bold text-base flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowEndConfirm(true)}
                style={{ boxShadow: '0 0 24px rgba(255,51,85,0.4), 0 4px 16px rgba(0,0,0,0.3)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Fahrt beenden
              </motion.button>
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
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${m.color}12`, border: `1px solid ${m.color}25` }}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
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
    </div>
  );
}
