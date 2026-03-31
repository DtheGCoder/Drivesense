import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTripStore } from '@/stores/tripStore';

const navItems = [
  {
    path: '/map',
    label: 'Karte',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f0ff' : '#5e5e76'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    path: '/trips',
    label: 'Fahrten',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f0ff' : '#5e5e76'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    path: '/drive',
    label: 'Fahren',
    icon: (_active: boolean) => null, // special button
    isSpecial: true,
  },
  {
    path: '/leaderboard',
    label: 'Ranking',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f0ff' : '#5e5e76'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 6 9 6 9z" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 18 9 18 9z" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0012 0V2z" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f0ff' : '#5e5e76'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const location = useLocation();
  const tripStatus = useTripStore((s) => s.status);
  const isRecording = tripStatus === 'recording';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-ds-border-subtle pointer-events-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-20 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          if (item.isSpecial) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative -mt-8 flex flex-col items-center"
              >
                {/* Outer glow ring */}
                <div className={`absolute inset-0 rounded-full ${isRecording ? 'animate-pulse-ring bg-ds-danger' : ''}`} 
                  style={{ width: 64, height: 64, top: -4, left: -4 }}
                />
                <motion.div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                    isRecording
                      ? 'bg-gradient-to-br from-ds-danger to-red-700'
                      : 'bg-gradient-to-br from-ds-primary to-ds-primary-dim'
                  }`}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  style={{
                    boxShadow: isRecording
                      ? '0 0 24px rgba(255,51,85,0.5), 0 4px 16px rgba(0,0,0,0.4)'
                      : '0 0 24px rgba(0,240,255,0.4), 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="white" stroke="none">
                    {isRecording ? (
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    ) : (
                      <polygon points="5,3 19,12 5,21" />
                    )}
                  </svg>
                </motion.div>
                <span className={`text-[10px] mt-1.5 font-medium ${
                  isRecording ? 'text-ds-danger' : 'text-ds-primary'
                }`}>
                  {isRecording ? 'Stopp' : 'Fahren'}
                </span>
              </NavLink>
            );
          }

          const isActive = location.pathname === item.path ||
            (item.path === '/map' && location.pathname === '/');

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 py-2 px-3 min-w-[56px] relative"
            >
              {isActive && (
                <motion.div
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ds-primary rounded-full"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {item.icon(isActive)}
              <span className={`text-[10px] font-medium transition-colors duration-200 ${
                isActive ? 'text-ds-primary' : 'text-ds-text-muted'
              }`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
