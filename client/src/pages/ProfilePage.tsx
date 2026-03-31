import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreRing, AnimatedNumber } from '@/components/ui/DataDisplays';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

// ─── Demo Data ───────────────────────────────────────────────────────────────

const demoProfile = {
  username: 'drivesense_user',
  email: 'fahrer@example.de',
  memberSince: 'Januar 2024',
  totalTrips: 45,
  totalDistance: 285000,
  totalDuration: 36000,
  avgScore: 87,
  bestScore: 97,
  badges: [
    { icon: '🏆', label: 'Top 5%', desc: 'Unter den besten 5% Fahrern' },
    { icon: '🎯', label: '10er Serie', desc: '10 Fahrten über 85 Punkte' },
    { icon: '🌿', label: 'Öko-Held', desc: '5 perfekte Eco-Fahrten' },
    { icon: '🌙', label: 'Nachtfahrer', desc: '10+ Nachtfahrten gemeistert' },
    { icon: '📈', label: 'Aufsteiger', desc: 'Score um 15+ verbessert' },
  ],
};

const settingsItems = [
  { icon: '🔔', label: 'Benachrichtigungen', desc: 'Push, Email, Sound' },
  { icon: '📏', label: 'Einheiten', desc: 'km/h, Metrisch' },
  { icon: '🎨', label: 'Darstellung', desc: 'Dunkel (Standard)' },
  { icon: '🔒', label: 'Datenschutz', desc: 'Sichtbarkeit, Freunde' },
  { icon: '📤', label: 'Daten exportieren', desc: 'GPX, CSV, JSON' },
  { icon: '❓', label: 'Hilfe & Support', desc: 'FAQ, Kontakt' },
];

// ─── Profile Page ────────────────────────────────────────────────────────────

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <Layout showNav>
      <div className="px-4 py-6 space-y-5">
        {/* Profile Header */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-ds-primary/30 to-ds-primary-dim/30 flex items-center justify-center text-4xl flex-shrink-0"
            style={{ width: 72, height: 72 }}
          >
            👤
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{demoProfile.username}</h1>
            <p className="text-sm text-ds-text-muted">{demoProfile.email}</p>
            <p className="text-xs text-ds-text-muted mt-0.5">Seit {demoProfile.memberSince}</p>
          </div>
          <motion.button
            className="w-10 h-10 rounded-full glass flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-text-muted)" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard glow className="p-4 flex items-center gap-3">
            <ScoreRing score={demoProfile.avgScore} size={56} strokeWidth={4} label="Ø" />
            <div>
              <div className="text-xs text-ds-text-muted">Ø Score</div>
              <div className="text-xl font-bold"><AnimatedNumber value={demoProfile.avgScore} /></div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center gap-3">
            <ScoreRing score={demoProfile.bestScore} size={56} strokeWidth={4} label="Best" />
            <div>
              <div className="text-xs text-ds-text-muted">Bester</div>
              <div className="text-xl font-bold"><AnimatedNumber value={demoProfile.bestScore} /></div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard className="p-3 text-center">
            <div className="text-lg font-bold"><AnimatedNumber value={demoProfile.totalTrips} /></div>
            <div className="text-xs text-ds-text-muted">Fahrten</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-lg font-bold">{(demoProfile.totalDistance / 1000).toFixed(0)} km</div>
            <div className="text-xs text-ds-text-muted">Gesamt</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-lg font-bold">{Math.round(demoProfile.totalDuration / 3600)}h</div>
            <div className="text-xs text-ds-text-muted">Fahrzeit</div>
          </GlassCard>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-5">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg">🏅</span>
              Abzeichen
              <span className="text-xs text-ds-text-muted ml-auto">{demoProfile.badges.length} erhalten</span>
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {demoProfile.badges.map((badge, i) => (
                <motion.div
                  key={badge.label}
                  className="flex-shrink-0 w-20 text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                >
                  <div className="w-14 h-14 rounded-xl bg-ds-surface-2 flex items-center justify-center text-2xl mx-auto mb-1">
                    {badge.icon}
                  </div>
                  <div className="text-xs font-medium leading-tight">{badge.label}</div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="divide-y divide-ds-border/50 overflow-hidden">
            {settingsItems.map((item) => (
              <button
                key={item.label}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-ds-surface-2/30 transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-ds-text-muted">{item.desc}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-text-muted)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </GlassCard>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="danger"
            fullWidth
            onClick={() => setShowLogout(true)}
          >
            Abmelden
          </Button>
        </motion.div>

        {/* Version */}
        <div className="text-center text-xs text-ds-text-muted pb-4">
          DriveSense v1.0.0 · Made with ❤️
        </div>

        <div className="h-20" />

        {/* Logout confirmation */}
        {showLogout && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowLogout(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 glass rounded-t-3xl p-6 space-y-4 text-center"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              <div className="w-10 h-1 bg-ds-border rounded-full mx-auto" />
              <h2 className="text-lg font-bold">Möchtest du dich abmelden?</h2>
              <div className="flex gap-3">
                <Button variant="secondary" size="lg" fullWidth onClick={() => setShowLogout(false)}>
                  Abbrechen
                </Button>
                <Button variant="danger" size="lg" fullWidth onClick={() => { logout(); navigate('/login'); }}>
                  Abmelden
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </Layout>
  );
}
