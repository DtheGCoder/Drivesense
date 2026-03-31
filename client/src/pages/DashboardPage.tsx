import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { GlassCard, StatCard } from '@/components/ui/GlassCard';
import { ScoreRing, ModeBadge } from '@/components/ui/DataDisplays';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

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

// Mock data for demonstration
const recentTrips = [
  { id: '1', date: 'Heute, 14:30', distance: '12.4 km', duration: '23 min', score: 87, mode: 'driving_school' as const },
  { id: '2', date: 'Heute, 09:15', distance: '5.2 km', duration: '12 min', score: 92, mode: 'eco' as const },
  { id: '3', date: 'Gestern, 18:45', distance: '34.1 km', duration: '42 min', score: 78, mode: 'racing' as const },
];

const activeFriends = [
  { id: '1', username: 'MaxSpeed', status: 'driving', score: 94 },
  { id: '2', username: 'EcoDriven', status: 'driving', score: 88 },
  { id: '3', username: 'CurveKing', status: 'online', score: 0 },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

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
            <ScoreRing score={85} size={100} label="Gesamt" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-ds-text">Gesamtwertung</h3>
                <p className="text-xs text-ds-text-muted">Basierend auf 47 Fahrten</p>
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
            value="1,247"
            unit="km"
            trend="up"
            trendValue="+86 km diese Woche"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 19h20L12 2z" />
              </svg>
            }
          />
          <StatCard
            label="Fahrten"
            value="47"
            trend="up"
            trendValue="+5 diese Woche"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />
          <StatCard
            label="Rekorde"
            value="12"
            color="var(--color-ds-primary)"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
              </svg>
            }
          />
          <StatCard
            label="Bestes Ergebnis"
            value="96"
            unit="Punkte"
            color="var(--color-ds-score-excellent)"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 6 9 6 9z" />
                <path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 18 9 18 9z" />
                <path d="M18 2H6v7a6 6 0 0012 0V2z" />
              </svg>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
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
            {recentTrips.map((trip, i) => (
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
                      <span className="text-sm font-medium truncate">{trip.date}</span>
                      <ModeBadge mode={trip.mode} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-ds-text-muted">
                      <span>{trip.distance}</span>
                      <span>·</span>
                      <span>{trip.duration}</span>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-text-muted)" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Active Friends */}
        <motion.div variants={item} className="space-y-3">
          <h2 className="text-sm font-semibold text-ds-text-secondary uppercase tracking-wider px-1">
            Freunde online
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {activeFriends.map((friend, i) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1, type: 'spring', stiffness: 300 }}
              >
                <GlassCard className="!p-3 min-w-[100px] flex flex-col items-center gap-2" animate={false}>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-ds-surface-3 flex items-center justify-center text-sm font-bold">
                      {friend.username[0]}
                    </div>
                    {friend.status === 'driving' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-ds-success border-2 border-ds-surface animate-pulse-glow" />
                    )}
                  </div>
                  <span className="text-xs font-medium truncate max-w-full">{friend.username}</span>
                  {friend.status === 'driving' && (
                    <span className="text-[10px] text-ds-success font-medium">Unterwegs</span>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
