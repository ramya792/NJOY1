import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Eye, ChevronUp, Trash2, Loader2, Music, Heart, Send, AtSign } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, collection, query, where, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface Story {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Date;
  viewedBy: string[];
  likes?: string[];
  mentions?: string[];
  music?: {
    title: string;
    artist: string;
  } | null;
}

interface ViewerInfo {
  uid: string;
  username: string;
  photoURL: string;
}

interface StoryViewerProps {
  stories: Story[];
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories: initialStories, onClose, onStoryDeleted }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [localStories, setLocalStories] = useState<Story[]>(initialStories);
  const [deleting, setDeleting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showMentionInput, setShowMentionInput] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<ViewerInfo[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStory = localStories[currentIndex];
  const isOwnStory = currentStory?.userId === userProfile?.uid;

  // Sync local stories when initial prop changes
  useEffect(() => {
    setLocalStories(initialStories);
  }, [initialStories]);

  // Update like state when story changes
  useEffect(() => {
    if (currentStory && userProfile) {
      setLiked(currentStory.likes?.includes(userProfile.uid) || false);
      setLikesCount(currentStory.likes?.length || 0);
    }
  }, [currentIndex, currentStory, userProfile]);

  useEffect(() => {
    if (currentStory && userProfile && !currentStory.viewedBy?.includes(userProfile.uid)) {
      const storyRef = doc(db, 'stories', currentStory.id);
      updateDoc(storyRef, { viewedBy: arrayUnion(userProfile.uid) }).catch(console.error);
    }
  }, [currentIndex, currentStory, userProfile]);

  useEffect(() => {
    if (showViewers || showMentionInput) return; // Pause timer when viewing panels
    
    const duration = currentStory?.mediaType === 'video' ? 15000 : 5000;
    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);

      if (elapsed >= duration) {
        if (currentIndex < localStories.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setProgress(0);
          elapsed = 0;
        } else {
          onClose();
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, localStories.length, onClose, currentStory, showViewers, showMentionInput]);

  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex, currentStory]);

  // Fetch viewer details when showing viewers panel
  useEffect(() => {
    if (!showViewers || !currentStory?.viewedBy?.length) return;

    const fetchViewers = async () => {
      setLoadingViewers(true);
      try {
        const uniqueViewerIds = [...new Set(currentStory.viewedBy)].filter(id => id !== currentStory.userId);
        const viewerPromises = uniqueViewerIds.map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              uid,
              username: data.username || 'Unknown',
              photoURL: data.photoURL || '',
            };
          }
          return null;
        });
        const fetchedViewers = await Promise.all(viewerPromises);
        setViewers(fetchedViewers.filter((v): v is ViewerInfo => v !== null));
      } catch (error) {
        console.error('Error fetching viewers:', error);
      } finally {
        setLoadingViewers(false);
      }
    };

    fetchViewers();
  }, [showViewers, currentStory]);

  // Search users for mentions
  useEffect(() => {
    if (!mentionQuery.trim()) {
      setMentionResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setMentionLoading(true);
      try {
        const searchLower = mentionQuery.toLowerCase().trim();
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '>=', searchLower),
          where('username', '<=', searchLower + '\uf8ff'),
          limit(10)
        );
        const snapshot = await getDocs(usersQuery);
        const results: ViewerInfo[] = [];
        snapshot.forEach((doc) => {
          if (doc.id !== userProfile?.uid) {
            const data = doc.data();
            results.push({
              uid: doc.id,
              username: data.username || '',
              photoURL: data.photoURL || '',
            });
          }
        });
        setMentionResults(results);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setMentionLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [mentionQuery, userProfile?.uid]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting || !currentStory) return;
    
    if (!window.confirm('Delete this story?')) return;
    
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'stories', currentStory.id));
      toast({ title: 'Story deleted successfully' });
      
      // Notify parent component to remove from list
      if (onStoryDeleted) {
        onStoryDeleted(currentStory.id);
      }
      
      // Update local stories
      const remaining = localStories.filter(s => s.id !== currentStory.id);
      
      if (remaining.length === 0) {
        // Last story deleted - close viewer
        onClose();
        return;
      }
      
      setLocalStories(remaining);
      
      // Adjust index
      if (currentIndex >= remaining.length) {
        setCurrentIndex(remaining.length - 1);
      }
      setProgress(0);
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({ title: 'Failed to delete story', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }, [deleting, currentStory, localStories, currentIndex, onClose, onStoryDeleted, toast]);

  const handleLike = useCallback(async () => {
    if (!userProfile || !currentStory) return;
    const storyRef = doc(db, 'stories', currentStory.id);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      await updateDoc(storyRef, {
        likes: newLiked ? arrayUnion(userProfile.uid) : arrayRemove(userProfile.uid),
      });

      // Send notification for like on story
      if (newLiked && currentStory.userId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          type: 'like',
          fromUserId: userProfile.uid,
          fromUsername: userProfile.username,
          fromUserPhoto: userProfile.photoURL || '',
          toUserId: currentStory.userId,
          message: 'liked your story',
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      setLiked(!newLiked);
      setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  }, [liked, currentStory, userProfile]);

  const handleMention = useCallback(async (mentionedUser: ViewerInfo) => {
    if (!userProfile || !currentStory) return;
    
    try {
      // Add mention to story
      const storyRef = doc(db, 'stories', currentStory.id);
      await updateDoc(storyRef, {
        mentions: arrayUnion(mentionedUser.uid),
      });

      // Send notification to mentioned user
      await addDoc(collection(db, 'notifications'), {
        type: 'mention',
        fromUserId: userProfile.uid,
        fromUsername: userProfile.username,
        fromUserPhoto: userProfile.photoURL || '',
        toUserId: mentionedUser.uid,
        storyId: currentStory.id,
        storyMediaUrl: currentStory.mediaUrl,
        storyMediaType: currentStory.mediaType,
        message: 'mentioned you in their story',
        read: false,
        createdAt: serverTimestamp(),
      });

      toast({ title: `@${mentionedUser.username} mentioned!` });
      setShowMentionInput(false);
      setMentionQuery('');
      setMentionResults([]);
    } catch (error) {
      console.error('Error mentioning user:', error);
      toast({ title: 'Failed to mention user', variant: 'destructive' });
    }
  }, [currentStory, userProfile, toast]);

  const goNext = () => {
    if (currentIndex < localStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setShowViewers(false);
      setShowMentionInput(false);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setShowViewers(false);
      setShowMentionInput(false);
    }
  };

  const viewerCount = currentStory?.viewedBy?.filter(id => id !== currentStory.userId).length || 0;

  if (!currentStory) return null;
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              uid,
              username: data.username || 'Unknown',
              photoURL: data.photoURL || '',
            };
          }
          return null;
        });
        const fetchedViewers = await Promise.all(viewerPromises);
        setViewers(fetchedViewers.filter((v): v is ViewerInfo => v !== null));
      } catch (error) {
        console.error('Error fetching viewers:', error);
      } finally {
        setLoadingViewers(false);
      }
    };

    fetchViewers();
  }, [showViewers, currentStory]);

  const goNext = () => {
    if (currentIndex < localStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setShowViewers(false);
      setShowMentionInput(false);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setShowViewers(false);
      setShowMentionInput(false);
    }
  };

  const viewerCount = currentStory?.viewedBy?.filter(id => id !== currentStory.userId).length || 0;

  if (!currentStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      onClick={() => {
        if (showViewers) setShowViewers(false);
        if (showMentionInput) { setShowMentionInput(false); setMentionQuery(''); setMentionResults([]); }
      }}
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {localStories.map((_, i) => (
          <div key={i} className="story-progress flex-1">
            <div
              className="story-progress-fill"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="absolute top-10 left-4 right-20 flex items-center gap-3 z-10">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
          {currentStory.userPhoto ? (
            <img src={currentStory.userPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-white">
              {currentStory.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-white text-sm font-semibold">{currentStory.username}</span>
        <span className="text-white/60 text-xs">
          {formatDistanceToNow(currentStory.createdAt, { addSuffix: true })}
        </span>
      </div>

      {/* Top right controls */}
      <div className="absolute top-10 right-4 z-10 flex items-center gap-2">
        {isOwnStory && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMentionInput(!showMentionInput);
                setShowViewers(false);
              }}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            >
              <AtSign className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5 text-white" />
              )}
            </button>
          </>
        )}
        {currentStory.mediaType === 'video' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMuted(!muted);
              if (videoRef.current) videoRef.current.muted = !muted;
            }}
            className="p-1.5 rounded-full bg-black/40"
          >
            {muted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
        )}
        <button onClick={onClose} className="p-1">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Media */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStory.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full"
        >
          {currentStory.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              muted={muted}
              loop
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt=""
              className="w-full h-full object-contain"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Music overlay */}
      {currentStory.music && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2.5 flex items-center gap-2"
          >
            <Music className="w-4 h-4 text-white flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {currentStory.music.title}
              </p>
              <p className="text-white/70 text-xs truncate">
                {currentStory.music.artist}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mentions overlay */}
      {currentStory.mentions && currentStory.mentions.length > 0 && (
        <div className="absolute bottom-16 left-4 z-10">
          <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1">
            <AtSign className="w-3 h-3 text-white" />
            <span className="text-white text-xs">{currentStory.mentions.length} mentioned</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      {!showViewers && !showMentionInput && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          />
          <button
            onClick={goNext}
            className="absolute right-0 top-0 bottom-0 w-2/3 z-10"
          />
        </>
      )}

      {/* Bottom actions: like + view count */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex items-center justify-center gap-6">
        {/* Like button - for non-own stories */}
        {!isOwnStory && (
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white"
          >
            <Heart className={`w-5 h-5 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
            <span className="text-sm font-medium">{likesCount}</span>
          </motion.button>
        )}

        {/* View count - only show for own stories */}
        {isOwnStory && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowViewers(!showViewers);
              setShowMentionInput(false);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">{viewerCount} {viewerCount === 1 ? 'view' : 'views'}</span>
            <ChevronUp className={`w-4 h-4 transition-transform ${showViewers ? 'rotate-180' : ''}`} />
          </motion.button>
        )}

        {/* Like count for own stories */}
        {isOwnStory && likesCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="text-sm font-medium">{likesCount}</span>
          </div>
        )}
      </div>

      {/* Mention Input Panel */}
      <AnimatePresence>
        {showMentionInput && isOwnStory && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-background rounded-t-2xl max-h-[50vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Mention @user</h3>
                <button 
                  onClick={() => { setShowMentionInput(false); setMentionQuery(''); setMentionResults([]); }}
                  className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Input
                value={mentionQuery}
                onChange={(e) => setMentionQuery(e.target.value)}
                placeholder="Search username to mention..."
                className="h-10 text-sm"
                autoFocus
              />
            </div>
            
            <ScrollArea className="max-h-[calc(50vh-120px)]">
              {mentionLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : mentionResults.length === 0 && mentionQuery.trim() ? (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              ) : (
                <div className="p-4 space-y-2">
                  {mentionResults.map((user) => (
                    <button
                      key={user.uid}
                      onClick={() => handleMention(user)}
                      className="flex items-center gap-3 w-full p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL} alt={user.username} />
                        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">@{user.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewers Panel */}
      <AnimatePresence>
        {showViewers && isOwnStory && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-background rounded-t-2xl max-h-[60vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
                </h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowViewers(false); }}
                  className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <ScrollArea className="max-h-[calc(60vh-80px)]">
              {loadingViewers ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : viewers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No viewers yet</p>
              ) : (
                <div className="p-4 space-y-3">
                  {viewers.map((viewer) => (
                    <div key={viewer.uid} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={viewer.photoURL} alt={viewer.username} />
                        <AvatarFallback>{viewer.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{viewer.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StoryViewer;
