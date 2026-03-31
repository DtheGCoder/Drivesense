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
  /** Current route coordinates (when navigating) */
  route?: [number, number][] | null;
  /** Destination name */
  destination?: string | null;
  /** User status override */
  status?: 'idle' | 'driving';
}

export function useLiveTracking(options: LiveTrackingOptions = {}) {
  const { route, destination, status: statusOverride } = options;
  const authUser = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const { position } = useGeolocation({ autoStart: true });
  const setUsers = useLiveStore((s) => s.setUsers);
  const updateUser = useLiveStore((s) => s.updateUser);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const colorMapRef = useRef<Map<string, string>>(new Map());
  const nextColorIdx = useRef(1); // 0 is reserved for self
  const wsConnectedRef = useRef(false);

  const assignColor = useCallback((userId: string): string => {
    const existing = colorMapRef.current.get(userId);
    if (existing) return existing;
    const color = USER_COLORS[nextColorIdx.current % USER_COLORS.length]!;
    nextColorIdx.current++;
    colorMapRef.current.set(userId, color);
    return color;
  }, []);

  // Local self-user fallback — always show yourself even without WebSocket
  useEffect(() => {
    if (!authUser || !position) {
      console.log('[LiveTracking] fallback skip — authUser:', !!authUser, 'position:', !!position);
      return;
    }

    // If WebSocket is connected and feeding data, server broadcasts include self — skip local fallback
    if (wsConnectedRef.current) {
      console.log('[LiveTracking] WS connected, server handles user list');
      return;
    }

    console.log('[LiveTracking] local fallback — adding self user at', [position.lng, position.lat]);

    const selfUser: LiveUser = {
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

    // If store is empty or only has self → set as sole user
    const current = useLiveStore.getState().users;
    if (current.length === 0) {
      setUsers([selfUser]);
    } else {
      // Update existing self entry with fresh position
      const hasSelf = current.some((u) => u.id === authUser.id);
      if (hasSelf) {
        updateUser(authUser.id, {
          position: selfUser.position,
          heading: selfUser.heading,
          speed: selfUser.speed,
          status: selfUser.status,
        });
      } else {
        setUsers([selfUser, ...current]);
      }
    }
  }, [position, authUser?.id, statusOverride, route, destination, profile?.profilePicture, setUsers, updateUser]);

  // Connect WebSocket
  useEffect(() => {
    if (!authUser) return;

    const token = getToken();
    if (!token) return;

    let alive = true;

    function connect() {
      if (!alive) return;
      console.log('[LiveTracking] WS connecting to', getWsUrl().replace(/token=.*/, 'token=***'));
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[LiveTracking] WS opened');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[LiveTracking] WS message:', data.type, 'users:', data.users?.length);
          if (data.type === 'users' && Array.isArray(data.users)) {
            wsConnectedRef.current = true;
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
            setUsers(liveUsers);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = (ev) => {
        console.log('[LiveTracking] WS closed:', ev.code, ev.reason);
        wsRef.current = null;
        wsConnectedRef.current = false;
        if (alive) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (ev) => {
        console.error('[LiveTracking] WS error:', ev);
        ws.close();
      };
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

  // Send position updates
  useEffect(() => {
    if (!position || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const msg: Record<string, unknown> = {
      type: 'position',
      position: [position.lng, position.lat],
      heading: position.heading ?? 0,
      speed: (position.speed ?? 0) * 3.6,
      status: statusOverride ?? 'idle',
      route: route ?? null,
      destination: destination ?? null,
    };

    wsRef.current.send(JSON.stringify(msg));
  }, [position, route, destination, statusOverride]);
}
