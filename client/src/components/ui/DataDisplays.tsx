import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

// ─── Animated Number Counter ─────────────────────────────────────────────────

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, decimals = 0, duration = 0.6, className = '' }: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 20, duration });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsub = display.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsub;
  }, [display]);

  return <span ref={ref} className={className}>{value.toFixed(decimals)}</span>;
}

// ─── Score Ring (SVG gauge with glow) ────────────────────────────────────────

interface ScoreRingProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'var(--color-ds-score-excellent)';
  if (score >= 75) return 'var(--color-ds-score-good)';
  if (score >= 55) return 'var(--color-ds-score-average)';
  if (score >= 35) return 'var(--color-ds-score-poor)';
  return 'var(--color-ds-score-bad)';
}

export function ScoreRing({ score, size = 120, strokeWidth = 8, label, showValue = true, className = '' }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const color = getScoreColor(score);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="var(--color-ds-surface-3)"
          fill="none"
        />
        {/* Animated progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      {/* Center content */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber
            value={score}
            className="text-2xl font-bold tracking-tight"
            duration={1}
          />
          {label && (
            <span className="text-[10px] text-ds-text-muted font-medium uppercase tracking-widest mt-0.5">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── G-Force Indicator (visual ball on crosshair) ───────────────────────────

interface GForceIndicatorProps {
  lateral: number; // -1 to 1 (g)
  longitudinal: number; // -1 to 1 (g)
  size?: number;
  maxG?: number;
}

export function GForceIndicator({ lateral, longitudinal, size = 100, maxG = 1.5 }: GForceIndicatorProps) {
  const center = size / 2;
  const maxOffset = (size / 2) - 12;
  const x = center + (lateral / maxG) * maxOffset;
  const y = center - (longitudinal / maxG) * maxOffset;
  const totalG = Math.sqrt(lateral * lateral + longitudinal * longitudinal);
  const intensity = Math.min(totalG / maxG, 1);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Grid circles */}
        {[0.33, 0.66, 1].map((r) => (
          <circle
            key={r}
            cx={center}
            cy={center}
            r={maxOffset * r}
            fill="none"
            stroke="var(--color-ds-border)"
            strokeWidth="1"
            opacity={0.4}
          />
        ))}
        {/* Crosshair */}
        <line x1={center} y1={4} x2={center} y2={size - 4} stroke="var(--color-ds-border)" strokeWidth="1" opacity={0.3} />
        <line x1={4} y1={center} x2={size - 4} y2={center} stroke="var(--color-ds-border)" strokeWidth="1" opacity={0.3} />

        {/* G-Force dot */}
        <motion.circle
          cx={x}
          cy={y}
          r={8}
          fill={`rgba(0, 240, 255, ${0.3 + intensity * 0.7})`}
          stroke="var(--color-ds-primary)"
          strokeWidth="2"
          animate={{ cx: x, cy: y }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            filter: `drop-shadow(0 0 ${6 + intensity * 12}px var(--color-ds-primary))`,
          }}
        />
      </svg>
      {/* Labels */}
      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] text-ds-text-muted">BRK</span>
      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-ds-text-muted">ACC</span>
      <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[8px] text-ds-text-muted">L</span>
      <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] text-ds-text-muted">R</span>
    </div>
  );
}

// ─── Speed Display (large, prominent) ────────────────────────────────────────

interface SpeedDisplayProps {
  speed: number; // km/h
  limit?: number; // speed limit
}

export function SpeedDisplay({ speed, limit }: SpeedDisplayProps) {
  const isOverLimit = limit !== undefined && speed > limit;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className={`text-6xl font-bold tracking-tighter tabular-nums ${
          isOverLimit ? 'text-ds-danger' : 'text-ds-text'
        }`}
        animate={isOverLimit ? { scale: [1, 1.03, 1] } : {}}
        transition={isOverLimit ? { duration: 0.5, repeat: Infinity, repeatDelay: 1 } : {}}
        style={isOverLimit ? { textShadow: '0 0 24px rgba(255,51,85,0.5)' } : { textShadow: '0 0 24px rgba(0,240,255,0.15)' }}
      >
        <AnimatedNumber value={Math.round(speed)} />
      </motion.div>
      <span className="text-sm text-ds-text-muted font-medium -mt-1">km/h</span>
      {limit !== undefined && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
          isOverLimit ? 'text-ds-danger' : 'text-ds-text-muted'
        }`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
            isOverLimit ? 'border-ds-danger text-ds-danger' : 'border-ds-text-muted'
          }`}>
            {limit}
          </div>
          <span>Limit</span>
        </div>
      )}
    </div>
  );
}

// ─── Event Toast (animated notification) ─────────────────────────────────────

interface EventToastProps {
  message: string;
  points: number;
  type: 'positive' | 'negative' | 'neutral';
  onDone?: () => void;
}

export function EventToast({ message, points, type, onDone }: EventToastProps) {
  const colorMap = {
    positive: { bg: 'from-ds-success/20 to-emerald-900/10', text: 'text-ds-success', border: 'border-ds-success/30' },
    negative: { bg: 'from-ds-danger/20 to-red-900/10', text: 'text-ds-danger', border: 'border-ds-danger/30' },
    neutral: { bg: 'from-ds-primary/20 to-cyan-900/10', text: 'text-ds-primary', border: 'border-ds-primary/30' },
  };
  const c = colorMap[type];

  return (
    <motion.div
      className={`glass rounded-2xl px-4 py-3 flex items-center gap-3 border ${c.border} bg-gradient-to-r ${c.bg}`}
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onAnimationComplete={() => {
        setTimeout(() => onDone?.(), 2000);
      }}
    >
      <span className="text-sm font-medium text-ds-text">{message}</span>
      <span className={`text-sm font-bold ${c.text} ml-auto whitespace-nowrap`}>
        {points > 0 ? '+' : ''}{points}
      </span>
    </motion.div>
  );
}

// ─── Mode Badge ──────────────────────────────────────────────────────────────

interface ModeBadgeProps {
  mode: 'driving_school' | 'racing' | 'eco' | 'free';
  size?: 'sm' | 'md';
}

const modeConfig = {
  driving_school: { label: 'Fahrschule', color: 'var(--color-ds-mode-school)', icon: '🎓' },
  racing: { label: 'Racing', color: 'var(--color-ds-mode-racing)', icon: '🏁' },
  eco: { label: 'Eco', color: 'var(--color-ds-mode-eco)', icon: '🌿' },
  free: { label: 'Frei', color: 'var(--color-ds-mode-free)', icon: '✨' },
};

export function ModeBadge({ mode, size = 'md' }: ModeBadgeProps) {
  const cfg = modeConfig[mode];
  const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-1 gap-1' : 'text-sm px-3.5 py-1.5 gap-1.5';

  return (
    <motion.div
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{
        backgroundColor: `${cfg.color}15`,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </motion.div>
  );
}
