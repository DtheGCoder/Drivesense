import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { MapProvider, PersistentMapCanvas } from '@/components/map/MapProvider';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useTripHistoryStore } from '@/stores/tripHistoryStore';

export function App() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage);
  const user = useAuthStore((s) => s.user);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const loadTrips = useTripHistoryStore((s) => s.loadTrips);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Load profile and trips when user changes
  useEffect(() => {
    if (user?.id) {
      loadProfile(user.id);
      loadTrips(user.id);
    }
  }, [user?.id, loadProfile, loadTrips]);

  return (
    <MapProvider>
      <PersistentMapCanvas />
      <RouterProvider router={router} />
    </MapProvider>
  );
}
