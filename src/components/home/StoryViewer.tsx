import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Eye, ChevronUp, Trash2 } from 'lucide-react';
import { doc, updateDoc, arrayUnion, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Story {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Date;
  viewedBy: string[];
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

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, onClose, onStoryDeleted }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory?.userId === userProfile?.uid;

  useEffect(() => {
    if (currentStory && userProfile && !currentStory.viewedBy?.includes(userProfile.uid)) {
      const storyRef = doc(db, 'stories', currentStory.id);
      updateDoc(storyRef, { viewedBy: arrayUnion(userProfile.uid) }).catch(console.error);
    }
  }, [currentIndex, currentStory, userProfile]);

  useEffect(() => {
    if (showViewers) return; // Pause timer when viewing viewers list
    
    const duration = currentStory?.mediaType === 'video' ? 15000 : 5000;
    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);

      if (elapsed >= duration) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setProgress(0);
          elapsed = 0;
        } else {
          onClose();
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, stories.length, onClose, currentStory, showViewers]);

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

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setShowViewers(false);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setShowViewers(false);
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
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {stories.map((_, i) => (
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
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (deleting) return;
              setDeleting(true);
              try {
                await deleteDoc(doc(db, 'stories', currentStory.id));
                toast({ title: 'Story deleted' });
                onStoryDeleted?.(currentStory.id);
                // If this was the last story, close the viewer
                if (stories.length <= 1) {
                  onClose();
                } else {
                  // Move to next or previous story
                  if (currentIndex < stories.length - 1) {
                    setProgress(0);
                  } else {
                    setCurrentIndex(prev => Math.max(0, prev - 1));
                    setProgress(0);
                  }
                }
              } catch (error) {
                console.error('Error deleting story:', error);
                toast({ title: 'Failed to delete story', variant: 'destructive' });
              } finally {
                setDeleting(false);
              }
            }}
            className="p-1.5 rounded-full bg-black/40"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        )}
        {currentStory.mediaType === 'video' && (
          <button
            onClick={() => {
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

      {/* Navigation */}
      {!showViewers && (
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

      {/* View count - only show for own stories */}
      {isOwnStory && (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setShowViewers(!showViewers)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">{viewerCount} {viewerCount === 1 ? 'view' : 'views'}</span>
          <ChevronUp className={`w-4 h-4 transition-transform ${showViewers ? 'rotate-180' : ''}`} />
        </motion.button>
      )}

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
              <h3 className="text-center font-semibold">
                {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}
              </h3>
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
