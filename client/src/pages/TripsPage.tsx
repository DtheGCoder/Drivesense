import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreRing } from '@/components/ui/DataDisplays';
import { ModeBadge } from '@/components/ui/DataDisplays';
import type { TripMode } from '@/stores/tripStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripSummary {
  id: string;
  date: string;
  time: string;
  mode: TripMode;
  score: number;
  distance: number;
  duration: number;
  avgSpeed: number;
  startAddress: string;
  endAddress: string;
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

const demoTrips: TripSummary[] = [
  { id: '1', date: '2024-01-15', time: '08:34', mode: 'driving_school', score: 87, distance: 12400, duration: 1620, avgSpeed: 27.6, startAddress: 'Zuhause, Musterstr. 12', endAddress: 'Uni Frankfurt' },
  { id: '2', date: '2024-01-14', time: '18:12', mode: 'racing', score: 72, distance: 8900, duration: 720, avgSpeed: 44.5, startAddress: 'Nordwestkreuz', endAddress: 'A5 Abfahrt Bad Homburg' },
  { id: '3', date: '2024-01-14', time: '14:00', mode: 'eco', score: 94, distance: 5300, duration: 840, avgSpeed: 22.7, startAddress: 'Sachsenhausen', endAddress: 'Palmengarten' },
  { id: '4', date: '2024-01-13', time: '20:45', mode: 'free', score: 0, distance: 25600, duration: 2100, avgSpeed: 43.9, startAddress: 'Frankfurt', endAddress: 'Darmstadt' },
  { id: '5', date: '2024-01-12', time: '07:15', mode: 'driving_school', score: 91, distance: 15200, duration: 2400, avgSpeed: 22.8, startAddress: 'Fahrschule Schmidt', endAddress: 'Berger Str.' },
  { id: '6', date: '2024-01-11', time: '17:30', mode: 'racing', score: 65, distance: 18000, duration: 960, avgSpeed: 67.5, startAddress: 'A661 Friedberg', endAddress: 'Offenbacher Kreuz' },
];

// ─── Filters ─────────────────────────────────────────────────────────────────

type ModeFilter = 'all' | TripMode;

const modeFilters: { key: ModeFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'driving_school', label: '🎓 Fahrschule' },
  { key: 'racing', label: '🏁 Racing' },
  { key: 'eco', label: '🌿 Eco' },
  { key: 'free', label: '✨ Frei' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Heute';
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// ─── Trip Row Component ──────────────────────────────────────────────────────

function TripRow({ trip, index }: { trip: TripSummary; index: number }) {
  const navigate = useNavigate();

  return (
    <motion.button
      className="w-full text-left"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/trips/${trip.id}`)}
    >
      <GlassCard className="p-4 hover:border-ds-primary/30 transition-colors">
        <div className="flex items-center gap-4">
          {/* Score */}
          <div className="flex-shrink-0">
            {trip.mode === 'free' ? (
              <div className="w-14 h-14 rounded-full bg-ds-surface-2 flex items-center justify-center text-lg">
                ✨
              </div>
            ) : (
              <ScoreRing score={trip.score} size={56} strokeWidth={4} />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm truncate">{trip.startAddress}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-text-muted)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="font-semibold text-sm truncate">{trip.endAddress}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-ds-text-muted">
              <span>{formatDate(trip.date)} · {trip.time}</span>
              <span>{formatDistance(trip.distance)}</span>
              <span>{formatDuration(trip.duration)}</span>
            </div>
          </div>

          {/* Mode badge */}
          <div className="flex-shrink-0">
            <ModeBadge mode={trip.mode} size="sm" />
          </div>
        </div>
      </GlassCard>
    </motion.button>
  );
}

// ─── Trip History Page ───────────────────────────────────────────────────────

export function TripsPage() {
  const [activeFilter, setActiveFilter] = useState<ModeFilter>('all');

  const filtered = activeFilter === 'all' ? demoTrips : demoTrips.filter((t) => t.mode === activeFilter);

  // Group by date
  const grouped = filtered.reduce<Record<string, TripSummary[]>>((acc, trip) => {
    const key = formatDate(trip.date);
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(trip);
    return acc;
  }, {});

  return (
    <Layout showNav>
      <div className="px-4 py-6 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold">Fahrten</h1>
          <p className="text-sm text-ds-text-muted mt-1">{demoTrips.length} Fahrten aufgezeichnet</p>
        </motion.div>

        {/* Stats overview */}
        <motion.div
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-3 text-center">
            <div className="text-xl font-bold text-ds-primary">85</div>
            <div className="text-xs text-ds-text-muted">Ø Score</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-xl font-bold">85.4 km</div>
            <div className="text-xs text-ds-text-muted">Gesamt</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-xl font-bold">2h 25m</div>
            <div className="text-xs text-ds-text-muted">Fahrzeit</div>
          </GlassCard>
        </motion.div>

        {/* Mode filters */}
        <motion.div
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {modeFilters.map((f) => (
            <button
              key={f.key}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === f.key
                  ? 'bg-ds-primary text-ds-bg'
                  : 'bg-ds-surface-2 text-ds-text-muted hover:text-ds-text hover:bg-ds-surface-2/80'
              }`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Trip list */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateLabel, trips]) => (
            <div key={dateLabel} className="space-y-2">
              <div className="text-xs font-medium text-ds-text-muted uppercase tracking-wider px-1">
                {dateLabel}
              </div>
              <div className="space-y-2">
                {trips.map((trip, i) => (
                  <TripRow key={trip.id} trip={trip} index={i} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🚗</div>
            <p className="text-ds-text-muted">Keine Fahrten in diesem Modus</p>
          </div>
        )}

        {/* Bottom spacer for nav */}
        <div className="h-20" />
      </div>
    </Layout>
  );
}
