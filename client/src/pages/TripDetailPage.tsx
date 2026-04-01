import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Layout } from '@/components/layout/Layout';
import { GlassCard, StatCard } from '@/components/ui/GlassCard';
import { ScoreRing, ModeBadge, AnimatedNumber } from '@/components/ui/DataDisplays';
import { IconChevronLeft, IconChevronRight, IconShare, IconBarChart, IconClock, IconShield, IconZap, IconGauge, IconActivity, IconCar, IconMapPin } from '@/components/ui/Icons';
import { useTripHistoryStore, type TripRecord } from '@/stores/tripHistoryStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recordToDetail(r: TripRecord) {
  const d = new Date(r.startedAt);
  const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    id: r.id,
    mode: r.mode,
    score: r.score,
    date: dateStr,
    time: timeStr,
    duration: r.duration,
    distance: r.distance,
    avgSpeed: r.avgSpeed,
    maxSpeed: r.maxSpeed,
    maxGForce: r.maxGForce,
    startAddress: r.startAddress,
    endAddress: r.endAddress,
    scores: [
      { label: 'Bremsen', value: r.scores.braking, icon: <IconShield size={14} /> },
      { label: 'Beschleunigung', value: r.scores.acceleration, icon: <IconZap size={14} /> },
      { label: 'Kurven', value: r.scores.cornering, icon: <IconActivity size={14} /> },
      { label: 'Geschwindigkeit', value: r.scores.speed, icon: <IconGauge size={14} /> },
      { label: 'Konstanz', value: r.scores.consistency, icon: <IconBarChart size={14} /> },
    ],
    events: r.events.map((e) => {
      const t = new Date(e.timestamp);
      return {
        time: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
        message: e.message,
        points: e.points,
        type: e.type,
      };
    }),
    fuelCost: r.fuelCost,
    fuelUsed: r.fuelUsed,
  };
}

// ─── Score Bar ───────────────────────────────────────────────────────────────

function ScoreBar({ label, value, icon, delay }: { label: string; value: number; icon: ReactNode; delay: number }) {
  const getColor = (v: number) => {
    if (v >= 90) return 'var(--color-ds-score-excellent)';
    if (v >= 75) return 'var(--color-ds-score-good)';
    if (v >= 60) return 'var(--color-ds-score-ok)';
    if (v >= 40) return 'var(--color-ds-score-warn)';
    return 'var(--color-ds-score-bad)';
  };

  return (
    <motion.div
      className="space-y-1.5"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm flex items-center gap-1.5">
          <span>{icon}</span> {label}
        </span>
        <span className="text-sm font-semibold" style={{ color: getColor(value) }}>
          {value}
        </span>
      </div>
      <div className="h-2 bg-ds-surface-2 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: getColor(value) }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: delay + 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </motion.div>
  );
}

// ─── Event List Item ─────────────────────────────────────────────────────────

function EventItem({ event, index }: { event: { time: string; message: string; points: number; type: 'positive' | 'negative' | 'neutral' }; index: number }) {
  const isPositive = event.type === 'positive';
  return (
    <motion.div
      className="flex items-center gap-3 py-2.5 border-b border-ds-border/50 last:border-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{
          backgroundColor: isPositive ? 'var(--color-ds-success)15' : 'var(--color-ds-danger)15',
          color: isPositive ? 'var(--color-ds-success)' : 'var(--color-ds-danger)',
        }}
      >
        {isPositive ? '+' : '−'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{event.message}</p>
        <p className="text-xs text-ds-text-muted">{event.time} Uhr</p>
      </div>
      <span
        className="text-sm font-semibold flex-shrink-0"
        style={{ color: isPositive ? 'var(--color-ds-success)' : 'var(--color-ds-danger)' }}
      >
        {isPositive ? '+' : ''}{event.points}
      </span>
    </motion.div>
  );
}

// ─── Trip Route Map ──────────────────────────────────────────────────────────

function TripRouteMap({ route, compact, onExpand }: { route: [number, number][]; compact?: boolean; onExpand?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || route.length < 2) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) return;

    const m = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      accessToken: token,
      interactive: !compact,
      attributionControl: false,
    });

    m.on('load', () => {
      // Route line
      m.addSource('trip-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } },
      });
      m.addLayer({
        id: 'trip-route-outline',
        type: 'line',
        source: 'trip-route',
        paint: { 'line-color': '#000', 'line-width': 7, 'line-opacity': 0.4 },
      });
      m.addLayer({
        id: 'trip-route-line',
        type: 'line',
        source: 'trip-route',
        paint: {
          'line-color': '#22d3ee',
          'line-width': 4,
          'line-opacity': 0.9,
          'line-dasharray': [0, 0],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      // Start marker
      const startEl = document.createElement('div');
      startEl.innerHTML = `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 0 8px rgba(34,197,94,0.6)"></div>`;
      new mapboxgl.Marker({ element: startEl }).setLngLat(route[0]!).addTo(m);

      // End marker
      const endEl = document.createElement('div');
      endEl.innerHTML = `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 0 8px rgba(239,68,68,0.6)"></div>`;
      new mapboxgl.Marker({ element: endEl }).setLngLat(route[route.length - 1]!).addTo(m);

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      for (const coord of route) bounds.extend(coord);
      m.fitBounds(bounds, { padding: compact ? 30 : 60, duration: 0 });
    });

    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, [route, compact]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {compact && onExpand && (
        <button
          className="absolute bottom-2 right-2 z-10 bg-ds-surface-2/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/10 active:bg-white/10"
          onClick={onExpand}
        >
          <IconMapPin size={12} /> Karte öffnen
        </button>
      )}
    </div>
  );
}

// ─── Full-Screen Map Modal ───────────────────────────────────────────────────

function FullScreenRouteMap({ record, onClose }: { record: TripRecord; onClose: () => void }) {
  const formatDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const formatDur = (s: number) => { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`; };
  const d = new Date(record.startedAt);
  const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const endTime = new Date(record.endedAt);
  const endTimeStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-ds-bg flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Map */}
      <div className="flex-1 relative">
        <TripRouteMap route={record.route} />
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 pt-safe-top z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <motion.button
              className="w-10 h-10 rounded-full bg-ds-surface-2/90 backdrop-blur-sm flex items-center justify-center border border-white/10"
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
            >
              <IconChevronLeft size={20} color="white" />
            </motion.button>
            <div className="bg-ds-surface-2/90 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
              <span className="text-xs text-white/70">{dateStr} · {timeStr}</span>
            </div>
            <ModeBadge mode={record.mode} size="sm" />
          </div>
        </div>
      </div>

      {/* Bottom stats panel */}
      <motion.div
        className="bg-ds-surface-2/95 backdrop-blur-xl border-t border-white/10 px-4 py-4 pb-safe-bottom space-y-3"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Route info */}
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-white/70 truncate flex-1">{record.startAddress}</span>
          <span className="text-white/30 text-xs">{timeStr}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
          <span className="text-white/70 truncate flex-1">{record.endAddress}</span>
          <span className="text-white/30 text-xs">{endTimeStr}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          <div className="text-center">
            <div className="text-base font-bold text-ds-primary">{formatDist(record.distance)}</div>
            <div className="text-[10px] text-white/40">Distanz</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold">{formatDur(record.duration)}</div>
            <div className="text-[10px] text-white/40">Dauer</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold">{record.avgSpeed} <span className="text-xs text-white/40">km/h</span></div>
            <div className="text-[10px] text-white/40">Ø Speed</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold">{record.maxSpeed} <span className="text-xs text-white/40">km/h</span></div>
            <div className="text-[10px] text-white/40">Max</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold" style={{ color: record.score >= 75 ? 'var(--color-ds-success)' : record.score >= 50 ? 'var(--color-ds-warning)' : 'var(--color-ds-danger)' }}>{record.score}</div>
            <div className="text-[10px] text-white/40">Score</div>
          </div>
        </div>

        {/* Score bars mini */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          {[
            { l: 'Bremsen', v: record.scores.braking },
            { l: 'Gas', v: record.scores.acceleration },
            { l: 'Kurven', v: record.scores.cornering },
            { l: 'Speed', v: record.scores.speed },
            { l: 'Konstanz', v: record.scores.consistency },
          ].map((s) => (
            <div key={s.l} className="space-y-1">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${s.v}%`,
                    backgroundColor: s.v >= 80 ? 'var(--color-ds-success)' : s.v >= 60 ? 'var(--color-ds-warning)' : 'var(--color-ds-danger)',
                  }}
                />
              </div>
              <div className="text-[9px] text-white/30 text-center">{s.l} {s.v}</div>
            </div>
          ))}
        </div>

        {record.fuelCost != null && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-white/5">
            <span className="text-white/40">Kosten</span>
            <span className="font-medium text-ds-primary">
              {record.fuelCost.toFixed(2)} €
              {record.fuelUsed != null && <span className="text-white/30 ml-1">({record.fuelUsed.toFixed(2)} L)</span>}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Trip Detail Page ────────────────────────────────────────────────────────

export function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useTripHistoryStore((s) => s.getTrip(id ?? ''));
  const [showFullMap, setShowFullMap] = useState(false);

  if (!record) {
    return (
      <Layout showNav={false}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
          <IconCar size={48} />
          <p className="text-ds-text-muted text-center">Fahrt nicht gefunden</p>
          <motion.button
            className="px-6 py-2 rounded-full bg-ds-primary text-ds-bg font-medium"
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/trips')}
          >
            Zurück
          </motion.button>
        </div>
      </Layout>
    );
  }

  const trip = recordToDetail(record);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
  };

  return (
    <Layout showNav={false}>
      <div className="min-h-screen">
        {/* Map Preview Header */}
        <div className="relative h-56 bg-ds-surface overflow-hidden">
          {record.route.length >= 2 ? (
            <TripRouteMap route={record.route} compact onExpand={() => setShowFullMap(true)} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 200 100" className="w-full h-full opacity-30" fill="none">
                <path d="M 20 80 Q 50 20, 80 50 T 140 30 T 180 60" stroke="var(--color-ds-primary)" strokeWidth="3" strokeLinecap="round" fill="none" />
                <circle cx="20" cy="80" r="4" fill="var(--color-ds-success)" />
                <circle cx="180" cy="60" r="4" fill="var(--color-ds-danger)" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-ds-bg/60 via-transparent to-ds-bg pointer-events-none" />

          {/* Back button */}
          <div className="absolute top-0 left-0 right-0 pt-safe-top z-10">
            <div className="flex items-center justify-between px-4 py-3">
              <motion.button
                className="w-10 h-10 rounded-full glass flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
              >
                <IconChevronLeft size={20} color="white" />
              </motion.button>
              <ModeBadge mode={trip.mode} size="sm" />
              <motion.button
                className="w-10 h-10 rounded-full glass flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IconShare size={20} color="white" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 -mt-8 relative z-10 space-y-4 pb-8">
          {/* Score Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard glow className="p-6">
              <div className="flex items-center gap-6">
                <ScoreRing score={trip.score} size={100} strokeWidth={6} label="Score" />
                <div className="flex-1">
                  <h1 className="text-lg font-bold">{trip.startAddress}</h1>
                  <div className="flex items-center gap-1 text-ds-text-muted text-sm mb-2">
                    <IconChevronRight size={12} />
                    {trip.endAddress}
                  </div>
                  <div className="text-xs text-ds-text-muted">{trip.date} · {trip.time} Uhr</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="grid grid-cols-5 gap-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StatCard label="Distanz" value={`${(trip.distance / 1000).toFixed(1)}`} unit="km" />
            <StatCard label="Dauer" value={formatDuration(trip.duration)} />
            <StatCard label="Ø Speed" value={`${trip.avgSpeed.toFixed(0)}`} unit="km/h" />
            <StatCard label="Max" value={`${record.maxSpeed}`} unit="km/h" />
            <StatCard label="Max G" value={`${trip.maxGForce.toFixed(2)}`} unit="g" />
          </motion.div>

          {/* Fuel Cost */}
          {trip.fuelCost != null && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <GlassCard className="p-4 flex items-center justify-between">
                <span className="text-sm text-ds-text-muted">Geschätzte Kosten</span>
                <span className="font-bold text-ds-primary">
                  {trip.fuelCost.toFixed(2)} €
                  {trip.fuelUsed != null && (
                    <span className="text-xs text-ds-text-muted ml-2">({trip.fuelUsed.toFixed(2)} L)</span>
                  )}
                </span>
              </GlassCard>
            </motion.div>
          )}

          {/* Score Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-5">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <IconBarChart size={18} color="var(--color-ds-primary)" />
                Bewertung
              </h2>
              <div className="space-y-3">
                {trip.scores.map((s, i) => (
                  <ScoreBar key={s.label} label={s.label} value={s.value} icon={s.icon} delay={0.25 + i * 0.05} />
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Events Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-5">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <IconClock size={18} color="var(--color-ds-primary)" />
                Ereignisse
                <span className="text-xs text-ds-text-muted ml-auto">
                  <AnimatedNumber value={trip.events.filter(e => e.type === 'positive').length} /> positiv · <AnimatedNumber value={trip.events.filter(e => e.type === 'negative').length} /> negativ
                </span>
              </h2>
              <div>
                {trip.events.map((event, i) => (
                  <EventItem key={i} event={event} index={i} />
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* Full-Screen Map Modal */}
      <AnimatePresence>
        {showFullMap && record.route.length >= 2 && (
          <FullScreenRouteMap record={record} onClose={() => setShowFullMap(false)} />
        )}
      </AnimatePresence>
    </Layout>
  );
}
