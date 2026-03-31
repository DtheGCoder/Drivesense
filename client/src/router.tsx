import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MapHomePage } from '@/pages/MapHomePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DrivePage } from '@/pages/DrivePage';
import { TripsPage } from '@/pages/TripsPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoginPage } from '@/pages/AuthPages';
import { AdminPage } from '@/pages/AdminPage';
import { useAuthStore } from '@/stores/authStore';

// ─── Auth Guard ──────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/map" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  // Auth routes (redirect if already logged in)
  { path: '/login', element: <RedirectIfAuth><LoginPage /></RedirectIfAuth> },

  // Protected app routes
  { path: '/map', element: <RequireAuth><MapHomePage /></RequireAuth> },
  { path: '/dashboard', element: <RequireAuth><DashboardPage /></RequireAuth> },
  { path: '/drive', element: <RequireAuth><DrivePage /></RequireAuth> },
  { path: '/trips', element: <RequireAuth><TripsPage /></RequireAuth> },
  { path: '/trips/:id', element: <RequireAuth><TripDetailPage /></RequireAuth> },
  { path: '/leaderboard', element: <RequireAuth><LeaderboardPage /></RequireAuth> },
  { path: '/profile', element: <RequireAuth><ProfilePage /></RequireAuth> },
  { path: '/admin', element: <RequireAuth><AdminPage /></RequireAuth> },

  // Default redirect
  { path: '/', element: <Navigate to="/map" replace /> },
  { path: '*', element: <Navigate to="/map" replace /> },
]);
