import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, MessageCircle, MoreVertical, UserX, Shield, Grid3X3, Film, Share2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  doc, getDoc, getDocs, collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PostGrid from '@/components/profile/PostGrid';
import FollowersModal from '@/components/profile/FollowersModal';
import ShareProfileDialog from '@/components/profile/ShareProfileDialog';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserProfileData {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  followers: string[];
  following: string[];
  postsCount: number;
  isPrivate?: boolean;
  showActivity?: boolean;
  isOnline?: boolean;
  lastSeen?: any;
}

interface Post {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  comments: number;
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { userProfile: currentUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'requested' | 'following'>('none');
  const [actionLoading, setActionLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Check if user is blocked/restricted
  useEffect(() => {
    if (!currentUser || !userId) return;
    setIsBlocked(currentUser.blockedUsers?.includes(userId) || false);
    setIsRestricted(currentUser.restrictedUsers?.includes(userId) || false);
  }, [currentUser, userId]);

  const handleBlockUser = async () => {
    if (!currentUser || !userId) return;
    try {
      const newBlockedList = isBlocked
        ? (currentUser.blockedUsers || []).filter(id => id !== userId)
        : [...(currentUser.blockedUsers || []), userId];
      
      await updateUserProfile({ blockedUsers: newBlockedList });
      setIsBlocked(!isBlocked);
      
      toast({
        title: isBlocked ? 'User unblocked' : 'User blocked',
        description: isBlocked 
          ? 'You can now see their content again.'
          : 'They won\'t be able to see your posts or profile.',
      });
      
      if (!isBlocked) {
        // If blocking, also unfollow
        if (followStatus === 'following') {
          await updateDoc(doc(db, 'users', currentUser.uid), { following: arrayRemove(userId) });
          await updateDoc(doc(db, 'users', userId), { followers: arrayRemove(currentUser.uid) });
          setFollowStatus('none');
        }
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'Could not update block status.',
        variant: 'destructive',
      });
    }
  };

  const handleRestrictUser = async () => {
    if (!currentUser || !userId) return;
    try {
      const newRestrictedList = isRestricted
        ? (currentUser.restrictedUsers || []).filter(id => id !== userId)
        : [...(currentUser.restrictedUsers || []), userId];
      
      await updateUserProfile({ restrictedUsers: newRestrictedList });
      setIsRestricted(!isRestricted);
      
      toast({
        title: isRestricted ? 'Restriction removed' : 'User restricted',
        description: isRestricted 
          ? 'Their interactions will be visible again.'
          : 'Their comments on your posts will only be visible to them.',
      });
    } catch (error) {
      console.error('Error restricting user:', error);
      toast({
        title: 'Error',
        description: 'Could not update restriction status.',
        variant: 'destructive',
      });
    }
  };

  const isOwnProfile = userId === currentUser?.uid;
  const isFriend = followStatus === 'following';
  const canViewContent = isFriend || !profile?.isPrivate;

  useEffect(() => {
    if (!userId) return;
    if (isOwnProfile) { navigate('/profile', { replace: true }); return; }

    const fetchProfile = async () => {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setProfile({ uid: userId, ...userDoc.data() } as UserProfileData);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [userId, isOwnProfile, navigate]);

  // Fetch posts/reels only when following or public
  useEffect(() => {
    if (!userId || !profile) return;
    if (!canViewContent) { setPosts([]); setReels([]); return; }

    const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
    const unsubPosts = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];
      // Sort by createdAt in descending order
      fetchedPosts.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setPosts(fetchedPosts);
    });

    const reelsQuery = query(collection(db, 'reels'), where('userId', '==', userId));
    const unsubReels = onSnapshot(reelsQuery, (snapshot) => {
      const fetchedReels = snapshot.docs.map((d) => ({
        id: d.id,
        mediaUrl: d.data().videoUrl,
        mediaType: 'video' as const,
        likes: d.data().likes || [],
        comments: d.data().comments || 0,
        createdAt: d.data().createdAt,
      }));
      // Sort by createdAt in descending order
      fetchedReels.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setReels(fetchedReels);
    });

    return () => { unsubPosts(); unsubReels(); };
  }, [userId, profile, canViewContent]);

  // Check follow status
  useEffect(() => {
    if (!currentUser || !profile) return;

    if (profile.followers?.includes(currentUser.uid)) {
      setFollowStatus('following');
    } else {
      const checkRequest = async () => {
        try {
          const requestQuery = query(
            collection(db, 'notifications'),
            where('fromUserId', '==', currentUser.uid),
            where('toUserId', '==', profile.uid),
            where('type', '==', 'follow_request')
          );
          const snapshot = await getDocs(requestQuery);
          setFollowStatus(snapshot.empty ? 'none' : 'requested');
        } catch {
          setFollowStatus('none');
        }
      };
      checkRequest();
    }
  }, [currentUser, profile]);

  const handleFollowAction = async () => {
    if (!currentUser || !profile) return;
    
    // Prevent any action if already requested (button should be disabled)
    if (followStatus === 'requested') return;
    
    setActionLoading(true);
    try {
      if (followStatus === 'following') {
        // Unfollow
        await updateDoc(doc(db, 'users', currentUser.uid), { following: arrayRemove(profile.uid) });
        await updateDoc(doc(db, 'users', profile.uid), { followers: arrayRemove(currentUser.uid) });
        setFollowStatus('none');
        setProfile(prev => prev ? { ...prev, followers: prev.followers.filter(id => id !== currentUser.uid) } : null);
      } else if (profile.isPrivate) {
        // Check if request already exists to prevent duplicates
        const existingRequestQuery = query(
          collection(db, 'notifications'),
          where('fromUserId', '==', currentUser.uid),
          where('toUserId', '==', profile.uid),
          where('type', '==', 'follow_request')
        );
        const existingSnapshot = await getDocs(existingRequestQuery);
        
        if (!existingSnapshot.empty) {
          // Request already exists, just update UI
          setFollowStatus('requested');
          return;
        }
        
        // Send follow request for private account
        await addDoc(collection(db, 'notifications'), {
          type: 'follow_request',
          fromUserId: currentUser.uid,
          fromUsername: currentUser.username,
          fromUserPhoto: currentUser.photoURL || '',
          toUserId: profile.uid,
          toUsername: profile.username || '',
          toUserPhoto: profile.photoURL || '',
          message: 'requested to follow you',
          read: false,
          createdAt: serverTimestamp(),
        });
        setFollowStatus('requested');
      } else {
        // Direct follow for public account - use arrayUnion which prevents duplicates
        await updateDoc(doc(db, 'users', currentUser.uid), { following: arrayUnion(profile.uid) });
        await updateDoc(doc(db, 'users', profile.uid), { followers: arrayUnion(currentUser.uid) });
        setFollowStatus('following');
        // Only add if not already in array
        setProfile(prev => {
          if (!prev) return null;
          const alreadyFollowing = prev.followers.includes(currentUser.uid);
          return alreadyFollowing ? prev : { ...prev, followers: [...prev.followers, currentUser.uid] };
        });
        
        // Check for existing notification before sending
        const existingNotifQuery = query(
          collection(db, 'notifications'),
          where('fromUserId', '==', currentUser.uid),
          where('toUserId', '==', profile.uid),
          where('type', '==', 'follow')
        );
        const existingNotif = await getDocs(existingNotifQuery);
        
        if (existingNotif.empty) {
          // Send notification only if one doesn't exist
          await addDoc(collection(db, 'notifications'), {
            type: 'follow',
            fromUserId: currentUser.uid,
            fromUsername: currentUser.username,
            fromUserPhoto: currentUser.photoURL || '',
            toUserId: profile.uid,
            message: 'started following you',
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error('Follow action error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    navigate(`/messages/new?userId=${profile.uid}`);
  };

  // Format last seen
  const formatLastSeen = () => {
    if (!profile?.showActivity) return null;
    if (profile?.isOnline) return 'Online now';
    if (profile?.lastSeen) {
      const lastSeenDate = profile.lastSeen.toDate ? profile.lastSeen.toDate() : new Date(profile.lastSeen);
      const diff = Date.now() - lastSeenDate.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return 'Active just now';
      if (minutes < 60) return `Active ${minutes}m ago`;
      if (hours < 24) return `Active ${hours}h ago`;
      if (days < 7) return `Active ${days}d ago`;
      return null;
    }
    return null;
  };

  // Deduplicate followers and following
  const uniqueFollowers = [...new Set(profile?.followers || [])];
  const uniqueFollowing = [...new Set(profile?.following || [])];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <h2 className="font-display font-semibold text-xl mb-2">User not found</h2>
        <Button onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const lastSeen = formatLastSeen();

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="ml-2">
              <h1 className="font-display font-semibold text-lg">{profile.username}</h1>
              {lastSeen && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {profile.isOnline && <span className="w-2 h-2 bg-green-500 rounded-full" />}
                  {lastSeen}
                </p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBlockUser}>
                <UserX className="w-4 h-4 mr-2" />
                {isBlocked ? 'Unblock User' : 'Block User'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRestrictUser}>
                <Shield className="w-4 h-4 mr-2" />
                {isRestricted ? 'Remove Restriction' : 'Restrict User'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Info */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary flex-shrink-0 relative">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                {profile.username?.charAt(0).toUpperCase()}
              </div>
            )}
            {profile.isOnline && profile.showActivity && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="font-semibold text-sm leading-tight">{canViewContent ? (profile.postsCount || 0) : '—'}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">posts</p>
              </div>
              <div 
                className={`text-center ${canViewContent ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                onClick={() => canViewContent && setShowFollowers(true)}
              >
                <p className="font-semibold text-sm leading-tight">{canViewContent ? uniqueFollowers.length : '—'}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">followers</p>
              </div>
              <div 
                className={`text-center ${canViewContent ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                onClick={() => canViewContent && setShowFollowing(true)}
              >
                <p className="font-semibold text-sm leading-tight">{canViewContent ? uniqueFollowing.length : '—'}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">following</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{profile.displayName || profile.username}</p>
            {profile.isPrivate && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          {canViewContent && profile.bio && <p className="text-sm whitespace-pre-wrap mt-1 text-muted-foreground">{profile.bio}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleFollowAction}
            disabled={actionLoading || followStatus === 'requested'}
            className={`flex-1 h-8 text-sm font-semibold ${followStatus === 'following' || followStatus === 'requested' ? '' : 'btn-gradient'}`}
            variant={followStatus === 'following' || followStatus === 'requested' ? 'secondary' : 'default'}
            size="sm"
          >
            {actionLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : followStatus === 'following' ? 'Following' : followStatus === 'requested' ? 'Requested' : 'Follow'}
          </Button>
          {canViewContent && (
            <Button onClick={handleMessage} variant="secondary" size="sm" className="flex-1 h-8 text-sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
          )}
        </div>
      </div>

      {/* Content - Only show if can view */}
      {canViewContent ? (
        <Tabs defaultValue="posts" className="max-w-lg mx-auto">
          <TabsList className="w-full bg-transparent border-t border-border rounded-none h-12">
            <TabsTrigger value="posts" className="flex-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-foreground">
              <Grid3X3 className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger value="reels" className="flex-1 rounded-none data-[state=active]:border-t-2 data-[state=active]:border-foreground">
              <Film className="w-5 h-5" />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="mt-0">
            <PostGrid posts={posts} loading={false} emptyMessage="No posts yet" contentType="posts" />
          </TabsContent>
          <TabsContent value="reels" className="mt-0">
            <PostGrid posts={reels} loading={false} emptyMessage="No reels yet" contentType="reels" />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="max-w-lg mx-auto border-t border-border">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
          >
            <div className="w-20 h-20 rounded-full border-2 border-muted-foreground flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">This Account is Private</h3>
            <p className="text-sm text-muted-foreground">
              Follow this account to see their photos, videos, followers, and following.
            </p>
          </motion.div>
        </div>
      )}

      {/* Followers Modal - Shows the profile user's followers */}
      <FollowersModal
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        userIds={uniqueFollowers}
        title={`${profile.username}'s Followers`}
        isOwnProfile={false}
      />

      {/* Following Modal - Shows who the profile user is following */}
      <FollowersModal
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        userIds={uniqueFollowing}
        title={`${profile.username}'s Following`}
        isOwnProfile={false}
      />

      {/* Share Profile Dialog */}
      <ShareProfileDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        profileUserId={profile.uid}
        profileUsername={profile.username}
      />
    </div>
  );
};

export default UserProfile;
