'use client';

import { motion } from 'framer-motion';
import { Sidebar, SidebarProvider, useSidebar } from '@/components/sidebar';
import { UserProvider } from '@/contexts/user-context';
import type { User } from '@/types/database';

// Match the sidebar transition for synchronized animation
const contentTransition = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1],
};

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <>
      {/* Desktop Content */}
      <motion.main
        initial={false}
        animate={{ paddingLeft: collapsed ? 72 : 260 }}
        transition={contentTransition}
        className="hidden lg:block min-h-screen"
      >
        <div className="p-6 lg:p-10">{children}</div>
      </motion.main>

      {/* Mobile Content */}
      <main className="lg:hidden pt-14 pb-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: User | null;
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <UserProvider initialUser={user}>
      <SidebarProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <DashboardContent>{children}</DashboardContent>
        </div>
      </SidebarProvider>
    </UserProvider>
  );
}
