import { useEffect, useRef, useCallback } from 'react';
import { getToken } from '@/lib/api';
import { useLiveStore, USER_COLORS, type LiveUser } from '@/stores/liveStore';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useGeolocation } from '@/hooks/useGeolocation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServerUser {
  id: string;
  username: string;
  profilePicture?: string;
  position?: [number, number];
  heading: number;
  speed: number;
  status: string;
  route?: [number, number][];
  destination?: string;
  lastUpdate: number;
}

// ─── WebSocket URL ───────────────────────────────────────────────────────────

function getWsUrl(): string {
  const token = getToken();
  const loc = window.location;
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${loc.host}/api/v1/ws?token=${encodeURIComponent(token ?? '')}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface LiveTrackingOptions {
  route?: [number, number][] | null;
  destination?: string | null;
  status?: 'idle' | 'driving';
}

export function useLiveTracking(options: LiveTrackingOptions = {}) {
  const { route, destination, status: statusOverride } = options;
  const authUser = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const { position } = useGeolocation({ autoStart: true });
  const setUsers = useLiveStore((s) => s.setUsers);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const colorMapRef = useRef<Map<string, string>>(new Map());
  const nextColorIdx = useRef(1);

  const assignColor = useCallback((userId: string): string => {
    const existing = colorMapRef.current.get(userId);
    if (existing) return existing;
    const color = USER_COLORS[nextColorIdx.current % USER_COLORS.length]!;
    nextColorIdx.current++;
    colorMapRef.current.set(userId, color);
    return color;
  }, []);

  // Build a self-user LiveUser from local data
  const buildSelfUser = useCallback((): LiveUser | null => {
    if (!authUser || !position) return null;
    return {
      id: authUser.id,
      username: authUser.username,
      initials: authUser.username.slice(0, 2).toUpperCase(),
      color: USER_COLORS[0]!,
      position: [position.lng, position.lat],
      heading: position.heading ?? 0,
      status: (statusOverride ?? 'idle') as 'idle' | 'driving',
      speed: (position.speed ?? 0) * 3.6,
      score: 0,
      profilePicture: profile?.profilePicture,
      isSelf: true,
      route: route ?? undefined,
      destination: destination ?? undefined,
      lastUpdate: Date.now(),
    };
  }, [authUser, position, statusOverride, profile?.profilePicture, route, destination]);

  // Always ensure self is visible — runs on every GPS update
  useEffect(() => {
    const self = buildSelfUser();
    if (!self) return;

    const current = useLiveStore.getState().users;
    const hasSelf = current.some((u) => u.isSelf);

    if (!hasSelf) {
      // No self in the store yet — add it
      setUsers([self, ...current.filter((u) => u.id !== self.id)]);
    } else {
      // Update self position in-place (don't overwrite other users from WS)
      setUsers(current.map((u) => u.isSelf ? { ...u, position: self.position, heading: self.heading, speed: self.speed, status: self.status, lastUpdate: Date.now() } : u));
    }
  }, [position, buildSelfUser, setUsers]);

  // Connect WebSocket
  useEffect(() => {
    if (!authUser) return;
    const token = getToken();
    if (!token) return;

    let alive = true;

    function connect() {
      if (!alive) return;
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'users' && Array.isArray(data.users)) {
            const serverUsers = data.users as ServerUser[];
            const liveUsers: LiveUser[] = serverUsers.map((su) => {
              const isSelf = su.id === authUser!.id;
              return {
                id: su.id,
                username: su.username,
                initials: su.username.slice(0, 2).toUpperCase(),
                color: isSelf ? USER_COLORS[0]! : assignColor(su.id),
                position: su.position ?? [8.67, 50.11],
                heading: su.heading,
                status: (su.status === 'driving' ? 'driving' : 'idle') as 'idle' | 'driving',
                speed: su.speed,
                score: 0,
                profilePicture: isSelf ? profile?.profilePicture : su.profilePicture,
                isSelf,
                route: su.route,
                destination: su.destination,
                lastUpdate: su.lastUpdate,
              };
            });

            // Always ensure self is in the list with local GPS position
            const self = buildSelfUser();
            const hasSelfFromServer = liveUsers.some((u) => u.isSelf);
            if (self && hasSelfFromServer) {
              // Merge: use server data for others, but override self position with local GPS
              setUsers(liveUsers.map((u) => u.isSelf ? { ...u, position: self.position, heading: self.heading, speed: self.speed } : u));
            } else if (self && !hasSelfFromServer) {
              // Server doesn't include self (shouldn't happen, but safeguard)
              setUsers([self, ...liveUsers]);
            } else {
              setUsers(liveUsers);
            }
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (alive) reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => { ws.close(); };
    }

    connect();

    return () => {
      alive = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Send position updates to server
  useEffect(() => {
    if (!position || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'position',
      position: [position.lng, position.lat],
      heading: position.heading ?? 0,
      speed: (position.speed ?? 0) * 3.6,
      status: statusOverride ?? 'idle',
      route: route ?? null,
      destination: destination ?? null,
    }));
  }, [position, route, destination, statusOverride]);
}
