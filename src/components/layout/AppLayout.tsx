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
    <div className="min-h-screen bg-background">
      <main className={hideBottomNav ? '' : 'safe-bottom'}>
        <Outlet />
      </main>
      {!hideBottomNav && <BottomNavigation />}
      <CallManager />
    </div>
  );
};

export default AppLayout;
