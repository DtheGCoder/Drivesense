import { create } from 'zustand';

interface FriendPosition {
  userId: string;
  username: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  updatedAt: number;
}

interface LiveState {
  isConnected: boolean;
  friendPositions: Map<string, FriendPosition>;
  setConnected: (connected: boolean) => void;
  updateFriend: (pos: FriendPosition) => void;
  removeFriend: (userId: string) => void;
  clearFriends: () => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  isConnected: false,
  friendPositions: new Map(),
  setConnected: (isConnected) => set({ isConnected }),
  updateFriend: (pos) =>
    set((s) => {
      const next = new Map(s.friendPositions);
      next.set(pos.userId, pos);
      return { friendPositions: next };
    }),
  removeFriend: (userId) =>
    set((s) => {
      const next = new Map(s.friendPositions);
      next.delete(userId);
      return { friendPositions: next };
    }),
  clearFriends: () => set({ friendPositions: new Map() }),
}));
