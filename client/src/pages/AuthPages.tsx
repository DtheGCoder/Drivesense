import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAuthStore, authenticateUser, registerUser } from '@/stores/authStore';
import { useMap } from '@/components/map/MapProvider';
import { LogoDriveSense, IconMail, IconLock, IconUser, IconCheck } from '@/components/ui/Icons';

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

    const result = authenticateUser(email, password);
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

// ─── Register Page ───────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { setInteractive } = useMap();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Disable map interaction on auth pages
  useEffect(() => {
    setInteractive(false);
    return () => { setInteractive(true); };
  }, [setInteractive]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!username || username.length < 3) errs.username = 'Mind. 3 Zeichen';
    if (!email || !email.includes('@')) errs.email = 'Gültige E-Mail erforderlich';
    if (!password || password.length < 8) errs.password = 'Mind. 8 Zeichen';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwörter stimmen nicht überein';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    await new Promise((r) => setTimeout(r, 300));

    const result = registerUser(username, email, password);
    if ('error' in result) {
      setErrors({ email: result.error });
      setLoading(false);
      return;
    }

    setUser({
      id: result.id,
      username: result.username,
      email: result.email,
      role: result.role,
    });
    navigate('/map');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center px-6 py-12 bg-ds-bg/60 backdrop-blur-sm">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-ds-primary/5 blur-[120px] pointer-events-none" />

      <motion.div
        className="w-full max-w-sm space-y-6 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ds-primary to-ds-primary-dim flex items-center justify-center mx-auto mb-3"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <LogoDriveSense size={36} />
          </motion.div>
          <h1 className="text-2xl font-bold">Konto erstellen</h1>
          <p className="text-sm text-ds-text-muted mt-1">Starte dein Fahrabenteuer</p>
        </div>

        {/* Form */}
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Benutzername"
              type="text"
              placeholder="dein_name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              autoComplete="username"
              icon={
                <IconUser size={16} />
              }
            />

            <Input
              label="E-Mail"
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
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
              error={errors.password}
              autoComplete="new-password"
              icon={
                <IconLock size={16} />
              }
            />

            <Input
              label="Passwort bestätigen"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
              icon={
                <IconCheck size={16} />
              }
            />

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Registrieren
            </Button>
          </form>
        </GlassCard>

        {/* Login link */}
        <div className="text-center text-sm">
          <span className="text-ds-text-muted">Schon registriert? </span>
          <Link to="/login" className="text-ds-primary font-semibold hover:underline">
            Anmelden
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
