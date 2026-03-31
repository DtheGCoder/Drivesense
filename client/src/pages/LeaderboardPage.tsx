import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreRing, ModeBadge } from '@/components/ui/DataDisplays';
import { IconGlobe, IconUsers, IconMap, IconMedalGold, IconMedalSilver, IconMedalBronze, IconUser } from '@/components/ui/Icons';
import type { TripMode } from '@/stores/tripStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  score: number;
  trips: number;
  distance: number;
  isMe?: boolean;
}

interface SegmentRecord {
  segmentName: string;
  record: { username: string; time: number; mode: TripMode };
  myBest?: number;
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

const demoRankings: Record<string, LeaderboardEntry[]> = {
  global: [
    { rank: 1, username: 'MaxRacer', avatar: 'MR', score: 96, trips: 142, distance: 1245000 },
    { rank: 2, username: 'SafeDriver42', avatar: 'SD', score: 94, trips: 98, distance: 890000 },
    { rank: 3, username: 'EcoQueen', avatar: 'EQ', score: 93, trips: 201, distance: 1540000 },
    { rank: 4, username: 'Du', avatar: 'DU', score: 87, trips: 45, distance: 285000, isMe: true },
    { rank: 5, username: 'NightRider', avatar: 'NR', score: 85, trips: 67, distance: 430000 },
    { rank: 6, username: 'CurveMaster', avatar: 'CM', score: 83, trips: 89, distance: 567000 },
    { rank: 7, username: 'SpeedDemon', avatar: 'SP', score: 79, trips: 112, distance: 920000 },
    { rank: 8, username: 'ChillDrive', avatar: 'CD', score: 76, trips: 34, distance: 187000 },
  ],
  friends: [
    { rank: 1, username: 'MaxRacer', avatar: 'MR', score: 96, trips: 142, distance: 1245000 },
    { rank: 2, username: 'Du', avatar: 'DU', score: 87, trips: 45, distance: 285000, isMe: true },
    { rank: 3, username: 'NightRider', avatar: 'NR', score: 85, trips: 67, distance: 430000 },
  ],
};

const demoSegments: SegmentRecord[] = [
  { segmentName: 'A5 Frankfurt – Bad Homburg', record: { username: 'SpeedDemon', time: 312, mode: 'racing' }, myBest: 348 },
  { segmentName: 'Berger Straße Komplett', record: { username: 'Du', time: 420, mode: 'driving_school' } },
  { segmentName: 'Sachsenhausen Rundkurs', record: { username: 'EcoQueen', time: 540, mode: 'eco' }, myBest: 590 },
];

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'global' | 'friends' | 'segments';

const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: 'global', label: 'Global', icon: <IconGlobe size={16} /> },
  { key: 'friends', label: 'Freunde', icon: <IconUsers size={16} /> },
  { key: 'segments', label: 'Strecken', icon: <IconMap size={16} /> },
];

// ─── Rank Entry Component ────────────────────────────────────────────────────

function RankRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const getRankDecor = (rank: number) => {
    if (rank === 1) return { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', icon: <IconMedalGold size={20} /> };
    if (rank === 2) return { bg: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', icon: <IconMedalSilver size={20} /> };
    if (rank === 3) return { bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', icon: <IconMedalBronze size={20} /> };
    return null;
  };

  const decor = getRankDecor(entry.rank);

  return (
    <motion.div
      className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
        entry.isMe ? 'bg-ds-primary/8 border border-ds-primary/25' : 'bg-ds-surface-2/50 border border-transparent'
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      {/* Rank */}
      <div className="w-8 flex-shrink-0 text-center">
        {decor ? (
          <span>{decor.icon}</span>
        ) : (
          <span className="text-sm font-semibold text-ds-text-muted">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-ds-surface flex items-center justify-center text-xs font-bold tracking-tight flex-shrink-0 border border-ds-border/50">
        {entry.avatar}
      </div>

      {/* Name & stats */}
      <div className="flex-1 min-w-0">
        <span className={`font-semibold text-sm ${entry.isMe ? 'text-ds-primary' : ''}`}>
          {entry.username}
        </span>
        <div className="flex items-center gap-2 text-xs text-ds-text-muted">
          <span>{entry.trips} Fahrten</span>
          <span>·</span>
          <span>{(entry.distance / 1000).toFixed(0)} km</span>
        </div>
      </div>

      {/* Score */}
      <ScoreRing score={entry.score} size={44} strokeWidth={3} />
    </motion.div>
  );
}

// ─── Segment Record Component ────────────────────────────────────────────────

function SegmentRow({ segment, index }: { segment: SegmentRecord; index: number }) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">{segment.segmentName}</h3>
          <ModeBadge mode={segment.record.mode} size="sm" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="text-xs text-ds-text-muted">Rekord</div>
            <div className="font-semibold text-ds-primary">
              {segment.record.username} · {formatTime(segment.record.time)}
            </div>
          </div>
          {segment.myBest && (
            <div className="text-right">
              <div className="text-xs text-ds-text-muted">Deine Zeit</div>
              <div className="font-semibold">{formatTime(segment.myBest)}</div>
            </div>
          )}
        </div>
        {segment.myBest && (
          <div className="mt-2 h-1.5 bg-ds-surface-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-ds-primary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (segment.record.time / segment.myBest) * 100)}%` }}
              transition={{ delay: index * 0.05 + 0.2, duration: 0.6 }}
            />
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

// ─── Leaderboard Page ────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('global');

  return (
    <Layout showNav>
      <div className="px-4 py-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Ranking</h1>
          <p className="text-sm text-ds-text-muted mt-1">Messe dich mit anderen Fahrern</p>
        </motion.div>

        {/* My rank card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard glow className="p-5">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-ds-primary/15 flex items-center justify-center flex-shrink-0">
                <IconUser size={32} color="var(--color-ds-primary)" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-ds-text-muted">Dein Rang</div>
                <div className="text-3xl font-black text-ds-primary">#4</div>
                <div className="text-xs text-ds-text-muted mt-0.5">Top 5% aller Fahrer</div>
              </div>
              <ScoreRing score={87} size={72} strokeWidth={5} label="Score" />
            </div>
          </GlassCard>
        </motion.div>

        {/* Tab pills */}
        <motion.div
          className="flex gap-2 bg-ds-surface-2/50 rounded-2xl p-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-ds-surface text-ds-text shadow-md'
                  : 'text-ds-text-muted hover:text-ds-text'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'segments' ? (
            <motion.div
              key="segments"
              className="space-y-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {demoSegments.map((seg, i) => (
                <SegmentRow key={seg.segmentName} segment={seg} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {(demoRankings[activeTab] ?? []).map((entry, i) => (
                <RankRow key={entry.username} entry={entry} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-20" />
      </div>
    </Layout>
  );
}
