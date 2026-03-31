import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAuthStore, authenticateUser } from '@/stores/authStore';
import { useMap } from '@/components/map/MapProvider';
import { LogoDriveSense, IconMail, IconLock } from '@/components/ui/Icons';

// ─── Input Component ─────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

function Input({ label, error, icon, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ds-text-muted">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-text-muted">
            {icon}
          </div>
        )}
        <input
          className={`w-full h-12 rounded-xl bg-ds-surface-2 border ${
            error ? 'border-ds-danger' : 'border-ds-border focus:border-ds-primary'
          } px-4 ${icon ? 'pl-11' : ''} text-sm text-ds-text placeholder:text-ds-text-muted/50 outline-none transition-colors`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-ds-danger">{error}</p>}
    </div>
  );
}

// ─── Login Page ──────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { setInteractive } = useMap();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Disable map interaction on auth pages
  useEffect(() => {
    setInteractive(false);
    return () => { setInteractive(true); };
  }, [setInteractive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 300));

    if (!email || !password) {
      setError('Bitte fülle alle Felder aus.');
      setLoading(false);
      return;
    }

    const result = await authenticateUser(email, password);
    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setUser(result);
    navigate('/map');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center px-6 py-12 bg-ds-bg/60 backdrop-blur-sm">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-ds-primary/5 blur-[120px] pointer-events-none" />

      <motion.div
        className="w-full max-w-sm space-y-8 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center">
          <motion.div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-ds-primary to-ds-primary-dim flex items-center justify-center mx-auto mb-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <LogoDriveSense size={44} />
          </motion.div>
          <h1 className="text-3xl font-black">
            Drive<span className="text-ds-primary">Sense</span>
          </h1>
          <p className="text-sm text-ds-text-muted mt-1">Dein Fahrstil, analysiert.</p>
        </div>

        {/* Form */}
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-Mail"
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              icon={
                <IconMail size={16} />
              }
            />

            <Input
              label="Passwort"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              icon={
                <IconLock size={16} />
              }
            />

            {error && (
              <motion.div
                className="text-sm text-ds-danger bg-ds-danger/10 rounded-lg py-2 px-3 text-center"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Anmelden
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-xs text-ds-text-muted hover:text-ds-primary transition-colors">
              Passwort vergessen?
            </Link>
          </div>
        </GlassCard>


      </motion.div>
    </div>
  );
}
