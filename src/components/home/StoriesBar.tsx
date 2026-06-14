import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import StoryCircle from './StoryCircle';
import StoryUploadDialog from './StoryUploadDialog';
import StoryViewer from './StoryViewer';

interface Story {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Date;
  viewedBy: string[];
  visibility?: 'followers' | 'following' | 'both';
}

interface GroupedStories {
  userId: string;
  username: string;
  userPhoto: string;
  stories: Story[];
  hasUnviewed: boolean;
}

const StoriesBar: React.FC = () => {
  const { userProfile } = useAuth();
  const [groupedStories, setGroupedStories] = useState<GroupedStories[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const viewingStories = React.useMemo(() => {
    if (!viewingUserId || !userProfile) return null;
    if (viewingUserId === userProfile.uid) {
      return myStories.length > 0 ? myStories : null;
    }
    const group = groupedStories.find(g => g.userId === viewingUserId);
    return group?.stories.length ? group.stories : null;
  }, [viewingUserId, myStories, groupedStories, userProfile]);

  useEffect(() => {
    if (viewingUserId && !viewingStories) {
      setViewingUserId(null); // Close viewer if stories are empty
    }
  }, [viewingStories, viewingUserId]);

  useEffect(() => {
    if (!userProfile) return;

    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const storiesQuery = query(
      collection(db, 'stories'),
      where('createdAt', '>=', Timestamp.fromDate(twelveHoursAgo))
    );

    const unsubscribe = onSnapshot(storiesQuery, (snapshot) => {
      const stories = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Story[];

      // Sort client-side: oldest first so old stories play before new ones
      stories.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // Separate my stories
      const myStoriesFiltered = stories.filter(s => s.userId === userProfile.uid);
      setMyStories(myStoriesFiltered);

      // Get user's relationships
      const following = userProfile.following || [];
      const followers = userProfile.followers || [];

      // Filter stories based on visibility settings
      const otherStories = stories.filter(s => {
        if (s.userId === userProfile.uid) return false;
        
        const visibility = s.visibility || 'both';
        const iAmFollowingThem = following.includes(s.userId);
        const theyAreFollowingMe = followers.includes(s.userId);
        
        switch (visibility) {
          case 'followers':
            return iAmFollowingThem;
          case 'following':
            return theyAreFollowingMe;
          case 'both':
          default:
            return iAmFollowingThem || theyAreFollowingMe;
        }
      });

      // Group stories by user and deduplicate
      const grouped: { [key: string]: GroupedStories } = {};
      
      otherStories.forEach((story) => {
        if (!grouped[story.userId]) {
          grouped[story.userId] = {
            userId: story.userId,
            username: story.username,
            userPhoto: story.userPhoto,
            stories: [],
            hasUnviewed: false,
          };
        }
        if (!grouped[story.userId].stories.find(s => s.id === story.id)) {
          grouped[story.userId].stories.push(story);
        }
        if (!story.viewedBy?.includes(userProfile.uid)) {
          grouped[story.userId].hasUnviewed = true;
        }
      });

      setGroupedStories(Object.values(grouped));
    }, (error) => {
      console.error('Error fetching stories:', error);
    });

    return () => unsubscribe();
  }, [userProfile]);

  return (
    <>
      <div className="border-b border-border py-4">
        <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
          {/* My Story */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative">
              {myStories.length > 0 ? (
                <StoryCircle
                  imageUrl={userProfile?.photoURL || ''}
                  hasUnviewed={false}
                  size="lg"
                  onClick={() => userProfile && setViewingUserId(userProfile.uid)}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt="Your story"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-muted-foreground">
                      {userProfile?.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowUpload(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background"
              >
                <Plus className="w-4 h-4 text-primary-foreground" />
              </motion.button>
            </div>
            <span className="text-xs mt-1 text-muted-foreground">Your story</span>
          </div>

          {/* Other Stories */}
          {groupedStories.map((group) => (
            <motion.div
              key={group.userId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center flex-shrink-0"
            >
              <StoryCircle
                imageUrl={group.userPhoto}
                hasUnviewed={group.hasUnviewed}
                size="lg"
                onClick={() => setViewingUserId(group.userId)}
              />
              <span className="text-xs mt-1 max-w-[64px] truncate">
                {group.username}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <StoryUploadDialog open={showUpload} onClose={() => setShowUpload(false)} />
      
      {viewingStories && (
        <StoryViewer 
          stories={viewingStories} 
          onClose={() => setViewingUserId(null)}
          onStoryDeleted={(storyId) => {
            // Firestore listener will handle updating myStories
            // The derived viewingStories will update automatically
          }}
        />
      )}
    </>
  );
};

export default StoriesBar;
