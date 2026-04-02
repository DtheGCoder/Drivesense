import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { IconModeSchool, IconModeRacing, IconModeEco, IconModeFree } from './Icons';

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
  const maxOffset = (size / 2) - 14;
  const clampedLat = Math.max(-maxG, Math.min(maxG, lateral));
  const clampedLong = Math.max(-maxG, Math.min(maxG, longitudinal));
  const x = center + (clampedLat / maxG) * maxOffset;
  const y = center - (clampedLong / maxG) * maxOffset;
  const totalG = Math.sqrt(lateral * lateral + longitudinal * longitudinal);
  const intensity = Math.min(totalG / maxG, 1);

  // Direction-based color: braking=red, accel=green, lateral=cyan/yellow
  const getDotColor = () => {
    if (Math.abs(longitudinal) > Math.abs(lateral)) {
      return longitudinal < 0 ? 'rgba(255, 51, 85, ALPHA)' : 'rgba(34, 197, 94, ALPHA)';
    }
    return lateral > 0 ? 'rgba(251, 191, 36, ALPHA)' : 'rgba(0, 240, 255, ALPHA)';
  };
  const dotFill = getDotColor().replace('ALPHA', `${0.4 + intensity * 0.6}`);
  const dotStroke = getDotColor().replace('ALPHA', '1');
  const dotGlow = getDotColor().replace('ALPHA', '0.6');

  // G-Force value display
  const gText = totalG.toFixed(2);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Grid circles with zone colors */}
        <circle cx={center} cy={center} r={maxOffset * 0.33} fill="none" stroke="rgba(34,197,94,0.15)" strokeWidth="1" />
        <circle cx={center} cy={center} r={maxOffset * 0.66} fill="none" stroke="rgba(251,191,36,0.12)" strokeWidth="1" />
        <circle cx={center} cy={center} r={maxOffset} fill="none" stroke="rgba(255,51,85,0.12)" strokeWidth="1" />

        {/* Crosshair */}
        <line x1={center} y1={6} x2={center} y2={size - 6} stroke="var(--color-ds-border)" strokeWidth="0.5" opacity={0.3} />
        <line x1={6} y1={center} x2={size - 6} y2={center} stroke="var(--color-ds-border)" strokeWidth="0.5" opacity={0.3} />

        {/* Direction line from center to dot */}
        {totalG > 0.05 && (
          <line
            x1={center} y1={center} x2={x} y2={y}
            stroke={dotStroke}
            strokeWidth="1.5"
            opacity={0.3}
            strokeLinecap="round"
          />
        )}

        {/* G-Force dot with glow */}
        <motion.circle
          r={10}
          fill={dotFill}
          stroke={dotStroke}
          strokeWidth="2"
          animate={{ cx: x, cy: y }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.5 }}
          style={{ filter: `drop-shadow(0 0 ${4 + intensity * 10}px ${dotGlow})` }}
        />

        {/* Center dot */}
        <circle cx={center} cy={center} r={2} fill="var(--color-ds-border)" opacity={0.5} />
      </svg>

      {/* Direction labels */}
      <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[7px] font-medium" style={{ color: longitudinal < -0.1 ? 'rgba(255,51,85,0.8)' : 'rgba(255,255,255,0.25)' }}>BRK</span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[7px] font-medium" style={{ color: longitudinal > 0.1 ? 'rgba(34,197,94,0.8)' : 'rgba(255,255,255,0.25)' }}>ACC</span>
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[7px] font-medium" style={{ color: lateral < -0.1 ? 'rgba(0,240,255,0.8)' : 'rgba(255,255,255,0.25)' }}>L</span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[7px] font-medium" style={{ color: lateral > 0.1 ? 'rgba(251,191,36,0.8)' : 'rgba(255,255,255,0.25)' }}>R</span>

      {/* G value in corner */}
      <span className="absolute bottom-0.5 right-1 text-[8px] font-bold tabular-nums" style={{ color: intensity > 0.5 ? dotStroke : 'rgba(255,255,255,0.3)' }}>{gText}g</span>
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

const modeConfig: Record<string, { label: string; color: string; icon: (size: number) => ReactNode }> = {
  driving_school: { label: 'Fahrschule', color: 'var(--color-ds-mode-school)', icon: (s) => <IconModeSchool size={s} /> },
  racing: { label: 'Racing', color: 'var(--color-ds-mode-racing)', icon: (s) => <IconModeRacing size={s} /> },
  eco: { label: 'Eco', color: 'var(--color-ds-mode-eco)', icon: (s) => <IconModeEco size={s} /> },
  free: { label: 'Frei', color: 'var(--color-ds-mode-free)', icon: (s) => <IconModeFree size={s} /> },
};

export function ModeBadge({ mode, size = 'md' }: ModeBadgeProps) {
  const cfg = modeConfig[mode];
  if (!cfg) return null;
  const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-1 gap-1.5' : 'text-sm px-3.5 py-1.5 gap-2';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <motion.div
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{
        backgroundColor: `${cfg.color}12`,
        color: cfg.color,
        border: `1px solid ${cfg.color}20`,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {cfg.icon(iconSize)}
      <span>{cfg.label}</span>
    </motion.div>
  );
}
