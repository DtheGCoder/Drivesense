import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

type MotionConflictKeys = 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, MotionConflictKeys> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary:
    'bg-gradient-to-r from-ds-primary to-ds-primary-dim text-ds-bg font-semibold shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow-md)]',
  secondary:
    'bg-ds-surface-2 text-ds-text border border-ds-border hover:bg-ds-surface-3 hover:border-ds-primary/30',
  ghost:
    'bg-transparent text-ds-text-secondary hover:bg-ds-surface-2 hover:text-ds-text',
  danger:
    'bg-gradient-to-r from-ds-danger to-red-700 text-white font-semibold shadow-[var(--shadow-glow-danger)]',
};

const sizes = {
  sm: 'h-10 px-4 text-sm rounded-xl gap-2',
  md: 'h-12 px-6 text-sm rounded-[var(--radius-button)] gap-2.5',
  lg: 'h-14 px-8 text-base rounded-[var(--radius-button)] gap-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      className={`
        inline-flex items-center justify-center
        transition-all duration-200
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97]'}
        ${className}
      `.trim()}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  );
}
