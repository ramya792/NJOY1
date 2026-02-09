import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import { useAuth } from '@/contexts/AuthContext';
import CallManager from '@/components/calls/CallManager';

const AppLayout: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="safe-bottom">
        <Outlet />
      </main>
      <BottomNavigation />
      <CallManager />
    </div>
  );
};

export default AppLayout;
