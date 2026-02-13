import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
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
  const [viewingStories, setViewingStories] = useState<Story[] | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchStories = async () => {
      try {
        // Get stories from the last 12 hours
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

        const storiesQuery = query(
          collection(db, 'stories'),
          where('createdAt', '>=', Timestamp.fromDate(twelveHoursAgo))
        );

        const snapshot = await getDocs(storiesQuery);
        const stories = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Story[];

        // Sort client-side
        stories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Separate my stories
        const myStoriesFiltered = stories.filter(s => s.userId === userProfile.uid);
        setMyStories(myStoriesFiltered);

        // Get user's relationships
        const following = userProfile.following || [];
        const followers = userProfile.followers || [];

        // Filter stories based on visibility settings
        // Default behavior: stories should be visible to followers AND following by default
        const otherStories = stories.filter(s => {
          if (s.userId === userProfile.uid) return false;
          
          // Default visibility is 'both' (followers and following can see)
          const visibility = s.visibility || 'both';
          
          // Check relationship: is the current user following the story owner?
          const iAmFollowingThem = following.includes(s.userId);
          // Is the story owner following the current user?
          const theyAreFollowingMe = followers.includes(s.userId);
          
          // Check if current user can see this story based on visibility
          switch (visibility) {
            case 'followers':
              // Story owner wants only their followers to see
              // Current user must be following the story owner
              return iAmFollowingThem;
            case 'following':
              // Story owner wants only people they follow to see
              // Story owner must be following the current user
              return theyAreFollowingMe;
            case 'both':
            default:
              // Story visible to both followers and following of the owner
              // Current user sees if they follow owner OR owner follows them
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
          // Prevent duplicate stories
          if (!grouped[story.userId].stories.find(s => s.id === story.id)) {
            grouped[story.userId].stories.push(story);
          }
          if (!story.viewedBy?.includes(userProfile.uid)) {
            grouped[story.userId].hasUnviewed = true;
          }
        });

        setGroupedStories(Object.values(grouped));
      } catch (error) {
        console.error('Error fetching stories:', error);
      }
    };

    fetchStories();
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
                  onClick={() => setViewingStories(myStories)}
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
                onClick={() => setViewingStories(group.stories)}
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
          onClose={() => setViewingStories(null)}
          onStoryDeleted={(storyId) => {
            // Remove the deleted story from local state
            setMyStories(prev => prev.filter(s => s.id !== storyId));
            setViewingStories(prev => prev ? prev.filter(s => s.id !== storyId) : null);
            setGroupedStories(prev => 
              prev.map(g => ({
                ...g,
                stories: g.stories.filter(s => s.id !== storyId),
              })).filter(g => g.stories.length > 0)
            );
          }}
        />
      )}
    </>
  );
};

export default StoriesBar;
