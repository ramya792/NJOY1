import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Grid3X3, Film, Bookmark, Tag, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayRemove, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ProfileHeader from '@/components/profile/ProfileHeader';
import PostGrid from '@/components/profile/PostGrid';
import SavedItemCard from '@/components/profile/SavedItemCard';
import SavedItemViewer from '@/components/profile/SavedItemViewer';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ShareProfileDialog from '@/components/profile/ShareProfileDialog';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Post {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  comments: number;
  createdAt?: any;
}

interface SavedItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  comments: number;
  type: 'post' | 'reel';
  createdAt?: any;
}

interface FollowerUser {
  uid: string;
  username: string;
  photoURL: string;
  displayName: string;
}

const Profile: React.FC = () => {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [followerUsers, setFollowerUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSavedItem, setSelectedSavedItem] = useState<SavedItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewingSavedItem, setViewingSavedItem] = useState<SavedItem | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Fetch followers data
  useEffect(() => {
    if (!userProfile || !userProfile.followers || userProfile.followers.length === 0) {
      setFollowerUsers([]);
      return;
    }

    const fetchFollowers = async () => {
      try {
        // Get unique followers
        const uniqueFollowerIds = [...new Set(userProfile.followers)];
        
        // Fetch follower user data
        const followerPromises = uniqueFollowerIds.slice(0, 10).map(async (followerId) => {
          const userDoc = await getDoc(doc(db, 'users', followerId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              uid: userDoc.id,
              username: data.username || '',
              photoURL: data.photoURL || '',
              displayName: data.displayName || '',
            };
          }
          return null;
        });

        const followers = (await Promise.all(followerPromises)).filter(Boolean) as FollowerUser[];
        setFollowerUsers(followers);
      } catch (error) {
        console.error('Error fetching followers:', error);
      }
    };

    fetchFollowers();
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;

    // Fetch user's posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userProfile.uid)
    );

    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      
      // Sort by createdAt in descending order
      fetchedPosts.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setPosts(fetchedPosts);
      setLoading(false);
    });

    // Fetch user's reels
    const reelsQuery = query(
      collection(db, 'reels'),
      where('userId', '==', userProfile.uid)
    );

    const unsubscribeReels = onSnapshot(reelsQuery, (snapshot) => {
      const fetchedReels = snapshot.docs.map((doc) => ({
        id: doc.id,
        mediaUrl: doc.data().videoUrl,
        mediaType: 'video' as const,
        likes: doc.data().likes || [],
        comments: doc.data().comments || 0,
        createdAt: doc.data().createdAt,
      }));
      
      // Sort by createdAt in descending order
      fetchedReels.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setReels(fetchedReels);
    });

    // Fetch saved posts
    const savedPostsQuery = query(
      collection(db, 'posts'),
      where('saves', 'array-contains', userProfile.uid)
    );

    const unsubscribeSavedPosts = onSnapshot(savedPostsQuery, async (snapshot) => {
      const fetchedSavedPosts: SavedItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        mediaUrl: doc.data().mediaUrl,
        mediaType: doc.data().mediaType || 'image',
        likes: doc.data().likes || [],
        comments: doc.data().comments || 0,
        type: 'post' as const,
      }));
      
      // Fetch saved reels
      const savedReelsQuery = query(
        collection(db, 'reels'),
        where('saves', 'array-contains', userProfile.uid)
      );
      
      const reelsSnapshot = await new Promise<any>((resolve) => {
        const unsub = onSnapshot(savedReelsQuery, (snap) => {
          resolve(snap);
          unsub();
        });
      });
      
      const fetchedSavedReels: SavedItem[] = reelsSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        mediaUrl: doc.data().videoUrl || doc.data().thumbnailUrl,
        mediaType: 'video' as const,
        likes: doc.data().likes || [],
        comments: doc.data().comments || 0,
        type: 'reel' as const,
      }));
      
      setSavedItems([...fetchedSavedPosts, ...fetchedSavedReels]);
    });

    return () => {
      unsubscribePosts();
      unsubscribeReels();
      unsubscribeSavedPosts();
    };
  }, [userProfile]);

  const handleUnsaveItem = async () => {
    if (!selectedSavedItem || !userProfile) return;
    
    setDeleting(true);
    try {
      const collectionName = selectedSavedItem.type === 'post' ? 'posts' : 'reels';
      const itemRef = doc(db, collectionName, selectedSavedItem.id);
      
      await updateDoc(itemRef, {
        saves: arrayRemove(userProfile.uid)
      });
      
      setSavedItems(prev => prev.filter(item => item.id !== selectedSavedItem.id));
      
      toast({
        title: 'Removed from saved',
        description: `${selectedSavedItem.type === 'post' ? 'Post' : 'Reel'} has been unsaved.`,
      });
      
      setShowDeleteDialog(false);
      setSelectedSavedItem(null);
    } catch (error) {
      console.error('Error unsaving item:', error);
      toast({
        title: 'Error',
        description: 'Could not remove from saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!userProfile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <h1 className="font-display font-semibold text-lg">
            {userProfile.username}
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowShareDialog(true)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Info */}
      <ProfileHeader 
        profile={userProfile} 
        onEditClick={() => setShowEditModal(true)}
        onShareClick={() => setShowShareDialog(true)}
      />

      {/* Tabs - Instagram style */}
      <Tabs defaultValue="posts" className="max-w-lg mx-auto w-full mt-[14px]">
        <TabsList className="w-full bg-transparent border-t border-border rounded-none h-11 p-0 mb-1.5">
          <TabsTrigger 
            value="posts" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent h-full"
          >
            <Grid3X3 className="w-[22px] h-[22px]" />
          </TabsTrigger>
          <TabsTrigger 
            value="reels" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent h-full"
          >
            <Film className="w-[22px] h-[22px]" />
          </TabsTrigger>
          <TabsTrigger 
            value="saved" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent h-full"
          >
            <Bookmark className="w-[22px] h-[22px]" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          <PostGrid 
            posts={posts} 
            loading={loading} 
            emptyMessage="No posts yet" 
            isOwnProfile={true}
            contentType="posts"
            onPostDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
          />
        </TabsContent>

        <TabsContent value="reels" className="mt-0">
          <PostGrid 
            posts={reels} 
            loading={loading} 
            emptyMessage="No reels yet" 
            isOwnProfile={true}
            contentType="reels"
            onPostDeleted={(id) => setReels(prev => prev.filter(p => p.id !== id))}
          />
        </TabsContent>

        <TabsContent value="saved" className="mt-0">
          {savedItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 px-4 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Bookmark className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Saved Items</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Save posts and reels to view them here later.
              </p>
            </motion.div>
          )}
          {savedItems.length > 0 && (
            <div className="grid grid-cols-3 gap-[2px] mt-[2px]">
              {savedItems.map((item, index) => (
                <SavedItemCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  index={index}
                  onUnsave={(item) => {
                    setSelectedSavedItem(item);
                    setShowDeleteDialog(true);
                  }}
                  onView={(item) => setViewingSavedItem(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal 
          profile={userProfile} 
          onClose={() => setShowEditModal(false)} 
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove from Saved</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this {selectedSavedItem?.type} from your saved items?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedSavedItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleUnsaveItem}
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Item Viewer */}
      <SavedItemViewer
        item={viewingSavedItem}
        isOpen={!!viewingSavedItem}
        onClose={() => setViewingSavedItem(null)}
      />

      {/* Share Profile Dialog */}
      <ShareProfileDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        profileUserId={userProfile.uid}
        profileUsername={userProfile.username}
      />
    </div>
  );
};

export default Profile;
