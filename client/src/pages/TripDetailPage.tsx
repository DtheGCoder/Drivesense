import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { GlassCard, StatCard } from '@/components/ui/GlassCard';
import { ScoreRing, ModeBadge, AnimatedNumber } from '@/components/ui/DataDisplays';
import type { TripMode } from '@/stores/tripStore';

// ─── Demo Trip Detail ────────────────────────────────────────────────────────

interface TripDetail {
  id: string;
  mode: TripMode;
  score: number;
  date: string;
  time: string;
  duration: number;
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
  maxGForce: number;
  startAddress: string;
  endAddress: string;
  scores: { label: string; value: number; icon: string }[];
  events: { time: string; message: string; points: number; type: 'positive' | 'negative' | 'neutral' }[];
}

const demoDetail: TripDetail = {
  id: '1',
  mode: 'driving_school',
  score: 87,
  date: '15.01.2024',
  time: '08:34',
  duration: 1620,
  distance: 12400,
  avgSpeed: 27.6,
  maxSpeed: 58,
  maxGForce: 0.42,
  startAddress: 'Zuhause, Musterstr. 12',
  endAddress: 'Uni Frankfurt',
  scores: [
    { label: 'Bremsen', value: 92, icon: '🛑' },
    { label: 'Beschleunigung', value: 88, icon: '🚀' },
    { label: 'Kurven', value: 85, icon: '🔄' },
    { label: 'Geschwindigkeit', value: 90, icon: '⚡' },
    { label: 'Konstanz', value: 80, icon: '📊' },
    { label: 'Voraussicht', value: 89, icon: '👁️' },
  ],
  events: [
    { time: '08:36', message: 'Sanftes Anfahren am Berg', points: 3, type: 'positive' },
    { time: '08:39', message: 'Optimale Kurvengeschwindigkeit', points: 2, type: 'positive' },
    { time: '08:42', message: 'Harte Bremsung – Ampel', points: -5, type: 'negative' },
    { time: '08:45', message: 'Gleichmäßige Autobahnfahrt', points: 4, type: 'positive' },
    { time: '08:48', message: 'Reißverschluss vorbildlich', points: 3, type: 'positive' },
    { time: '08:52', message: 'Kupplung bei Schalten geschleift', points: -2, type: 'negative' },
    { time: '08:55', message: 'Perfektes Einparken', points: 5, type: 'positive' },
  ],
};

// ─── Score Bar ───────────────────────────────────────────────────────────────

function ScoreBar({ label, value, icon, delay }: { label: string; value: number; icon: string; delay: number }) {
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

function EventItem({ event, index }: { event: TripDetail['events'][number]; index: number }) {
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

// ─── Trip Detail Page ────────────────────────────────────────────────────────

export function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const trip = demoDetail; // Use demo data for now
  void id;

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
  };

  return (
    <Layout showNav={false}>
      <div className="min-h-screen">
        {/* Map Preview Header */}
        <div className="relative h-48 bg-ds-surface overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-ds-bg/70 via-transparent to-ds-bg" />

          {/* Placeholder map route preview */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 200 100" className="w-full h-full opacity-30" fill="none">
              <path
                d="M 20 80 Q 50 20, 80 50 T 140 30 T 180 60"
                stroke="var(--color-ds-primary)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="20" cy="80" r="4" fill="var(--color-ds-success)" />
              <circle cx="180" cy="60" r="4" fill="var(--color-ds-danger)" />
            </svg>
          </div>

          {/* Back button */}
          <div className="absolute top-0 left-0 right-0 pt-safe-top z-10">
            <div className="flex items-center justify-between px-4 py-3">
              <motion.button
                className="w-10 h-10 rounded-full glass flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </motion.button>
              <ModeBadge mode={trip.mode} size="sm" />
              <motion.button
                className="w-10 h-10 rounded-full glass flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    {trip.endAddress}
                  </div>
                  <div className="text-xs text-ds-text-muted">{trip.date} · {trip.time} Uhr</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="grid grid-cols-4 gap-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StatCard label="Distanz" value={`${(trip.distance / 1000).toFixed(1)}`} unit="km" />
            <StatCard label="Dauer" value={formatDuration(trip.duration)} />
            <StatCard label="Ø Speed" value={`${trip.avgSpeed.toFixed(0)}`} unit="km/h" />
            <StatCard label="Max G" value={`${trip.maxGForce.toFixed(2)}`} unit="g" />
          </motion.div>

          {/* Score Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-5">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-primary)" strokeWidth="2">
                  <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                </svg>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-primary)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
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
    </Layout>
  );
}
