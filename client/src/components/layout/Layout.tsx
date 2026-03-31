import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  fullScreen?: boolean;
}

export function Layout({ children, showNav = true, fullScreen = false }: LayoutProps) {
  return (
    <div className={`min-h-dvh flex flex-col ${fullScreen ? '' : 'pb-[calc(80px+var(--spacing-safe-bottom))]'}`}>
      <AnimatePresence mode="wait">
        <motion.main
          className={`flex-1 ${fullScreen ? '' : 'px-4 pt-safe-top'}`}
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
