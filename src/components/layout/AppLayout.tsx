import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import { useAuth } from '@/contexts/AuthContext';
import CallManager from '@/components/calls/CallManager';

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Hide bottom navigation on chat room pages
  const hideBottomNav = location.pathname.match(/^\/messages\/[^/]+$/);

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background max-w-[100vw]">
      <main className={`flex-1 overflow-y-auto overflow-x-hidden ${hideBottomNav ? '' : 'pb-14'}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <Outlet />
      </main>
      {!hideBottomNav && <BottomNavigation />}
      <CallManager />
    </div>
  );
};

export default AppLayout;
