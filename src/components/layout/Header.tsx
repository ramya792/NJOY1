import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  title?: string;
  showNotifications?: boolean;
  showCreate?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title = 'NJOY', 
  showNotifications = true,
  showCreate = true 
}) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userProfile?.uid || !showNotifications) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const unreadExists = snapshot.docs.some(doc => doc.data().read === false);
      setHasUnread(unreadExists);
    }, (error) => {
      console.error('Error fetching notifications for badge:', error);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, showNotifications]);

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <motion.h1 
          className="font-display font-bold text-2xl gradient-text"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.h1>

        <div className="flex items-center gap-1">
          {showCreate && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/create')}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Create post"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          )}
          
          {showNotifications && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Notifications"
            >
              <Heart className={`w-6 h-6 ${hasUnread ? 'text-red-500 fill-red-500' : ''}`} />
              {hasUnread && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background animate-pulse"></span>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
