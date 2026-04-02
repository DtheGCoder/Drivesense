import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreRing, ModeBadge, AnimatedNumber } from '@/components/ui/DataDisplays';
import { IconChevronLeft, IconChevronRight, IconBarChart, IconClock, IconShield, IconZap, IconGauge, IconActivity, IconCar } from '@/components/ui/Icons';
import { useTripHistoryStore, type TripRecord } from '@/stores/tripHistoryStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recordToDetail(r: TripRecord) {
  const d = new Date(r.startedAt);
  const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const endTime = new Date(r.endedAt);
  const endTimeStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
  return {
    id: r.id,
    mode: r.mode,
    score: r.score,
    date: dateStr,
    time: timeStr,
    endTime: endTimeStr,
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
        details: e.details,
        points: e.points,
        type: e.type,
      };
    }),
    fuelCost: r.fuelCost,
    fuelUsed: r.fuelUsed,
  };
}

const formatDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
const formatDur = (s: number) => { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`; };

function getScoreColor(v: number) {
  if (v >= 90) return 'var(--color-ds-score-excellent)';
  if (v >= 75) return 'var(--color-ds-score-good)';
  if (v >= 60) return 'var(--color-ds-score-ok)';
  if (v >= 40) return 'var(--color-ds-score-warn)';
  return 'var(--color-ds-score-bad)';
}

// ─── Score Bar ───────────────────────────────────────────────────────────────

function ScoreBar({ label, value, icon, delay }: { label: string; value: number; icon: ReactNode; delay: number }) {
  return (
    <motion.div
      className="space-y-1.5"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm flex items-center gap-1.5">
          <span className="text-white/50">{icon}</span> {label}
        </span>
        <span className="text-sm font-semibold" style={{ color: getScoreColor(value) }}>
          {value}
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: getScoreColor(value) }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: delay + 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </motion.div>
  );
}

// ─── Event List Item ─────────────────────────────────────────────────────────

function EventItem({ event, index }: { event: { time: string; message: string; details?: string; points: number; type: 'positive' | 'negative' | 'neutral' }; index: number }) {
  const isPositive = event.type === 'positive';
  const isNeutral = event.type === 'neutral';
  const dotColor = isPositive ? 'rgba(34,197,94,0.15)' : isNeutral ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.15)';
  const textColor = isPositive ? 'var(--color-ds-success)' : isNeutral ? 'var(--color-ds-text-muted)' : 'var(--color-ds-danger)';
  return (
    <motion.div
      className="py-2.5 border-b border-white/5 last:border-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: dotColor, color: textColor }}
        >
          {isPositive ? '+' : isNeutral ? '○' : '−'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{event.message}</p>
          <p className="text-xs text-white/30">{event.time} Uhr</p>
        </div>
        {event.points !== 0 && (
          <span
            className="text-sm font-semibold flex-shrink-0"
            style={{ color: textColor }}
          >
            {isPositive ? '+' : ''}{event.points}
          </span>
        )}
      </div>
      {event.details && (
        <div className="ml-11 mt-1.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
          <p className="text-xs text-white/50 leading-relaxed whitespace-pre-line">{event.details}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Trip Route Map ──────────────────────────────────────────────────────────

function TripRouteMap({ route, interactive }: { route: [number, number][]; interactive?: boolean }) {
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
      interactive: !!interactive,
      attributionControl: false,
    });

    m.on('load', () => {
      m.addSource('trip-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } },
      });
      // Glow
      m.addLayer({
        id: 'trip-route-glow',
        type: 'line',
        source: 'trip-route',
        paint: { 'line-color': '#22d3ee', 'line-width': 12, 'line-opacity': 0.15, 'line-blur': 8 },
      });
      m.addLayer({
        id: 'trip-route-outline',
        type: 'line',
        source: 'trip-route',
        paint: { 'line-color': '#0e7490', 'line-width': 6, 'line-opacity': 0.6 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      m.addLayer({
        id: 'trip-route-line',
        type: 'line',
        source: 'trip-route',
        paint: { 'line-color': '#22d3ee', 'line-width': 3.5, 'line-opacity': 1 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      // Start marker
      const startEl = document.createElement('div');
      startEl.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid rgba(255,255,255,0.9);box-shadow:0 0 12px rgba(34,197,94,0.5),0 2px 8px rgba(0,0,0,0.3)"></div>`;
      new mapboxgl.Marker({ element: startEl, anchor: 'center' }).setLngLat(route[0]!).addTo(m);

      // End marker
      const endEl = document.createElement('div');
      endEl.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid rgba(255,255,255,0.9);box-shadow:0 0 12px rgba(239,68,68,0.5),0 2px 8px rgba(0,0,0,0.3)"></div>`;
      new mapboxgl.Marker({ element: endEl, anchor: 'center' }).setLngLat(route[route.length - 1]!).addTo(m);

      const bounds = new mapboxgl.LngLatBounds();
      for (const coord of route) bounds.extend(coord);
      m.fitBounds(bounds, { padding: interactive ? 60 : { top: 80, bottom: 40, left: 30, right: 30 }, duration: 0 });
    });

    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, [route, interactive]);

  return <div ref={containerRef} className="w-full h-full" />;
}

// ─── Full-Screen Map Modal ───────────────────────────────────────────────────

function FullScreenRouteMap({ record, onClose }: { record: TripRecord; onClose: () => void }) {
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
      {/* Map fills screen */}
      <div className="flex-1 relative">
        <TripRouteMap route={record.route} interactive />

        {/* Top bar - high contrast */}
        <div className="absolute top-0 left-0 right-0 pt-safe-top z-20">
          <div className="flex items-center gap-3 px-4 py-3">
            <motion.button
              className="w-11 h-11 rounded-2xl bg-black/70 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-lg"
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
            >
              <IconChevronLeft size={22} color="white" />
            </motion.button>
            <div className="flex-1" />
            <div className="bg-black/70 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/15 shadow-lg">
              <span className="text-xs font-medium text-white/80">{dateStr} · {timeStr} – {endTimeStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats sheet */}
      <motion.div
        className="bg-[#141420]/98 backdrop-blur-2xl border-t border-white/8 px-5 pt-5 pb-safe-bottom space-y-4"
        initial={{ y: 120 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.15, type: 'spring', damping: 25 }}
      >
        {/* Route endpoints */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <span className="text-sm text-white/80 truncate flex-1">{record.startAddress}</span>
            <span className="text-[11px] text-white/30 tabular-nums">{timeStr}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            <span className="text-sm text-white/80 truncate flex-1">{record.endAddress}</span>
            <span className="text-[11px] text-white/30 tabular-nums">{endTimeStr}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-between py-2">
          {[
            { label: 'Distanz', value: formatDist(record.distance), accent: true },
            { label: 'Dauer', value: formatDur(record.duration) },
            { label: 'Ø Speed', value: `${record.avgSpeed}`, unit: 'km/h' },
            { label: 'Max', value: `${record.maxSpeed}`, unit: 'km/h' },
            { label: 'Score', value: `${record.score}`, accent: record.score >= 75 },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className={`text-lg font-bold tabular-nums ${s.accent ? 'text-ds-primary' : 'text-white'}`}>
                {s.value}
                {s.unit && <span className="text-[10px] text-white/40 ml-0.5 font-medium">{s.unit}</span>}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Score bars mini */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { l: 'Bremsen', v: record.scores.braking },
            { l: 'Gas', v: record.scores.acceleration },
            { l: 'Kurven', v: record.scores.cornering },
            { l: 'Speed', v: record.scores.speed },
            { l: 'Konstanz', v: record.scores.consistency },
          ].map((s) => (
            <div key={s.l} className="space-y-1.5">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${s.v}%`, backgroundColor: getScoreColor(s.v) }} />
              </div>
              <div className="text-[9px] text-white/30 text-center">{s.l} <span className="font-medium text-white/50">{s.v}</span></div>
            </div>
          ))}
        </div>

        {record.fuelCost != null && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-white/5">
            <span className="text-white/40">Geschätzte Kosten</span>
            <span className="font-semibold text-ds-primary">
              {record.fuelCost.toFixed(2)} €
              {record.fuelUsed != null && <span className="text-white/30 font-normal ml-1.5">({record.fuelUsed.toFixed(2)} L)</span>}
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

  return (
    <Layout showNav={false}>
      <div className="min-h-screen bg-ds-bg">
        {/* ══ Map Header ══ */}
        <div className="relative h-64 bg-ds-surface overflow-hidden">
          {record.route.length >= 2 ? (
            <TripRouteMap route={record.route} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-ds-surface-2">
              <svg viewBox="0 0 200 100" className="w-40 opacity-20" fill="none">
                <path d="M 20 80 Q 50 20, 80 50 T 140 30 T 180 60" stroke="var(--color-ds-primary)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="20" cy="80" r="4" fill="#22c55e" />
                <circle cx="180" cy="60" r="4" fill="#ef4444" />
              </svg>
            </div>
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ds-bg/80 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ds-bg to-transparent pointer-events-none" />

          {/* Top bar - high contrast buttons */}
          <div className="absolute top-0 left-0 right-0 pt-safe-top z-20">
            <div className="flex items-center justify-between px-4 py-3">
              <motion.button
                className="w-11 h-11 rounded-2xl bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-lg"
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
              >
                <IconChevronLeft size={22} color="white" />
              </motion.button>
              <ModeBadge mode={trip.mode} size="sm" />
              {record.route.length >= 2 ? (
                <motion.button
                  className="h-11 px-4 rounded-2xl bg-black/60 backdrop-blur-md flex items-center justify-center gap-2 border border-white/15 shadow-lg"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowFullMap(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                  <span className="text-xs font-medium text-white">Karte</span>
                </motion.button>
              ) : <div className="w-11" />}
            </div>
          </div>
        </div>

        {/* ══ Content ══ */}
        <div className="px-4 -mt-6 relative z-10 space-y-4 pb-8">

          {/* Score + Route Info Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard glow className="p-5">
              <div className="flex items-center gap-5">
                <ScoreRing score={trip.score} size={90} strokeWidth={5} label="Score" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-bold truncate">{trip.startAddress}</h1>
                  <div className="flex items-center gap-1.5 text-white/50 text-sm mt-0.5">
                    <IconChevronRight size={11} />
                    <span className="truncate">{trip.endAddress}</span>
                  </div>
                  <div className="text-[11px] text-white/30 mt-2">{trip.date} · {trip.time} – {trip.endTime} Uhr</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            className="grid grid-cols-4 gap-2.5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            {[
              { label: 'Distanz', value: formatDist(trip.distance), accent: true },
              { label: 'Dauer', value: formatDur(trip.duration) },
              { label: 'Ø Speed', value: `${trip.avgSpeed} km/h` },
              { label: 'Max Speed', value: `${trip.maxSpeed} km/h` },
            ].map((s) => (
              <GlassCard key={s.label} className="p-3 text-center">
                <div className={`text-sm font-bold tabular-nums ${s.accent ? 'text-ds-primary' : 'text-white'}`}>{s.value}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
              </GlassCard>
            ))}
          </motion.div>

          {/* Max G + Fuel in row */}
          <motion.div
            className="grid grid-cols-2 gap-2.5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <GlassCard className="p-3 flex items-center justify-between">
              <span className="text-xs text-white/40">Max G-Force</span>
              <span className="text-sm font-bold tabular-nums">{trip.maxGForce.toFixed(2)} <span className="text-[10px] text-white/30">g</span></span>
            </GlassCard>
            {trip.fuelCost != null ? (
              <GlassCard className="p-3 flex items-center justify-between">
                <span className="text-xs text-white/40">Kosten</span>
                <span className="text-sm font-bold text-ds-primary tabular-nums">
                  {trip.fuelCost.toFixed(2)} €
                  {trip.fuelUsed != null && <span className="text-[10px] text-white/30 font-normal ml-1">({trip.fuelUsed.toFixed(1)} L)</span>}
                </span>
              </GlassCard>
            ) : (
              <GlassCard className="p-3 flex items-center justify-between">
                <span className="text-xs text-white/40">GPS Punkte</span>
                <span className="text-sm font-bold tabular-nums">{record.route.length}</span>
              </GlassCard>
            )}
          </motion.div>

          {/* Score Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <GlassCard className="p-5">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white/70">
                <IconBarChart size={16} color="var(--color-ds-primary)" />
                Bewertung
              </h2>
              <div className="space-y-3">
                {trip.scores.map((s, i) => (
                  <ScoreBar key={s.label} label={s.label} value={s.value} icon={s.icon} delay={0.22 + i * 0.04} />
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Events Timeline */}
          {trip.events.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <GlassCard className="p-5">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-white/70">
                  <IconClock size={16} color="var(--color-ds-primary)" />
                  Ereignisse
                  <span className="text-[11px] text-white/30 ml-auto font-normal">
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
          )}
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
