import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, UserPlus, UserCheck, UserX, MessageCircle, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, query, where, getDocs, doc, updateDoc, arrayUnion, deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow_request' | 'follow_accepted' | 'message' | 'reel_like' | 'reel_comment';
  fromUserId: string;
  fromUsername: string;
  fromUserPhoto: string;
  postId?: string;
  reelId?: string;
  conversationId?: string;
  postImage?: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const Notifications = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    const fetchNotifications = async () => {
      try {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('toUserId', '==', userProfile.uid)
        );
        const snapshot = await getDocs(notificationsQuery);
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })) as Notification[];
        
        fetched.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setNotifications(fetched);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userProfile]);

  const handleAcceptFollow = async (notification: Notification) => {
    if (!userProfile) return;
    try {
      await updateUserProfile({
        followers: [...(userProfile.followers || []), notification.fromUserId],
      });
      const otherUserRef = doc(db, 'users', notification.fromUserId);
      await updateDoc(otherUserRef, { following: arrayUnion(userProfile.uid) });
      await deleteDoc(doc(db, 'notifications', notification.id));
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error('Error accepting follow:', error);
    }
  };

  const handleRejectFollow = async (notification: Notification) => {
    try {
      await deleteDoc(doc(db, 'notifications', notification.id));
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error('Error rejecting follow:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
        if (notification.postId) {
          navigate(`/?postId=${notification.postId}`);
        }
        break;
      case 'reel_like':
      case 'reel_comment':
        if (notification.reelId) {
          navigate(`/reels?reelId=${notification.reelId}`);
        }
        break;
      case 'message':
        if (notification.conversationId) {
          navigate(`/messages/${notification.conversationId}`);
        } else {
          // Try to find conversation with this user
          navigate(`/messages/new?userId=${notification.fromUserId}`);
        }
        break;
      case 'follow_request':
        // Don't navigate, let user accept/reject
        break;
      case 'follow_accepted':
        navigate(`/user/${notification.fromUserId}`);
        break;
      default:
        navigate(`/user/${notification.fromUserId}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': 
      case 'reel_like':
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment': 
      case 'reel_comment':
        return <MessageCircle className="w-5 h-5 text-primary" />;
      case 'follow_request': 
        return <UserPlus className="w-5 h-5 text-primary" />;
      case 'follow_accepted': 
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      default: 
        return null;
    }
  };

  const getNotificationPreview = (notification: Notification) => {
    if (notification.postImage) {
      return (
        <div className="w-12 h-12 rounded overflow-hidden bg-secondary flex-shrink-0">
          <img src={notification.postImage} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }
    
    if (notification.type === 'reel_like' || notification.type === 'reel_comment') {
      return (
        <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
          <Film className="w-6 h-6 text-muted-foreground" />
        </div>
      );
    }

    return null;
  };

  return (
    <div ref={ref} className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg ml-2">Notifications</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full skeleton" />
                <div className="flex-1">
                  <div className="h-4 w-48 skeleton mb-2" />
                  <div className="h-3 w-20 skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Heart className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-display font-semibold text-xl mb-2">No Notifications Yet</h2>
            <p className="text-muted-foreground max-w-xs">
              When someone likes your posts, comments, or sends you a follow request, you'll see it here.
            </p>
          </motion.div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50 transition-colors ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
                onClick={() => notification.type !== 'follow_request' && handleNotificationClick(notification)}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/${notification.fromUserId}`);
                  }} 
                  className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0"
                >
                  {notification.fromUserPhoto ? (
                    <img 
                      src={notification.fromUserPhoto} 
                      alt={notification.fromUsername} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                      {notification.fromUsername?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {getNotificationIcon(notification.type)}
                    <p className="text-sm">
                      <span className="font-semibold">{notification.fromUsername}</span>{' '}
                      {notification.message}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                  </p>
                </div>

                {notification.type === 'follow_request' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptFollow(notification);
                      }} 
                      className="btn-gradient"
                    >
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectFollow(notification);
                      }}
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {getNotificationPreview(notification)}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

Notifications.displayName = 'Notifications';

export default Notifications;
