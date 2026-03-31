import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  fullScreen?: boolean;
  /** When true, map is fully visible and content floats on top without backdrop */
  mapMode?: boolean;
}

export function Layout({ children, showNav = true, fullScreen = false, mapMode = false }: LayoutProps) {
  return (
    <div className={`${mapMode ? 'h-dvh overflow-hidden' : 'min-h-dvh'} flex flex-col relative`}>
      {/* Semi-transparent backdrop — hides map slightly on non-map pages */}
      {!mapMode && (
        <div className="fixed inset-0 z-[1] bg-ds-bg/70 backdrop-blur-sm pointer-events-none" />
      )}

      {/* Page content */}
      <AnimatePresence mode="wait">
        <motion.main
          className={`flex-1 relative z-[2] overflow-hidden ${mapMode ? 'pointer-events-none' : ''} ${fullScreen ? '' : `px-4 pt-safe-top ${showNav ? 'pb-[calc(80px+var(--spacing-safe-bottom))]' : ''}`}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {showNav && <BottomNav />}
    </div>
  );
}
