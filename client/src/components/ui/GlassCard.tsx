import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
  animate?: boolean;
}

export function GlassCard({ children, className = '', glow = false, onClick, animate = true }: GlassCardProps) {
  const Comp = animate ? motion.div : 'div';
  const animProps = animate
    ? {
        initial: { opacity: 0, y: 16, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        whileHover: onClick ? { scale: 1.01, y: -2 } : undefined,
        whileTap: onClick ? { scale: 0.98 } : undefined,
      }
    : {};

  return (
    <Comp
      className={`glass rounded-[var(--radius-card)] p-5 ${glow ? 'glow-border' : ''} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
      {...animProps}
    >
      {children}
    </Comp>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}

export function StatCard({ label, value, unit, icon, trend, trendValue, color }: StatCardProps) {
  return (
    <GlassCard className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ds-text-secondary uppercase tracking-wider">{label}</span>
        {icon && <div className="text-ds-text-muted">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <motion.span
          className="text-2xl font-bold tracking-tight"
          style={{ color: color ?? 'var(--color-ds-text)' }}
          key={String(value)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {value}
        </motion.span>
        {unit && <span className="text-sm text-ds-text-muted font-medium">{unit}</span>}
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          trend === 'up' ? 'text-ds-success' : trend === 'down' ? 'text-ds-danger' : 'text-ds-text-muted'
        }`}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trendValue}
        </div>
      )}
    </GlassCard>
  );
}
