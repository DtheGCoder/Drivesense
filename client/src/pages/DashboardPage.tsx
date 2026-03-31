import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { GlassCard, StatCard } from '@/components/ui/GlassCard';
import { ScoreRing, ModeBadge } from '@/components/ui/DataDisplays';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { IconRoute, IconActivity, IconStar, IconTrophy, IconPlay, IconChevronRight, IconCar } from '@/components/ui/Icons';
import { useTripHistoryStore } from '@/stores/tripHistoryStore';

// Stagger children animation
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// Helpers
function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
}

function formatTripDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === today.toDateString()) return `Heute, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Gestern, ${time}`;
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, ${time}`;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const trips = useTripHistoryStore((s) => s.trips);

  // Compute stats from real data
  const scoredTrips = trips.filter((t) => t.mode !== 'free');
  const avgScore = scoredTrips.length > 0 ? Math.round(scoredTrips.reduce((s, t) => s + t.score, 0) / scoredTrips.length) : 0;
  const totalDistance = trips.reduce((s, t) => s + t.distance, 0);
  const bestScore = scoredTrips.length > 0 ? Math.max(...scoredTrips.map((t) => t.score)) : 0;
  const recentTrips = trips.slice(0, 3);

  return (
    <Layout>
      <motion.div
        className="max-w-lg mx-auto py-6 space-y-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Hey, <span className="text-gradient">{user?.displayName ?? user?.username ?? 'Fahrer'}</span>
            </h1>
            <p className="text-sm text-ds-text-muted mt-0.5">Bereit für die nächste Fahrt?</p>
          </div>
          <motion.div
            className="w-11 h-11 rounded-full bg-gradient-to-br from-ds-primary/20 to-ds-primary/5 border border-ds-primary/20 flex items-center justify-center"
            whileHover={{ scale: 1.05, borderColor: 'rgba(0,240,255,0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
          >
            <span className="text-lg">
              {(user?.username?.[0] ?? 'D').toUpperCase()}
            </span>
          </motion.div>
        </motion.div>

        {/* Overall Score Card */}
        <motion.div variants={item}>
          <GlassCard glow className="flex items-center gap-6">
            <ScoreRing score={avgScore} size={100} label="Gesamt" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-ds-text">Gesamtwertung</h3>
                <p className="text-xs text-ds-text-muted">Basierend auf {scoredTrips.length} Fahrten</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <ModeBadge mode="driving_school" size="sm" />
                <ModeBadge mode="eco" size="sm" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3">
          <StatCard
            label="Kilometer"
            value={formatDistance(totalDistance)}
            icon={
              <IconRoute size={18} />
            }
          />
          <StatCard
            label="Fahrten"
            value={String(trips.length)}
            icon={
              <IconActivity size={18} />
            }
          />
          <StatCard
            label="Ø Score"
            value={String(avgScore)}
            unit="Punkte"
            color="var(--color-ds-primary)"
            icon={
              <IconStar size={18} />
            }
          />
          <StatCard
            label="Bestes Ergebnis"
            value={String(bestScore)}
            unit="Punkte"
            color="var(--color-ds-score-excellent)"
            icon={
              <IconTrophy size={18} />
            }
          />
        </motion.div>

        {/* Start Drive CTA */}
        <motion.div variants={item}>
          <GlassCard className="text-center space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Fahrt starten</h3>
              <p className="text-sm text-ds-text-muted">Wähle deinen Modus und los geht's</p>
            </div>
            <div className="flex justify-center gap-2">
              <ModeBadge mode="driving_school" />
              <ModeBadge mode="racing" />
              <ModeBadge mode="eco" />
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/drive')}
              icon={
                <IconPlay size={20} />
              }
            >
              Fahrt beginnen
            </Button>
          </GlassCard>
        </motion.div>

        {/* Recent Trips */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-ds-text-secondary uppercase tracking-wider">
              Letzte Fahrten
            </h2>
            <button
              className="text-xs text-ds-primary font-medium hover:text-ds-primary-dim transition-colors"
              onClick={() => navigate('/trips')}
            >
              Alle anzeigen →
            </button>
          </div>
          <div className="space-y-2">
            {recentTrips.length === 0 ? (
              <GlassCard className="!p-6 text-center" animate={false}>
                <div className="text-ds-text-muted mb-2"><IconCar size={32} /></div>
                <p className="text-sm text-ds-text-muted">Noch keine Fahrten aufgezeichnet</p>
              </GlassCard>
            ) : (
              recentTrips.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <GlassCard
                  className="flex items-center gap-4 !p-4"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  animate={false}
                >
                  <ScoreRing score={trip.score} size={48} strokeWidth={4} showValue={true} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{formatTripDate(trip.startedAt)}</span>
                      <ModeBadge mode={trip.mode} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-ds-text-muted">
                      <span>{formatDistance(trip.distance)}</span>
                      <span>·</span>
                      <span>{formatDuration(trip.duration)}</span>
                    </div>
                  </div>
                  <IconChevronRight size={16} color="var(--color-ds-text-muted)" />
                </GlassCard>
              </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </motion.div>
    </Layout>
  );
}
