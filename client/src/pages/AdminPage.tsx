import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAuthStore, getRegisteredUsers, registerUser, deleteUser, type StoredUser } from '@/stores/authStore';
import {
  IconUsers, IconUserPlus, IconTrash, IconShield, IconUser, IconMail,
  IconLock, IconChevronLeft, IconCheck,
} from '@/components/ui/Icons';

// ─── Input ───────────────────────────────────────────────────────────────────

function AdminInput({ label, icon, error, ...props }: { label: string; icon?: React.ReactNode; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-ds-text-muted">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-muted">{icon}</div>}
        <input
          className={`w-full h-11 rounded-xl bg-ds-surface-2 border ${error ? 'border-ds-danger' : 'border-ds-border focus:border-ds-primary'} px-4 ${icon ? 'pl-10' : ''} text-sm text-ds-text placeholder:text-ds-text-muted/50 outline-none transition-colors`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] text-ds-danger">{error}</p>}
    </div>
  );
}

// ─── Create User Modal ──────────────────────────────────────────────────────

function CreateUserSheet({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    const errs: Record<string, string> = {};
    if (!username || username.length < 2) errs.username = 'Mind. 2 Zeichen';
    if (!email || !email.includes('@')) errs.email = 'Gültige E-Mail';
    if (!password || password.length < 4) errs.password = 'Mind. 4 Zeichen';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    const result = await registerUser(username, email, password, role);
    if ('error' in result) {
      setErrors({ email: result.error });
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setUsername(''); setEmail(''); setPassword(''); setRole('user');
      onCreated();
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[60] glass rounded-t-3xl"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="p-6 space-y-4">
              <div className="w-10 h-1 bg-ds-border rounded-full mx-auto" />

              {success ? (
                <motion.div
                  className="text-center py-8"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-full bg-ds-success/15 flex items-center justify-center mx-auto mb-3">
                    <IconCheck size={32} color="var(--color-ds-success)" />
                  </div>
                  <h3 className="font-bold text-lg">Benutzer erstellt!</h3>
                </motion.div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-ds-primary/10 flex items-center justify-center mx-auto mb-2">
                      <IconUserPlus size={24} color="var(--color-ds-primary)" />
                    </div>
                    <h2 className="text-lg font-bold">Neuen Benutzer erstellen</h2>
                    <p className="text-xs text-ds-text-muted mt-1">Erstelle ein Konto für einen Fahrer</p>
                  </div>

                  <div className="space-y-3">
                    <AdminInput
                      label="Benutzername"
                      placeholder="z.B. MaxMuster"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      error={errors.username}
                      icon={<IconUser size={14} />}
                    />
                    <AdminInput
                      label="E-Mail"
                      type="email"
                      placeholder="benutzer@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={errors.email}
                      icon={<IconMail size={14} />}
                    />
                    <AdminInput
                      label="Passwort"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={errors.password}
                      icon={<IconLock size={14} />}
                    />

                    {/* Role selector */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-ds-text-muted">Rolle</label>
                      <div className="flex gap-2">
                        <button
                          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                            role === 'user'
                              ? 'bg-ds-primary/10 border-ds-primary text-ds-primary'
                              : 'bg-ds-surface-2 border-ds-border text-ds-text-muted'
                          }`}
                          onClick={() => setRole('user')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <IconUser size={14} />
                            Fahrer
                          </div>
                        </button>
                        <button
                          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                            role === 'admin'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                              : 'bg-ds-surface-2 border-ds-border text-ds-text-muted'
                          }`}
                          onClick={() => setRole('admin')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <IconShield size={14} />
                            Admin
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="secondary" size="lg" fullWidth onClick={onClose}>Abbrechen</Button>
                    <Button size="lg" fullWidth onClick={handleCreate}>Erstellen</Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── User Row ────────────────────────────────────────────────────────────────

function UserRow({ user, onDelete, isSelf }: { user: StoredUser; onDelete: () => void; isSelf: boolean }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isAdmin = user.role === 'admin';

  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-xl bg-ds-surface-2/60 border border-ds-border/30"
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
        isAdmin ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'bg-ds-primary/10 text-ds-primary border border-ds-primary/20'
      }`}>
        {user.username.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{user.username}</span>
          {isAdmin && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase">
              <IconShield size={10} />
              Admin
            </span>
          )}
          {isSelf && (
            <span className="px-1.5 py-0.5 rounded-md bg-ds-primary/10 text-ds-primary text-[9px] font-bold">Du</span>
          )}
        </div>
        <p className="text-[11px] text-ds-text-muted truncate">{user.email}</p>
        <p className="text-[10px] text-ds-text-muted/60">
          Erstellt: {new Date(user.createdAt).toLocaleDateString('de-DE')}
        </p>
      </div>

      {/* Delete */}
      {!isSelf && (
        confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 rounded-lg bg-ds-danger/15 text-ds-danger text-[10px] font-bold"
              onClick={onDelete}
            >
              Löschen
            </button>
            <button
              className="px-2 py-1 rounded-lg bg-ds-surface-2 text-ds-text-muted text-[10px]"
              onClick={() => setConfirmDelete(false)}
            >
              Nein
            </button>
          </div>
        ) : (
          <motion.button
            className="w-8 h-8 rounded-lg bg-ds-surface-2 flex items-center justify-center text-ds-text-muted hover:text-ds-danger hover:bg-ds-danger/10 transition-colors"
            whileTap={{ scale: 0.9 }}
            onClick={() => setConfirmDelete(true)}
          >
            <IconTrash size={14} />
          </motion.button>
        )
      )}
    </motion.div>
  );
}

// ─── Admin Page ──────────────────────────────────────────────────────────────

export function AdminPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const loadUsers = async () => {
    const users = await getRegisteredUsers();
    setUsers(users);
  };

  useEffect(() => {
    // Only admins allowed
    if (currentUser?.role !== 'admin') {
      navigate('/map');
      return;
    }
    loadUsers();
  }, [currentUser, navigate]);

  const handleDelete = async (id: string) => {
    await deleteUser(id);
    await loadUsers();
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const userCount = users.filter((u) => u.role === 'user').length;

  return (
    <Layout showNav>
      <div className="max-w-lg mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <motion.button
            className="w-10 h-10 rounded-full glass flex items-center justify-center"
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
          >
            <IconChevronLeft size={20} color="white" />
          </motion.button>
          <div>
            <h1 className="text-xl font-bold">Benutzerverwaltung</h1>
            <p className="text-xs text-ds-text-muted">Fahrer & Admins verwalten</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-3 text-center">
            <div className="w-9 h-9 rounded-full bg-ds-primary/10 flex items-center justify-center mx-auto mb-1.5">
              <IconUsers size={16} color="var(--color-ds-primary)" />
            </div>
            <div className="text-lg font-bold">{users.length}</div>
            <div className="text-[10px] text-ds-text-muted">Gesamt</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-1.5">
              <IconShield size={16} color="#f59e0b" />
            </div>
            <div className="text-lg font-bold">{adminCount}</div>
            <div className="text-[10px] text-ds-text-muted">Admins</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="w-9 h-9 rounded-full bg-ds-success/10 flex items-center justify-center mx-auto mb-1.5">
              <IconUser size={16} color="var(--color-ds-success)" />
            </div>
            <div className="text-lg font-bold">{userCount}</div>
            <div className="text-[10px] text-ds-text-muted">Fahrer</div>
          </GlassCard>
        </div>

        {/* Create Button */}
        <motion.button
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-ds-primary to-ds-primary-dim text-ds-bg font-bold text-sm flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          style={{ boxShadow: '0 0 24px rgba(0,240,255,0.3)' }}
        >
          <IconUserPlus size={18} />
          Neuen Benutzer anlegen
        </motion.button>

        {/* User List */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-ds-text-muted flex items-center gap-2">
            <IconUsers size={14} />
            Alle Benutzer ({users.length})
          </h2>

          <AnimatePresence>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === currentUser?.id}
                onDelete={() => handleDelete(user.id)}
              />
            ))}
          </AnimatePresence>

          {users.length === 0 && (
            <div className="text-center py-8 text-ds-text-muted text-sm">
              Noch keine Benutzer vorhanden.
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadUsers}
      />
    </Layout>
  );
}
