import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Eye, ChevronUp, Trash2, Loader2, Music, Heart, Send, Play } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, collection, query, where, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { fetchPreviewUrl } from '@/lib/musicData';

export interface StoryOverlay {
  id: string;
  type: 'text' | 'sticker' | 'mention';
  content: string;
  position: { x: number; y: number };
  scale: number;
  fontFamily?: string;
  color?: string;
  hasBackground?: boolean;
}

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
    previewUrl?: string;
    startTime?: number;
    endTime?: number;
    position?: { x: number; y: number };
    scale?: number;
  } | null;
  overlays?: StoryOverlay[];
}

interface ViewerInfo {
  uid: string;
  username: string;
  displayName?: string;
  photoURL: string;
  isPrivate?: boolean;
  followers?: string[];
  following?: string[];
}

interface StoryViewerProps {
  stories: Story[];
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
  initialIndex?: number;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories: initialStories, onClose, onStoryDeleted, initialIndex = 0 }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [localStories, setLocalStories] = useState<Story[]>(initialStories);
  const [deleting, setDeleting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<ViewerInfo[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPausedRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressed, setIsLongPressed] = useState(false);
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
    if (showViewers || showLikers) return; // Pause timer when viewing panels
    
    const duration = currentStory?.mediaType === 'video' ? 20000 : 15000; // 15 seconds for images, 20 for videos
    const interval = 16; // 60fps for smooth progress
    let elapsed = 0;
    let animationId: number;

    const updateProgress = () => {
      if (isPausedRef.current) {
        animationId = requestAnimationFrame(updateProgress);
        return;
      }

      elapsed += interval;
      setProgress((elapsed / duration) * 100);

      if (elapsed >= duration) {
        // Story ended - stop music before moving to next
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }

        if (currentIndex < localStories.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setProgress(0);
        } else {
          onClose();
        }
      } else {
        animationId = requestAnimationFrame(updateProgress);
      }
    };

    animationId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationId);
  }, [currentIndex, localStories.length, onClose, currentStory, showViewers, showLikers]);

  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video' && !isPausedRef.current && !autoplayBlocked) {
      videoRef.current.play().catch(() => setAutoplayBlocked(true));
    }
  }, [currentIndex, currentStory, autoplayBlocked]);

  // Handle visibility change (screen off / tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (audioRef.current) audioRef.current.pause();
        if (videoRef.current) videoRef.current.pause();
        isPausedRef.current = true;
      } else {
        if (audioRef.current && !muted) audioRef.current.play().catch(() => setAutoplayBlocked(true));
        if (videoRef.current) videoRef.current.play().catch(() => setAutoplayBlocked(true));
        isPausedRef.current = false;
        setAutoplayBlocked(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [muted]);

  // Play music audio when story has music
  useEffect(() => {
    // Stop previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (currentStory?.music?.previewUrl) {
      const startAudio = async () => {
        let url = currentStory.music!.previewUrl!;

        // If the stored URL is a SoundHelix BGM, try to fetch real vocal preview
        if (url.includes('soundhelix') && currentStory.music!.title) {
          const vocalUrl = await fetchPreviewUrl(
            currentStory.music!.title,
            currentStory.music!.artist || ''
          );
          if (vocalUrl) url = vocalUrl;
        }

        const audio = new Audio(url);
        audio.volume = 0.4;
        audio.loop = false;
        audio.muted = muted;
        audio.preload = 'auto'; // Preload for instant playback
        
        const startTime = currentStory.music!.startTime || 0;
        const endTime = currentStory.music!.endTime;
        
        // Wait for metadata before seeking
        audio.addEventListener('loadedmetadata', () => {
          audio.currentTime = startTime;
        }, { once: true });

        const storyDuration = currentStory.mediaType === 'video' ? 20 : 15;
        const musicDuration = endTime ? (endTime - startTime) : storyDuration;
        const stopAfter = Math.min(musicDuration, storyDuration) * 1000;
        
        // Use RAF for smooth playback monitoring
        let rafId: number | null = null;
        if (endTime) {
          const checkTime = () => {
            if (audio.currentTime >= endTime) {
              audio.pause();
              if (rafId) cancelAnimationFrame(rafId);
            } else if (audioRef.current === audio) {
              rafId = requestAnimationFrame(checkTime);
            }
          };
          audio.addEventListener('playing', () => {
            rafId = requestAnimationFrame(checkTime);
          }, { once: true });
        }
        
        const stopTimeout = setTimeout(() => {
          if (audioRef.current === audio) {
            audio.pause();
            audio.currentTime = startTime;
          }
          if (rafId) cancelAnimationFrame(rafId);
        }, stopAfter);
        
        const tryPlay = async () => {
          try {
            await audio.play();
            setAutoplayBlocked(false);
          } catch {
            setAutoplayBlocked(true);
            const retryPlay = async () => {
              try { 
                await audio.play(); 
                setAutoplayBlocked(false);
              } catch {}
              document.removeEventListener('click', retryPlay);
              document.removeEventListener('touchstart', retryPlay);
            };
            document.addEventListener('click', retryPlay, { once: true });
            document.addEventListener('touchstart', retryPlay, { once: true });
          }
        };
        
        audio.load();
        tryPlay();
        audioRef.current = audio;
        
        audio.addEventListener('ended', () => {
          clearTimeout(stopTimeout);
          if (rafId) cancelAnimationFrame(rafId);
        });
      };
      startAudio();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [currentIndex, currentStory?.music?.previewUrl, muted]);

  // Mute/unmute music audio when muted state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  // Cleanup audio on close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  // Fetch liker details when showing likers panel
  useEffect(() => {
    if (!showLikers || !currentStory?.likes?.length) return;

    const fetchLikers = async () => {
      setLoadingLikers(true);
      try {
        const uniqueLikerIds = [...new Set(currentStory.likes!)].filter(id => id !== currentStory.userId);
        const likerPromises = uniqueLikerIds.map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              uid,
              username: data.username || 'Unknown',
              displayName: data.displayName || '',
              photoURL: data.photoURL || '',
            };
          }
          return null;
        });
        const fetchedLikers = await Promise.all(likerPromises);
        setLikers(fetchedLikers.filter((v) => v !== null) as ViewerInfo[]);
      } catch (error) {
        console.error('Error fetching likers:', error);
      } finally {
        setLoadingLikers(false);
      }
    };

    fetchLikers();
  }, [showLikers, currentStory]);

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

  const goNext = () => {
    // Stop music when moving to next story
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    if (currentIndex < localStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setShowViewers(false);
      setShowLikers(false);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    // Stop music when moving to previous story
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setShowViewers(false);
      setShowLikers(false);
    }
  };

  const viewerCount = currentStory?.viewedBy?.filter(id => id !== currentStory.userId).length || 0;

  // Long-press handlers for pause/resume
  const handlePressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      isPausedRef.current = true;
      setIsLongPressed(true);
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    }, 200);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isPausedRef.current && !autoplayBlocked && !document.hidden) {
      isPausedRef.current = false;
      setIsLongPressed(false);
      if (videoRef.current) videoRef.current.play().catch(() => setAutoplayBlocked(true));
      if (audioRef.current) audioRef.current.play().catch(() => setAutoplayBlocked(true));
    }
  };

  if (!currentStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      onClick={() => {
        if (showViewers) setShowViewers(false);
        if (showLikers) setShowLikers(false);
      }}
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
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
      <div 
        className="absolute top-10 left-4 right-20 flex items-center gap-3 z-20 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/user/${currentStory.userId}`);
          onClose();
        }}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
          {currentStory.userPhoto ? (
            <img src={currentStory.userPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-white">
              {currentStory.username?.charAt?.(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <span className="text-white text-sm font-semibold">{currentStory.username}</span>
        <span className="text-white/60 text-xs">
          {(() => {
            try {
              if (!currentStory.createdAt) return 'just now';
              const date = currentStory.createdAt instanceof Date 
                ? currentStory.createdAt 
                : new Date(currentStory.createdAt as any);
              if (isNaN(date.getTime())) return 'just now';
              let formatted = formatDistanceToNow(date, { addSuffix: true });
              return formatted
                .replace('less than a minute ago', '1min')
                .replace(' minute ago', 'min')
                .replace(' minutes ago', 'mins')
                .replace('about ', '')
                .replace(' hour ago', 'hour')
                .replace(' hours ago', 'hours')
                .replace(' day ago', 'day')
                .replace(' days ago', 'days');
            } catch (e) {
              return 'just now';
            }
          })()}
        </span>
      </div>

      {/* Top right controls */}
      <div className="absolute top-10 right-4 z-20 flex items-center gap-2">
        {isOwnStory && (
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
        )}
        {(currentStory.mediaType === 'video' || currentStory.music) && (
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

      {/* Paused indicator */}
      {isLongPressed && !autoplayBlocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
            <div className="flex gap-1.5">
              <div className="w-2 h-8 bg-white rounded-sm" />
              <div className="w-2 h-8 bg-white rounded-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Autoplay blocked overlay */}
      {autoplayBlocked && (
        <div 
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={() => {
            setAutoplayBlocked(false);
            if (videoRef.current) videoRef.current.play().catch(() => setAutoplayBlocked(true));
            if (audioRef.current) audioRef.current.play().catch(() => setAutoplayBlocked(true));
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Play className="w-10 h-10 text-white translate-x-1" fill="currentColor" />
            </div>
            <p className="text-white font-medium text-lg drop-shadow-md">Tap to play</p>
          </div>
        </div>
      )}

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

      {/* Music overlay sticker */}
      {currentStory.music && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
          <div 
            style={{ 
              transform: `translate(${currentStory.music.position?.x || 0}px, ${currentStory.music.position?.y || 0}px) scale(${currentStory.music.scale || 1})` 
            }}
            className="flex flex-col items-center"
          >
            <div className="relative w-32 h-32 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-3 border border-white/20">
              <img 
                src={'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80'} 
                alt="Album Art" 
                className="w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2">
                 {/* Bouncing Bars */}
                 <div className="flex gap-1 items-end justify-center mb-2 h-6">
                   <div className="w-1 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '0ms' }} />
                   <div className="w-1 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '150ms' }} />
                   <div className="w-1 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '300ms' }} />
                   <div className="w-1 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '450ms' }} />
                 </div>
                 <h3 className="font-serif text-white text-center drop-shadow-md text-[16px] truncate w-full">
                   {currentStory.music.title || 'Unknown Title'}
                 </h3>
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-none">
              <p className="font-serif text-white/95 drop-shadow-lg text-sm text-center truncate max-w-[160px]">{currentStory.music.title}</p>
              <p className="font-serif text-white/70 text-xs drop-shadow-md text-center truncate max-w-[160px] mt-0.5">{currentStory.music.artist}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {currentStory.overlays?.map((overlay) => (
        <div key={overlay.id} className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden">
          <div 
            style={{ 
              transform: `translate(${overlay.position.x}px, ${overlay.position.y}px) scale(${overlay.scale})` 
            }}
            className="flex flex-col items-center drop-shadow-xl"
          >
            {overlay.type === 'text' && (
              <div 
                className={`font-bold text-3xl px-4 py-2 rounded-xl whitespace-pre-wrap text-center ${overlay.fontFamily || 'font-sans'} ${overlay.hasBackground ? (overlay.color === 'text-black' ? 'bg-white text-black' : 'bg-black text-white') : overlay.color || 'text-white'}`} 
                style={{ textShadow: overlay.hasBackground ? 'none' : '0 2px 10px rgba(0,0,0,0.8)' }}
              >
                {overlay.content}
              </div>
            )}
            {overlay.type === 'mention' && (
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const username = overlay.content.replace('@', '');
                  try {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('username', '==', username), limit(1));
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                      navigate(`/user/${snapshot.docs[0].id}`);
                      onClose();
                    } else {
                      toast({ title: 'User not found' });
                    }
                  } catch (err) {
                    console.error('Error fetching user:', err);
                  }
                }}
                className={`font-bold text-3xl px-4 py-2 rounded-xl whitespace-pre-wrap text-center pointer-events-auto hover:scale-105 transition-transform ${overlay.fontFamily || 'font-sans'} ${overlay.hasBackground ? (overlay.color === 'text-black' ? 'bg-white text-black' : 'bg-black text-white') : overlay.color || 'text-white'}`}
                style={{ textShadow: overlay.hasBackground ? 'none' : '0 2px 10px rgba(0,0,0,0.8)' }}
              >
                {overlay.content}
              </button>
            )}
            {overlay.type === 'sticker' && (
              <div className="text-6xl drop-shadow-2xl">{overlay.content}</div>
            )}
          </div>
        </div>
      ))}

      {/* Navigation */}
      {!showViewers && !showLikers && (
        <>
          <button
            onClick={() => { if (!isLongPressed) goPrev(); }}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className="absolute left-0 top-20 bottom-20 w-1/3 z-10"
          />
          <button
            onClick={() => { if (!isLongPressed) goNext(); }}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className="absolute right-0 top-20 bottom-20 w-2/3 z-10"
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
            }}
            className="flex items-center justify-center p-3 rounded-full bg-black/60 text-white"
          >
            <Eye className="w-5 h-5" />
            <ChevronUp className={`w-4 h-4 ml-1 transition-transform ${showViewers ? 'rotate-180' : ''}`} />
          </motion.button>
        )}

        {/* Like count for own stories - clickable to show who liked */}
        {isOwnStory && likesCount > 0 && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowLikers(!showLikers);
              setShowViewers(false);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white"
          >
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="text-sm font-medium">{likesCount}</span>
          </motion.button>
        )}
      </div>

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
                  {viewers.map((viewer) => {
                    const hasLiked = currentStory?.likes?.includes(viewer.uid);
                    return (
                      <div key={viewer.uid} className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={viewer.photoURL} alt={viewer.username} />
                            <AvatarFallback>{viewer.username?.charAt?.(0)?.toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{viewer.username}</span>
                        </div>
                        {hasLiked && (
                          <Heart className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Likers Panel */}
      <AnimatePresence>
        {showLikers && isOwnStory && (
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
                <h3 className="font-semibold flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                </h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowLikers(false); }}
                  className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <ScrollArea className="max-h-[calc(60vh-80px)]">
              {loadingLikers ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : likers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No likes yet</p>
              ) : (
                <div className="p-4 space-y-3">
                  {likers.map((liker) => (
                    <div key={liker.uid} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={liker.photoURL} alt={liker.username} />
                        <AvatarFallback>{liker.username?.charAt?.(0)?.toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium text-sm block">{liker.username}</span>
                        {liker.displayName && (
                          <span className="text-xs text-muted-foreground">{liker.displayName}</span>
                        )}
                      </div>
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
