import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import { Layout } from '@/components/layout/Layout';
import { useMap } from '@/components/map/MapProvider';
import { useLiveStore, type LiveUser, USER_COLORS } from '@/stores/liveStore';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useTripHistoryStore } from '@/stores/tripHistoryStore';
import { useGeolocation, getPermissionHint } from '@/hooks/useGeolocation';
import { ScoreRing, ModeBadge } from '@/components/ui/DataDisplays';
import { IconGauge, IconClock, IconRoute, IconTarget, IconUsers } from '@/components/ui/Icons';
import { RouteSearch } from '@/components/map/RouteSearch';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEta(seconds: number): string {
  const m = Math.ceil(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function timeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} min`;
  return `vor ${Math.floor(diff / 3600)}h`;
}

// ─── User Marker HTML ────────────────────────────────────────────────────────

function createMarkerElement(user: LiveUser): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'live-user-marker';
  el.style.cursor = 'pointer';

  const isDriving = user.status === 'driving';
  const isSelf = user.isSelf === true;
  const borderColor = isSelf ? '#00f0ff' : user.color;
  const pulseRing = isDriving
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${borderColor}25;animation:pulse-ring 2s ease-out infinite;"></div>`
    : isSelf
    ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${borderColor}40;animation:pulse-ring 3s ease-out infinite;"></div>`
    : '';

  const avatarContent = user.profilePicture
    ? `<img src="${user.profilePicture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`
    : `<span style="font-size:12px;font-weight:700;color:${borderColor};letter-spacing:0.5px;">${user.initials}</span>`;

  const label = isDriving
    ? `${Math.round(user.speed)} km/h`
    : isSelf ? 'Du' : '';

  el.innerHTML = `
    <div style="position:relative;width:40px;height:40px;">
      ${pulseRing}
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:${isDriving ? borderColor + '20' : '#1a1a2e'};
        border:2.5px solid ${borderColor};
        display:flex;align-items:center;justify-content:center;
        overflow:hidden;
        box-shadow:0 0 12px ${borderColor}40, 0 2px 8px rgba(0,0,0,0.5);
      ">${avatarContent}</div>
      ${label ? `
      <div style="
        position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
        background:${borderColor};color:#0a0a0f;
        padding:1px 5px;border-radius:6px;
        font-size:9px;font-weight:700;white-space:nowrap;
        box-shadow:0 1px 4px rgba(0,0,0,0.4);
      ">${label}</div>` : ''}
    </div>
  `;
  return el;
}

// ─── User Card ───────────────────────────────────────────────────────────────

function UserCard({ user, onClose, onFocus }: { user: LiveUser; onClose: () => void; onFocus: () => void }) {
  const isDriving = user.status === 'driving';

  return (
    <motion.div
      className="absolute bottom-36 left-4 right-4 z-30 pointer-events-auto"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="glass rounded-2xl p-4 border border-ds-border/50" style={{ borderColor: `${user.color}30` }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${user.color}20`, border: `2px solid ${user.color}`, color: user.color }}
          >
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">{user.username}</h3>
              {isDriving && user.mode && <ModeBadge mode={user.mode} size="sm" />}
            </div>
            <p className="text-xs text-ds-text-muted">
              {isDriving ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: user.color }} />
                  Unterwegs{user.destination ? ` → ${user.destination}` : ''}
                </span>
              ) : (
                timeAgo(user.lastUpdate)
              )}
            </p>
          </div>
          <ScoreRing score={user.score} size={48} strokeWidth={3} />
        </div>

        {/* Stats (only when driving) */}
        {isDriving && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-ds-surface-2/60 rounded-xl p-2 text-center">
              <IconGauge size={14} color={user.color} />
              <div className="text-xs font-bold mt-0.5">{Math.round(user.speed)}</div>
              <div className="text-[9px] text-ds-text-muted">km/h</div>
            </div>
            {user.eta != null && (
              <div className="bg-ds-surface-2/60 rounded-xl p-2 text-center">
                <IconClock size={14} color={user.color} />
                <div className="text-xs font-bold mt-0.5">{formatEta(user.eta)}</div>
                <div className="text-[9px] text-ds-text-muted">ETA</div>
              </div>
            )}
            {user.tripDistance != null && (
              <div className="bg-ds-surface-2/60 rounded-xl p-2 text-center">
                <IconRoute size={14} color={user.color} />
                <div className="text-xs font-bold mt-0.5">{formatDistance(user.tripDistance)}</div>
                <div className="text-[9px] text-ds-text-muted">Strecke</div>
              </div>
            )}
            {user.distanceRemaining != null && (
              <div className="bg-ds-surface-2/60 rounded-xl p-2 text-center">
                <IconTarget size={14} color={user.color} />
                <div className="text-xs font-bold mt-0.5">{formatDistance(user.distanceRemaining)}</div>
                <div className="text-[9px] text-ds-text-muted">Rest</div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: `${user.color}15`, color: user.color, border: `1px solid ${user.color}30` }}
            onClick={onFocus}
          >
            Fokussieren
          </button>
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-ds-surface-2 text-ds-text-muted border border-ds-border/50"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MapHomePage ─────────────────────────────────────────────────────────────

export function MapHomePage() {
  const { map, loaded, flyTo, addUserRoute, clearAllUserRoutes, fetchRoute, setInteractive } = useMap();
  const users = useLiveStore((s) => s.users);
  const selectedUserId = useLiveStore((s) => s.selectedUserId);
  const selectUser = useLiveStore((s) => s.selectUser);
  const updateUser = useLiveStore((s) => s.updateUser);
  const addUser = useLiveStore((s) => s.addUser);
  const removeUser = useLiveStore((s) => s.removeUser);
  const authUser = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const getUserStats = useTripHistoryStore((s) => s.getUserStats);
  const { position: selfPosition, status: gpsStatus, startTracking } = useGeolocation({ autoStart: true });
  const [showSearch, setShowSearch] = useState(false);
  const [showDriverList, setShowDriverList] = useState(false);

  // Ensure map is interactive on this page
  useEffect(() => {
    setInteractive(true);
  }, [setInteractive]);

  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const routesFetched = useRef<Set<string>>(new Set());

  // Fetch and draw routes for driving users
  useEffect(() => {
    if (!loaded) return;

    const drivingUsers = users.filter((u) => u.status === 'driving' && u.destination && !routesFetched.current.has(u.id));
    drivingUsers.forEach(async (user) => {
      if (!user.destination) return;
      routesFetched.current.add(user.id);
      // Use destination coordinates from user route if available
      const destCoord: [number, number] | undefined = user.route?.[user.route.length - 1];
      if (!destCoord) return;
      const result = await fetchRoute(user.position, destCoord);
      if (result) {
        addUserRoute(user.id, result.coordinates, user.color);
        updateUser(user.id, {
          route: result.coordinates,
          eta: result.duration,
          distanceRemaining: result.distance,
        });
      }
    });

    return () => {
      clearAllUserRoutes();
    };
  }, [loaded, users, fetchRoute, addUserRoute, clearAllUserRoutes, updateUser]);

  // Create / update markers
  useEffect(() => {
    if (!map || !loaded) return;

    const currentIds = new Set(users.map((u) => u.id));

    // Remove markers for users no longer present
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add or update markers
    for (const user of users) {
      const existing = markersRef.current.get(user.id);
      if (existing) {
        existing.setLngLat(user.position);
        existing.setRotation(user.heading);
      } else {
        const el = createMarkerElement(user);
        el.addEventListener('click', () => selectUser(user.id));
        const marker = new mapboxgl.Marker({ element: el, rotation: user.heading, rotationAlignment: 'map' })
          .setLngLat(user.position)
          .addTo(map);
        markersRef.current.set(user.id, marker);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, loaded, users]);

  // Cleanup markers only on unmount
  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
    };
  }, []);

  // Register self as live user
  useEffect(() => {
    if (!authUser) return;

    const userId = authUser.id;
    const username = authUser.displayName ?? authUser.username;
    const initials = username.slice(0, 2).toUpperCase();
    const stats = getUserStats(userId);

    // Add self to liveStore
    const selfUser: LiveUser = {
      id: userId,
      username,
      initials,
      color: USER_COLORS[0]!,
      position: [8.6700, 50.1100], // default Frankfurt, updated by GPS
      heading: 0,
      status: 'idle',
      speed: 0,
      score: stats.avgScore,
      profilePicture: profile?.profilePicture,
      isSelf: true,
      lastUpdate: Date.now(),
    };
    addUser(selfUser);

    return () => {
      removeUser(userId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Update self-user position from shared GPS hook
  const hasFlyToSelf = useRef(false);
  useEffect(() => {
    if (!authUser || !selfPosition) return;
    const center: [number, number] = [selfPosition.lng, selfPosition.lat];
    updateUser(authUser.id, {
      position: center,
      heading: selfPosition.heading ?? 0,
      speed: (selfPosition.speed ?? 0) * 3.6,
    });
    if (!hasFlyToSelf.current) {
      hasFlyToSelf.current = true;
      flyTo({ center, zoom: 14, pitch: 45, bearing: -15, duration: 2000 });
    }
  }, [authUser, selfPosition, updateUser, flyTo]);

  // Handle user focus
  const handleFocusUser = useCallback((userId: string) => {
    const user = useLiveStore.getState().users.find((u) => u.id === userId);
    if (user) {
      flyTo({ center: user.position, zoom: 16, pitch: 55, duration: 1200 });
    }
  }, [flyTo]);

  const handleSelectUser = useCallback((userId: string) => {
    selectUser(selectedUserId === userId ? null : userId);
    const user = useLiveStore.getState().users.find((u) => u.id === userId);
    if (user) {
      flyTo({ center: user.position, zoom: 15, pitch: 50, duration: 1000 });
    }
  }, [selectUser, selectedUserId, flyTo]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Layout showNav mapMode>
      {/* Route Search */}
      <AnimatePresence>
        {showSearch && (
          <RouteSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
        )}
      </AnimatePresence>

      {/* Search button (when search is closed) */}
      {!showSearch && (
        <button
          className="absolute top-4 left-4 right-4 z-20 mt-safe-top glass rounded-2xl px-5 py-5 flex items-center gap-4 text-left pointer-events-auto"
          onClick={() => setShowSearch(true)}
        >
          <div className="w-10 h-10 rounded-full bg-ds-primary/10 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div className="flex-1">
            <span className="text-base text-white/80 font-medium">Wohin möchtest du fahren?</span>
            <p className="text-xs text-ds-text-muted mt-0.5">Suche nach Ort, Adresse oder POI</p>
          </div>
        </button>
      )}

      {/* GPS Permission Banner */}
      {!showSearch && (gpsStatus === 'requesting_permission' || gpsStatus === 'error_denied' || gpsStatus === 'unsupported' || gpsStatus === 'initializing') && (
        <div
          className="absolute top-20 left-4 right-4 z-20 mt-safe-top glass rounded-2xl p-4 pointer-events-auto"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-ds-primary/15 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-ds-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold mb-1">
                {gpsStatus === 'error_denied' ? 'Standort verweigert' : 'Standort benötigt'}
              </h3>
              <p className="text-xs text-ds-text-muted leading-relaxed">
                {gpsStatus === 'error_denied'
                  ? getPermissionHint()
                  : 'DriveSense braucht deinen Standort, um die Karte und Navigation zu nutzen.'}
              </p>
              <button
                className="mt-2 px-4 py-2 rounded-xl bg-ds-primary text-ds-bg text-xs font-bold w-full"
                onClick={startTracking}
              >
                {gpsStatus === 'error_denied' ? 'Erneut versuchen' : 'Standort aktivieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver list toggle button (bottom) */}
      {!showSearch && (
        <button
          className="absolute bottom-32 right-4 z-20 glass rounded-full w-12 h-12 flex items-center justify-center pointer-events-auto overflow-hidden"
          onClick={() => setShowDriverList(!showDriverList)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <IconUsers size={20} />
            {users.filter((u) => u.status === 'driving').length > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-ds-success text-[9px] font-bold text-ds-bg flex items-center justify-center border border-ds-bg">
                {users.filter((u) => u.status === 'driving').length}
              </div>
            )}
          </div>
        </button>
      )}

      {/* Expandable driver list panel (bottom) */}
      <AnimatePresence>
        {showDriverList && !showSearch && (
          <motion.div
            className="absolute bottom-28 left-4 right-4 z-20 glass rounded-2xl overflow-hidden pointer-events-auto"
            initial={{ opacity: 0, y: 30, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 30, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="px-4 py-3 border-b border-ds-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-ds-success animate-pulse" />
                <span className="text-xs font-semibold">{users.length} Fahrer online</span>
              </div>
              <button
                className="text-xs text-ds-text-muted hover:text-ds-text"
                onClick={() => setShowDriverList(false)}
              >
                Schließen
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {users.map((user) => (
                <motion.button
                  key={user.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ds-surface-2/50 transition-colors text-left border-b border-ds-border/20 last:border-0"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleSelectUser(user.id);
                    setShowDriverList(false);
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{
                      border: `2px solid ${user.color}`,
                      background: `${user.color}15`,
                    }}
                  >
                    {user.profilePicture ? (
                      <img src={user.profilePicture} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      <span className="text-xs font-bold" style={{ color: user.color }}>{user.initials}</span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{user.username}</span>
                      {user.isSelf && <span className="text-[10px] text-ds-primary font-medium">(Du)</span>}
                    </div>
                    <div className="text-xs text-ds-text-muted">
                      {user.status === 'driving' ? (
                        <span className="text-ds-success">{Math.round(user.speed)} km/h · Unterwegs</span>
                      ) : (
                        <span>Online</span>
                      )}
                    </div>
                  </div>
                  {/* Score */}
                  {user.score > 0 && (
                    <div className="text-sm font-bold" style={{ color: user.color }}>{user.score}</div>
                  )}
                </motion.button>
              ))}
              {users.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-ds-text-muted">
                  Keine Fahrer online
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User detail card */}
      <AnimatePresence>
        {selectedUser && (
          <UserCard
            key={selectedUser.id}
            user={selectedUser}
            onClose={() => selectUser(null)}
            onFocus={() => handleFocusUser(selectedUser.id)}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
