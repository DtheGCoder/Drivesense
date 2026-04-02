import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { GlassCard } from '@/components/ui/GlassCard';
import { ScoreRing, AnimatedNumber } from '@/components/ui/DataDisplays';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, type CarProfile } from '@/stores/profileStore';
import { useTripHistoryStore } from '@/stores/tripHistoryStore';
import { IconTrophy, IconTarget, IconStar, IconAward, IconTrendUp, IconBell, IconRuler, IconPalette, IconLock, IconDownload, IconHelpCircle, IconUser, IconEdit, IconChevronRight, IconShield, IconUsers, IconPlus, IconTrash } from '@/components/ui/Icons';

import { apiUploadPicture } from '@/lib/api';

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
    { icon: <IconTrophy size={24} color="var(--color-ds-primary)" />, label: 'Top 5%', desc: 'Unter den besten 5% Fahrern' },
    { icon: <IconTarget size={24} color="var(--color-ds-primary)" />, label: '10er Serie', desc: '10 Fahrten über 85 Punkte' },
    { icon: <IconStar size={24} color="#22c55e" />, label: 'Öko-Held', desc: '5 perfekte Eco-Fahrten' },
    { icon: <IconAward size={24} color="#a78bfa" />, label: 'Nachtfahrer', desc: '10+ Nachtfahrten gemeistert' },
    { icon: <IconTrendUp size={24} color="#f59e0b" />, label: 'Aufsteiger', desc: 'Score um 15+ verbessert' },
  ],
};

// Toggle switch component
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-ds-primary' : 'bg-ds-surface-2 border border-ds-border/50'}`}
      onClick={onToggle}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
        animate={{ left: on ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// Segmented control component
function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 bg-ds-surface-2 rounded-xl p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${value === opt.value ? 'bg-ds-primary/20 text-ds-primary' : 'text-ds-text-muted'}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Profile Page ────────────────────────────────────────────────────────────

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showLogout, setShowLogout] = useState(false);
  const [showCarForm, setShowCarForm] = useState(false);
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile store
  const profile = useProfileStore((s) => s.profile);
  const updateProfilePicture = useProfileStore((s) => s.updateProfilePicture);
  const addCar = useProfileStore((s) => s.addCar);
  const removeCar = useProfileStore((s) => s.removeCar);
  const selectCar = useProfileStore((s) => s.selectCar);
  const updateFuelPrices = useProfileStore((s) => s.updateFuelPrices);
  const updateSettings = useProfileStore((s) => s.updateSettings);
  const loadProfile = useProfileStore((s) => s.loadProfile);

  // Trip history
  const trips = useTripHistoryStore((s) => s.trips);
  const loadTrips = useTripHistoryStore((s) => s.loadTrips);

  const stats = useMemo(() => {
    const scored = trips.filter((t) => t.userId === (user?.id ?? '') && t.mode !== 'free');
    if (scored.length === 0) return { totalTrips: 0, totalDistance: 0, totalDuration: 0, avgScore: 0, bestScore: 0 };
    return {
      totalTrips: scored.length,
      totalDistance: scored.reduce((s, t) => s + t.distance, 0),
      totalDuration: scored.reduce((s, t) => s + t.duration, 0),
      avgScore: Math.round(scored.reduce((s, t) => s + t.score, 0) / scored.length),
      bestScore: Math.max(...scored.map((t) => t.score)),
    };
  }, [trips, user?.id]);

  // Init profile and trips
  useEffect(() => {
    if (user?.id) {
      loadProfile(user.id);
      loadTrips(user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Handle profile picture upload
  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert('Bild darf max. 50 MB groß sein');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Resize to 512px max before storing/uploading
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 512;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            updateProfilePicture(dataUrl);
            // Upload to server
            canvas.toBlob((blob) => {
              if (blob) apiUploadPicture(blob).then(({ url }) => updateProfilePicture(url)).catch(() => {});
            }, 'image/jpeg', 0.8);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Car form state
  const [carName, setCarName] = useState('');
  const [carFuelType, setCarFuelType] = useState<CarProfile['fuelType']>('benzin');
  const [carConsCity, setCarConsCity] = useState('');
  const [carConsHighway, setCarConsHighway] = useState('');
  const [carConsMixed, setCarConsMixed] = useState('');

  const handleAddCar = () => {
    const city = parseFloat(carConsCity);
    const highway = parseFloat(carConsHighway);
    const mixed = parseFloat(carConsMixed);
    if (!carName.trim() || isNaN(city) || isNaN(highway) || isNaN(mixed)) return;
    addCar({
      id: crypto.randomUUID(),
      name: carName.trim(),
      fuelType: carFuelType,
      consumptionCity: city,
      consumptionHighway: highway,
      consumptionMixed: mixed,
    });
    setCarName('');
    setCarConsCity('');
    setCarConsHighway('');
    setCarConsMixed('');
    setShowCarForm(false);
  };

  const canAddCar = carName.trim().length > 0 && !isNaN(parseFloat(carConsCity)) && !isNaN(parseFloat(carConsHighway)) && !isNaN(parseFloat(carConsMixed));

  return (
    <Layout showNav>
      <div className="py-6 space-y-5">
        {/* Profile Header */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative" style={{ width: 72, height: 72 }}>
            {profile?.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt="Profilbild"
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-ds-primary/30 to-ds-primary-dim/30 flex items-center justify-center">
                <IconUser size={36} color="var(--color-ds-primary)" />
              </div>
            )}
            <motion.button
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ds-primary flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconEdit size={13} color="var(--color-ds-bg)" />
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePictureUpload}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{user?.username ?? 'Benutzer'}</h1>
              {isAdmin && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase">
                  <IconShield size={10} />
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-ds-text-muted">{user?.email ?? ''}</p>
          </div>
          <motion.button
            className="w-10 h-10 rounded-full glass flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <IconEdit size={18} color="var(--color-ds-text-muted)" />
          </motion.button>
        </motion.div>

        {/* Admin Panel Link (only for admins) */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <motion.button
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-left"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate('/admin')}
            >
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <IconUsers size={20} color="#f59e0b" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-500">Benutzerverwaltung</div>
                <div className="text-xs text-ds-text-muted">Fahrer anlegen & verwalten</div>
              </div>
              <IconChevronRight size={16} color="#f59e0b" />
            </motion.button>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard glow className="p-4 flex items-center gap-3">
            <ScoreRing score={stats.avgScore || 0} size={56} strokeWidth={4} label="Ø" />
            <div>
              <div className="text-xs text-ds-text-muted">Ø Score</div>
              <div className="text-xl font-bold"><AnimatedNumber value={stats.avgScore || 0} /></div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center gap-3">
            <ScoreRing score={stats.bestScore || 0} size={56} strokeWidth={4} label="Best" />
            <div>
              <div className="text-xs text-ds-text-muted">Bester</div>
              <div className="text-xl font-bold"><AnimatedNumber value={stats.bestScore || 0} /></div>
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
            <div className="text-lg font-bold"><AnimatedNumber value={stats.totalTrips} /></div>
            <div className="text-xs text-ds-text-muted">Fahrten</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-lg font-bold">{(stats.totalDistance / 1000).toFixed(0)} km</div>
            <div className="text-xs text-ds-text-muted">Gesamt</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-lg font-bold">{Math.round(stats.totalDuration / 3600)}h</div>
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
              <IconAward size={18} color="var(--color-ds-primary)" />
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
                  <div className="w-14 h-14 rounded-xl bg-ds-surface-2 flex items-center justify-center mx-auto mb-1">
                    {badge.icon}
                  </div>
                  <div className="text-xs font-medium leading-tight">{badge.label}</div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Car Management */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                🚗 Mein Auto
              </h2>
              <motion.button
                className="w-8 h-8 rounded-full bg-ds-primary/10 flex items-center justify-center"
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowCarForm(!showCarForm)}
              >
                <IconPlus size={16} color="var(--color-ds-primary)" />
              </motion.button>
            </div>

            {/* Car list */}
            {profile?.cars.map((car) => (
              <div key={car.id} className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${profile.selectedCarId === car.id ? 'bg-ds-primary/10 border border-ds-primary/30' : 'bg-ds-surface-2'}`}>
                <button className="flex-1 text-left" onClick={() => selectCar(car.id)}>
                  <div className="text-sm font-semibold">{car.name}</div>
                  <div className="text-xs text-ds-text-muted">
                    {car.fuelType === 'benzin' ? '⛽ Benzin' : car.fuelType === 'diesel' ? '⛽ Diesel' : car.fuelType === 'elektro' ? '🔌 Elektro' : '⛽ Hybrid'}
                    {' · '}{car.consumptionMixed} {car.fuelType === 'elektro' ? 'kWh' : 'L'}/100km
                  </div>
                </button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => removeCar(car.id)}
                >
                  <IconTrash size={16} color="var(--color-ds-danger)" />
                </motion.button>
              </div>
            ))}

            {/* Empty state */}
            {(!profile?.cars || profile.cars.length === 0) && !showCarForm && (
              <p className="text-xs text-ds-text-muted text-center py-3">
                Füge dein Auto hinzu, um Spritkosten zu berechnen
              </p>
            )}

            {/* Add car form */}
            {showCarForm && (
              <motion.div
                className="space-y-3 pt-3 border-t border-ds-border/30"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <input
                  type="text"
                  placeholder="Auto-Name (z.B. VW Golf 7)"
                  className="w-full px-3 py-2.5 rounded-xl bg-ds-surface-2 text-sm outline-none border border-ds-border/30 focus:border-ds-primary/50"
                  value={carName}
                  onChange={(e) => setCarName(e.target.value)}
                />
                <div className="flex gap-2">
                  {(['benzin', 'diesel', 'elektro', 'hybrid'] as const).map((ft) => (
                    <button
                      key={ft}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${carFuelType === ft ? 'bg-ds-primary/20 text-ds-primary border border-ds-primary/30' : 'bg-ds-surface-2 text-ds-text-muted border border-ds-border/30'}`}
                      onClick={() => setCarFuelType(ft)}
                    >
                      {ft.charAt(0).toUpperCase() + ft.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-ds-text-muted mb-1 block">Stadt {carFuelType === 'elektro' ? '(kWh)' : '(L/100km)'}</label>
                    <input type="text" inputMode="decimal" placeholder="7.5" className="w-full px-2 py-2 rounded-lg bg-ds-surface-2 text-sm outline-none border border-ds-border/30 focus:border-ds-primary/50" value={carConsCity} onChange={(e) => setCarConsCity(e.target.value.replace(',', '.'))} />
                  </div>
                  <div>
                    <label className="text-[10px] text-ds-text-muted mb-1 block">Autobahn</label>
                    <input type="text" inputMode="decimal" placeholder="5.8" className="w-full px-2 py-2 rounded-lg bg-ds-surface-2 text-sm outline-none border border-ds-border/30 focus:border-ds-primary/50" value={carConsHighway} onChange={(e) => setCarConsHighway(e.target.value.replace(',', '.'))} />
                  </div>
                  <div>
                    <label className="text-[10px] text-ds-text-muted mb-1 block">Kombiniert</label>
                    <input type="text" inputMode="decimal" placeholder="6.5" className="w-full px-2 py-2 rounded-lg bg-ds-surface-2 text-sm outline-none border border-ds-border/30 focus:border-ds-primary/50" value={carConsMixed} onChange={(e) => setCarConsMixed(e.target.value.replace(',', '.'))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" fullWidth onClick={() => setShowCarForm(false)}>Abbrechen</Button>
                  <Button variant="primary" size="sm" fullWidth onClick={handleAddCar} disabled={!canAddCar}>Hinzufügen</Button>
                </div>
              </motion.div>
            )}

            {/* Fuel prices */}
            {profile && profile.cars.length > 0 && (
              <div className="mt-3 pt-3 border-t border-ds-border/30">
                <div className="text-xs font-semibold text-ds-text-muted mb-2">Aktuelle Spritpreise (€)</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-ds-text-muted block">Benzin/L</label>
                    <input
                      type="number" step="0.01"
                      className="w-full px-2 py-1.5 rounded-lg bg-ds-surface-2 text-xs outline-none border border-ds-border/30"
                      value={profile.fuelPriceBenzin}
                      onChange={(e) => updateFuelPrices({ fuelPriceBenzin: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-ds-text-muted block">Diesel/L</label>
                    <input
                      type="number" step="0.01"
                      className="w-full px-2 py-1.5 rounded-lg bg-ds-surface-2 text-xs outline-none border border-ds-border/30"
                      value={profile.fuelPriceDiesel}
                      onChange={(e) => updateFuelPrices({ fuelPriceDiesel: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-ds-text-muted block">Strom/kWh</label>
                    <input
                      type="number" step="0.01"
                      className="w-full px-2 py-1.5 rounded-lg bg-ds-surface-2 text-xs outline-none border border-ds-border/30"
                      value={profile.fuelPriceElektro}
                      onChange={(e) => updateFuelPrices({ fuelPriceElektro: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-5 space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              ⚙️ Einstellungen
            </h2>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-ds-text-muted"><IconBell size={20} /></span>
                <div>
                  <div className="text-sm font-medium">Benachrichtigungen</div>
                  <div className="text-xs text-ds-text-muted">Push-Nachrichten</div>
                </div>
              </div>
              <Toggle on={profile?.settings.notifications ?? true} onToggle={() => updateSettings({ notifications: !(profile?.settings.notifications ?? true) })} />
            </div>

            {/* Notification Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-ds-text-muted">🔔</span>
                <div>
                  <div className="text-sm font-medium">Sound</div>
                  <div className="text-xs text-ds-text-muted">Benachrichtigungstöne</div>
                </div>
              </div>
              <Toggle on={profile?.settings.notificationSound ?? true} onToggle={() => updateSettings({ notificationSound: !(profile?.settings.notificationSound ?? true) })} />
            </div>

            <div className="border-t border-ds-border/30" />

            {/* Units */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-ds-text-muted"><IconRuler size={20} /></span>
                <div className="text-sm font-medium">Einheiten</div>
              </div>
              <SegmentedControl
                options={[{ value: 'metric' as const, label: 'Metrisch (km/h)' }, { value: 'imperial' as const, label: 'Imperial (mph)' }]}
                value={profile?.settings.units ?? 'metric'}
                onChange={(v) => updateSettings({ units: v })}
              />
            </div>

            {/* Theme */}
            <div className="opacity-40 pointer-events-none">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-ds-text-muted"><IconPalette size={20} /></span>
                <div className="text-sm font-medium">Darstellung</div>
                <span className="text-[10px] text-ds-text-muted ml-auto bg-ds-surface-2 px-2 py-0.5 rounded-full">Bald verfügbar</span>
              </div>
              <SegmentedControl
                options={[{ value: 'dark' as const, label: 'Dunkel' }, { value: 'light' as const, label: 'Hell' }, { value: 'system' as const, label: 'System' }]}
                value={profile?.settings.theme ?? 'dark'}
                onChange={() => {}}
              />
            </div>

            {/* Privacy */}
            <div className="opacity-40 pointer-events-none">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-ds-text-muted"><IconLock size={20} /></span>
                <div className="text-sm font-medium">Sichtbarkeit</div>
                <span className="text-[10px] text-ds-text-muted ml-auto bg-ds-surface-2 px-2 py-0.5 rounded-full">Bald verfügbar</span>
              </div>
              <SegmentedControl
                options={[{ value: 'public' as const, label: 'Öffentlich' }, { value: 'friends' as const, label: 'Freunde' }, { value: 'private' as const, label: 'Privat' }]}
                value={profile?.settings.privacy ?? 'public'}
                onChange={() => {}}
              />
            </div>

            <div className="border-t border-ds-border/30" />

            {/* Export Data */}
            <button
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-ds-surface-2 hover:bg-ds-surface-2/80 transition-colors text-left"
              onClick={() => {
                const data = { trips: useTripHistoryStore.getState().trips, profile };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `drivesense-export-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <span className="text-ds-text-muted"><IconDownload size={20} /></span>
              <div className="flex-1">
                <div className="text-sm font-medium">Daten exportieren</div>
                <div className="text-xs text-ds-text-muted">Alle Fahrten als JSON herunterladen</div>
              </div>
              <IconChevronRight size={16} color="var(--color-ds-text-muted)" />
            </button>

            {/* Help */}
            <button
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-ds-surface-2 hover:bg-ds-surface-2/80 transition-colors text-left"
              onClick={() => window.open('mailto:support@drivesense.de', '_blank')}
            >
              <span className="text-ds-text-muted"><IconHelpCircle size={20} /></span>
              <div className="flex-1">
                <div className="text-sm font-medium">Hilfe & Support</div>
                <div className="text-xs text-ds-text-muted">Kontakt aufnehmen</div>
              </div>
              <IconChevronRight size={16} color="var(--color-ds-text-muted)" />
            </button>
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
          DriveSense v2.0.0
        </div>

        <div className="h-28" />

        {/* Logout confirmation */}
        {showLogout && createPortal(
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowLogout(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[60] glass rounded-t-3xl p-6 space-y-4 text-center"
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
          </>,
          document.body,
        )}
      </div>
    </Layout>
  );
}
