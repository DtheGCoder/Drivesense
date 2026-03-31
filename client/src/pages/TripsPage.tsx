import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreRing } from '@/components/ui/DataDisplays';
import { ModeBadge } from '@/components/ui/DataDisplays';
import { IconChevronRight, IconModeFree, IconCar } from '@/components/ui/Icons';
import type { TripMode } from '@/stores/tripStore';
import { useTripHistoryStore, type TripRecord } from '@/stores/tripHistoryStore';

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

// Convert TripRecord to TripSummary for display
function recordToSummary(r: TripRecord): TripSummary {
  const d = new Date(r.startedAt);
  return {
    id: r.id,
    date: d.toISOString().split('T')[0]!,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    mode: r.mode,
    score: r.score,
    distance: r.distance,
    duration: r.duration,
    avgSpeed: r.avgSpeed,
    startAddress: r.startAddress,
    endAddress: r.endAddress,
  };
}

// ─── Filters ─────────────────────────────────────────────────────────────────

type ModeFilter = 'all' | TripMode;

const modeFilters: { key: ModeFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'driving_school', label: 'Fahrschule' },
  { key: 'racing', label: 'Racing' },
  { key: 'eco', label: 'Eco' },
  { key: 'free', label: 'Frei' },
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
              <div className="w-14 h-14 rounded-full bg-ds-surface-2 flex items-center justify-center text-ds-mode-free">
                <IconModeFree size={22} />
              </div>
            ) : (
              <ScoreRing score={trip.score} size={56} strokeWidth={4} />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm truncate">{trip.startAddress}</span>
              <IconChevronRight size={14} color="var(--color-ds-text-muted)" />
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
  const tripRecords = useTripHistoryStore((s) => s.trips);

  const allTrips = tripRecords.map(recordToSummary);
  const filtered = activeFilter === 'all' ? allTrips : allTrips.filter((t) => t.mode === activeFilter);

  // Stats from real data
  const scoredTrips = allTrips.filter((t) => t.mode !== 'free');
  const avgScore = scoredTrips.length > 0 ? Math.round(scoredTrips.reduce((s, t) => s + t.score, 0) / scoredTrips.length) : 0;
  const totalDistance = allTrips.reduce((s, t) => s + t.distance, 0);
  const totalDuration = allTrips.reduce((s, t) => s + t.duration, 0);

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
          <p className="text-sm text-ds-text-muted mt-1">{allTrips.length} Fahrten aufgezeichnet</p>
        </motion.div>

        {/* Stats overview */}
        <motion.div
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-3 text-center">
            <div className="text-xl font-bold text-ds-primary">{avgScore}</div>
            <div className="text-xs text-ds-text-muted">Ø Score</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-xl font-bold">{formatDistance(totalDistance)}</div>
            <div className="text-xs text-ds-text-muted">Gesamt</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-xl font-bold">{formatDuration(totalDuration)}</div>
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
            <div className="mb-3 text-ds-text-muted"><IconCar size={40} /></div>
            <p className="text-ds-text-muted">Keine Fahrten in diesem Modus</p>
          </div>
        )}

        {/* Bottom spacer for nav */}
        <div className="h-20" />
      </div>
    </Layout>
  );
}
