import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { DrivePage } from '@/pages/DrivePage';
import { TripsPage } from '@/pages/TripsPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';

export const router = createBrowserRouter([
  // Auth routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // App routes
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/drive', element: <DrivePage /> },
  { path: '/trips', element: <TripsPage /> },
  { path: '/trips/:id', element: <TripDetailPage /> },
  { path: '/leaderboard', element: <LeaderboardPage /> },
  { path: '/profile', element: <ProfilePage /> },

  // Default redirect
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
