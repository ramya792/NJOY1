import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, UserPlus, UserCheck, UserX, MessageCircle, Film, AtSign, Plus, Image as ImageIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, query, where, getDocs, doc, updateDoc, arrayUnion, deleteDoc, addDoc, serverTimestamp, onSnapshot, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow_request' | 'follow_accepted' | 'message' | 'reel_like' | 'reel_comment' | 'mention';
  fromUserId: string;
  fromUsername: string;
  fromUserPhoto: string;
  postId?: string;
  reelId?: string;
  storyId?: string;
  storyMediaUrl?: string;
  storyMediaType?: 'image' | 'video';
  conversationId?: string;
  postImage?: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const Notifications = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddToStoryDialog, setShowAddToStoryDialog] = useState(false);
  const [selectedMentionNotification, setSelectedMentionNotification] = useState<Notification | null>(null);
  const [addingToStory, setAddingToStory] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [viewingStory, setViewingStory] = useState<Notification | null>(null);
  
  // Double tap detection
  const tapTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = React.useRef(0);

  useEffect(() => {
    if (!userProfile) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userProfile.uid)
    );
    
    // Use real-time listener for instant updates
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const fetched = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as Notification[];
      
      // Sort locally to avoid needing composite index
      fetched.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setNotifications(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Mark all unread notifications as read when viewed
  useEffect(() => {
    const markAsRead = async () => {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;
      
      for (const notification of unread) {
        try {
          await updateDoc(doc(db, 'notifications', notification.id), { read: true });
        } catch (error) {
          console.error('Error marking as read:', error);
        }
      }
    };

    if (notifications.length > 0) {
      // Use timeout to prevent rapid state updates on initial render
      const timeoutId = setTimeout(markAsRead, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [notifications]);

  // Cleanup tap timer on unmount
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

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

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
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
          navigate(`/post/${notification.postId}`);
        }
        break;
      case 'reel_like':
      case 'reel_comment':
        if (notification.reelId) {
          navigate(`/reels?id=${notification.reelId}`);
        }
        break;
      case 'message':
      case 'mention':
        if (notification.conversationId) {
          navigate(`/chat/${notification.conversationId}`);
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

  const handleAddToStory = async () => {
    if (!selectedMentionNotification || !userProfile) return;
    
    if (!selectedMentionNotification.storyMediaUrl) {
      toast({
        title: 'Error',
        description: 'Story media is no longer available.',
        variant: 'destructive',
      });
      setShowAddToStoryDialog(false);
      setSelectedMentionNotification(null);
      return;
    }
    
    setAddingToStory(true);
    try {
      // Add the mentioned story to current user's stories
      await addDoc(collection(db, 'stories'), {
        userId: userProfile.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL || '',
        mediaUrl: selectedMentionNotification.storyMediaUrl,
        mediaType: selectedMentionNotification.storyMediaType || 'image',
        createdAt: serverTimestamp(),
        viewedBy: [],
        likes: [],
        mentions: [],
        music: null,
        isRepost: true,
        originalUserId: selectedMentionNotification.fromUserId,
        originalUsername: selectedMentionNotification.fromUsername,
      });
      
      toast({
        title: 'Added to your story!',
        description: 'The story has been shared to your profile.',
      });
      
      setShowAddToStoryDialog(false);
      setSelectedMentionNotification(null);
    } catch (error) {
      console.error('Error adding to story:', error);
      toast({
        title: 'Error',
        description: 'Could not add to story. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAddingToStory(false);
    }
  };

  const getNotificationBadge = (type: string) => {
    let icon = null;
    let bgColor = "bg-primary";
    
    switch (type) {
      case 'like': 
      case 'reel_like':
        icon = <Heart className="w-3 h-3 text-white fill-white" />;
        bgColor = "bg-red-500";
        break;
      case 'comment': 
      case 'reel_comment':
        icon = <MessageCircle className="w-3 h-3 text-white fill-white" />;
        bgColor = "bg-blue-500";
        break;
      case 'follow_request': 
        icon = <UserPlus className="w-3 h-3 text-white" />;
        bgColor = "bg-blue-500";
        break;
      case 'follow_accepted': 
        icon = <UserCheck className="w-3 h-3 text-white" />;
        bgColor = "bg-green-500";
        break;
      case 'message':
        icon = <MessageCircle className="w-3 h-3 text-white fill-white" />;
        bgColor = "bg-blue-500";
        break;
      case 'mention':
        icon = <AtSign className="w-3 h-3 text-white" />;
        bgColor = "bg-purple-500";
        break;
      default: 
        return null;
    }
    
    return (
      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center z-10 ${bgColor}`}>
        {icon}
      </div>
    );
  };

  const handleStoryPreviewTap = (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    tapCountRef.current += 1;
    
    if (tapCountRef.current === 1) {
      tapTimerRef.current = setTimeout(() => {
        if (!showStoryViewer) {
          setViewingStory(notification);
          setShowStoryViewer(true);
        }
        tapCountRef.current = 0;
      }, 300);
    } else if (tapCountRef.current === 2) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
      setShowStoryViewer(false); 
      setSelectedMentionNotification(notification);
      setShowAddToStoryDialog(true);
      tapCountRef.current = 0;
    }
  };

  const getNotificationPreview = (notification: Notification) => {
    if (notification.postImage) {
      return (
        <div className="w-11 h-11 rounded overflow-hidden bg-secondary flex-shrink-0 ml-2">
          <img src={notification.postImage} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }
    
    if (notification.type === 'reel_like' || notification.type === 'reel_comment') {
      return (
        <div className="w-11 h-11 rounded bg-secondary flex items-center justify-center flex-shrink-0 ml-2 relative overflow-hidden">
           {/* If we had a thumbnail url we'd show it here. For now show icon. */}
          <Film className="w-5 h-5 text-muted-foreground" />
        </div>
      );
    }
    
    if (notification.type === 'mention' && notification.storyMediaUrl) {
      return (
        <button 
          className="w-11 h-11 rounded overflow-hidden bg-secondary flex-shrink-0 relative group ml-2"
          onClick={(e) => handleStoryPreviewTap(notification, e)}
        >
          {notification.storyMediaType === 'video' ? (
            <video src={notification.storyMediaUrl} className="w-full h-full object-cover" />
          ) : (
            <img src={notification.storyMediaUrl} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>
      );
    }

    return null;
  };

  const getGroupedNotifications = () => {
    const today: Notification[] = [];
    const thisWeek: Notification[] = [];
    const thisMonth: Notification[] = [];
    const older: Notification[] = [];
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;
    
    notifications.forEach(n => {
      const time = n.createdAt.getTime();
      if (time >= todayStart) today.push(n);
      else if (time >= weekStart) thisWeek.push(n);
      else if (time >= monthStart) thisMonth.push(n);
      else older.push(n);
    });
    
    return [
      { label: 'Today', items: today },
      { label: 'Last 7 days', items: thisWeek },
      { label: 'This Month', items: thisMonth },
      { label: 'Older', items: older }
    ].filter(g => g.items.length > 0);
  };

  return (
    <div ref={ref} className="h-full flex flex-col overflow-y-auto overflow-x-hidden bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg ml-2">Notifications</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full pb-6">
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
          <div className="flex flex-col">
            {getGroupedNotifications().map((group) => (
              <div key={group.label} className="mt-2 border-b border-border/50 pb-2 last:border-0">
                <h3 className="px-4 py-2 text-[15px] font-bold text-foreground">{group.label}</h3>
                
                <div className="flex flex-col">
                  {group.items.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`flex items-center px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => notification.type !== 'follow_request' && handleNotificationClick(notification)}
                    >
                      {/* Avatar with badge */}
                      <div className="relative mr-3 flex-shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/${notification.fromUserId}`);
                          }} 
                          className="w-[44px] h-[44px] rounded-full overflow-hidden bg-secondary border border-border/50"
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
                        {getNotificationBadge(notification.type)}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-[14px] leading-tight">
                          <span className="font-bold mr-1">{notification.fromUsername}</span>
                          <span className="text-foreground/90">{notification.message}</span>
                          <span className="text-muted-foreground text-[13px] ml-1">
                            {formatDistanceToNow(notification.createdAt, { addSuffix: false }).replace('about ', '').replace(' minutes', 'm').replace(' hours', 'h').replace(' days', 'd')}
                          </span>
                        </p>
                      </div>

                      {/* Action buttons (Follow Request / Mention) */}
                      {notification.type === 'follow_request' && (
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptFollow(notification);
                            }} 
                            className="h-8 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
                          >
                            Confirm
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectFollow(notification);
                            }}
                            className="h-8 px-4 text-xs font-semibold rounded-lg"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                      
                      {notification.type === 'mention' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMentionNotification(notification);
                            setShowAddToStoryDialog(true);
                          }}
                          className="h-8 px-3 text-xs font-semibold rounded-lg flex-shrink-0 ml-2"
                        >
                          Add to Story
                        </Button>
                      )}

                      {/* Preview Thumbnail */}
                      {getNotificationPreview(notification)}

                      {/* Delete Option (as requested) */}
                      <button 
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        className="p-1.5 ml-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        aria-label="Delete notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add to Story Dialog */}
      <Dialog open={showAddToStoryDialog} onOpenChange={setShowAddToStoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Your Story</DialogTitle>
            <DialogDescription>
              Share @{selectedMentionNotification?.fromUsername}'s story mention to your story?
            </DialogDescription>
          </DialogHeader>
          {selectedMentionNotification && (
            <div className="my-4 flex justify-center">
              <div className="w-48 h-64 rounded-lg overflow-hidden bg-secondary">
                {selectedMentionNotification.storyMediaType === 'video' ? (
                  <video 
                    src={selectedMentionNotification.storyMediaUrl} 
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                  />
                ) : (
                  <img 
                    src={selectedMentionNotification.storyMediaUrl} 
                    alt="Story" 
                    className="w-full h-full object-cover" 
                  />
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddToStoryDialog(false)}
              disabled={addingToStory}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddToStory}
              disabled={addingToStory}
              className="btn-gradient"
            >
              {addingToStory ? 'Adding...' : 'Add to Story'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <Dialog open={showStoryViewer} onOpenChange={setShowStoryViewer}>
        <DialogContent className="p-0 overflow-hidden border-0 max-w-[500px] h-[80vh] bg-black">
          <div 
            className="relative w-full h-full flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              if (viewingStory) {
                handleStoryPreviewTap(viewingStory, e);
              }
            }}
          >
            {viewingStory && (
              <>
                {viewingStory.storyMediaType === 'video' ? (
                  <video 
                    src={viewingStory.storyMediaUrl} 
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img 
                    src={viewingStory.storyMediaUrl} 
                    alt="Story" 
                    className="w-full h-full object-contain" 
                  />
                )}
                
                {/* Story info overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                      {viewingStory.fromUserPhoto ? (
                        <img 
                          src={viewingStory.fromUserPhoto} 
                          alt={viewingStory.fromUsername} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                          {viewingStory.fromUsername?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-white font-semibold">@{viewingStory.fromUsername}</span>
                  </div>
                </div>

                {/* Double tap hint */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white/70 text-sm px-4 py-2 rounded-full bg-black/50 inline-block">
                    Double tap to add to your story
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Notifications.displayName = 'Notifications';

export default Notifications;
