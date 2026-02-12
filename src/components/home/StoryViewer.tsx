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
import { fetchPreviewUrl } from '@/lib/musicData';

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
  } | null;
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
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<ViewerInfo[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
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
    if (showViewers || showMentionInput || showLikers) return; // Pause timer when viewing panels
    
    const duration = currentStory?.mediaType === 'video' ? 15000 : 10000; // Minimum 10 seconds for images, 15 for videos
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
  }, [currentIndex, localStories.length, onClose, currentStory, showViewers, showMentionInput, showLikers]);

  useEffect(() => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex, currentStory]);

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
        const storyDuration = currentStory.mediaType === 'video' ? 15 : 10;
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
          audio.play().casync () => {
          try {
            await audio.play();
          } catch {
            const retryPlay = async () => {
              try { await audio.play(); } catch {}
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
          if (rafId) cancelAnimationFrame(rafId
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
        setLikers(fetchedLikers.filter((v): v is ViewerInfo => v !== null));
      } catch (error) {
        console.error('Error fetching likers:', error);
      } finally {
        setLoadingLikers(false);
      }
    };

    fetchLikers();
  }, [showLikers, currentStory]);

  // Search users for mentions - start from 2 characters, filter by public/following/followers
  useEffect(() => {
    if (!mentionQuery.trim() || mentionQuery.trim().length < 2) {
      setMentionResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setMentionLoading(true);
      try {
        const searchLower = mentionQuery.toLowerCase().trim();
        
        // Try with usernameLower field first (case-insensitive)
        let snapshot;
        try {
          const usersQuery = query(
            collection(db, 'users'),
            where('usernameLower', '>=', searchLower),
            where('usernameLower', '<=', searchLower + '\uf8ff'),
            limit(30)
          );
          snapshot = await getDocs(usersQuery);
        } catch {
          // Fallback: query all and filter client-side
          snapshot = null;
        }
        
        // If usernameLower query returned nothing or failed, try username field + client filter
        if (!snapshot || snapshot.empty) {
          try {
            const fallbackQuery = query(
              collection(db, 'users'),
              where('username', '>=', searchLower),
              where('username', '<=', searchLower + '\uf8ff'),
              limit(30)
            );
            const fallbackSnap = await getDocs(fallbackQuery);
            if (fallbackSnap.empty) {
              // Try broader search with limit
              const broadQuery = query(
                collection(db, 'users'),
                limit(100)
              );
              snapshot = await getDocs(broadQuery);
            } else {
              snapshot = fallbackSnap;
            }
          } catch {
            const broadQuery = query(
              collection(db, 'users'),
              limit(100)
            );
            snapshot = await getDocs(broadQuery);
          }
        }
        
        const results: ViewerInfo[] = [];
        const currentFollowing = new Set(userProfile?.following || []);
        const currentFollowers = new Set(userProfile?.followers || []);

        snapshot?.forEach((docSnap) => {
          if (docSnap.id !== userProfile?.uid) {
            const data = docSnap.data();
            const username = (data.username || '').toLowerCase();
            const displayName = (data.displayName || '').toLowerCase();
            
            // Client-side filter to ensure match
            if (!username.includes(searchLower) && !displayName.includes(searchLower)) {
              return;
            }
            
            const isPrivate = data.isPrivate === true;
            const isFollowedByMe = currentFollowing.has(docSnap.id);
            const isFollowingMe = currentFollowers.has(docSnap.id);

            // Only allow mentioning: public accounts, or accounts you follow, or accounts that follow you
            if (!isPrivate || isFollowedByMe || isFollowingMe) {
              results.push({
                uid: docSnap.id,
                username: data.username || '',
                displayName: data.displayName || '',
                photoURL: data.photoURL || '',
                isPrivate,
              });
            }
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
  }, [mentionQuery, userProfile?.uid, userProfile?.following, userProfile?.followers]);

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

    // Prevent re-mentioning the same user on the same story
    if (currentStory.mentions?.includes(mentionedUser.uid)) {
      toast({ title: `@${mentionedUser.username} is already mentioned` });
      setShowMentionInput(false);
      setMentionQuery('');
      setMentionResults([]);
      return;
    }
    
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

      // Auto-send a chat message to mentioned user
      try {
        // Check for existing conversation
        const convQuery1 = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', userProfile.uid),
          limit(50)
        );
        const convSnapshot = await getDocs(convQuery1);
        let existingConvId: string | null = null;

        convSnapshot.forEach((convDoc) => {
          const participants = convDoc.data().participants as string[];
          if (participants.includes(mentionedUser.uid)) {
            existingConvId = convDoc.id;
          }
        });

        if (existingConvId) {
          // Add message to existing conversation
          await addDoc(collection(db, 'conversations', existingConvId, 'messages'), {
            senderId: userProfile.uid,
            text: `📸 I mentioned you in my story!`,
            mediaUrl: currentStory.mediaUrl,
            mediaType: currentStory.mediaType === 'video' ? 'video' : 'image',
            createdAt: serverTimestamp(),
            seen: false,
          });
          await updateDoc(doc(db, 'conversations', existingConvId), {
            lastMessage: '📸 I mentioned you in my story!',
            lastMessageTime: serverTimestamp(),
            unreadBy: [mentionedUser.uid],
          });
        } else {
          // Create new conversation and send message
          const newConvRef = await addDoc(collection(db, 'conversations'), {
            participants: [userProfile.uid, mentionedUser.uid],
            participantNames: {
              [userProfile.uid]: userProfile.username,
              [mentionedUser.uid]: mentionedUser.username,
            },
            participantPhotos: {
              [userProfile.uid]: userProfile.photoURL || '',
              [mentionedUser.uid]: mentionedUser.photoURL || '',
            },
            lastMessage: '📸 I mentioned you in my story!',
            lastMessageTime: serverTimestamp(),
            unreadBy: [mentionedUser.uid],
            createdAt: serverTimestamp(),
          });
          await addDoc(collection(db, 'conversations', newConvRef.id, 'messages'), {
            senderId: userProfile.uid,
            text: `📸 I mentioned you in my story!`,
            mediaUrl: currentStory.mediaUrl,
            mediaType: currentStory.mediaType === 'video' ? 'video' : 'image',
            createdAt: serverTimestamp(),
            seen: false,
          });
        }
      } catch (chatError) {
        console.error('Error sending mention chat message:', chatError);
        // Don't fail the mention if chat message fails
      }

      toast({ title: `@${mentionedUser.username} mentioned!` });

      // Update local story state to prevent re-mentioning without Firestore refresh
      setLocalStories(prev => prev.map(s =>
        s.id === currentStory.id
          ? { ...s, mentions: [...(s.mentions || []), mentionedUser.uid] }
          : s
      ));

      setShowMentionInput(false);
      setMentionQuery('');
      setMentionResults([]);
    } catch (error) {
      console.error('Error mentioning user:', error);
      toast({ title: 'Failed to mention user', variant: 'destructive' });
    }
  }, [currentStory, userProfile, toast]);

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
      setShowMentionInput(false);
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
      setShowMentionInput(false);
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
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsLongPressed(false);
      if (videoRef.current) videoRef.current.play().catch(() => {});
      if (audioRef.current) audioRef.current.play().catch(() => {});
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
        if (showMentionInput) { setShowMentionInput(false); setMentionQuery(''); setMentionResults([]); }
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
      <div className="absolute top-10 left-4 right-20 flex items-center gap-3 z-20">
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
      <div className="absolute top-10 right-4 z-20 flex items-center gap-2">
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
      {isLongPressed && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
            <div className="flex gap-1.5">
              <div className="w-2 h-8 bg-white rounded-sm" />
              <div className="w-2 h-8 bg-white rounded-sm" />
            </div>
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

      {/* Music overlay */}
      {currentStory.music && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2.5 flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Music className="w-4 h-4 text-white flex-shrink-0" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {currentStory.music.title}
              </p>
              <p className="text-white/70 text-xs truncate">
                {currentStory.music.artist}
              </p>
            </div>
            {/* Playing bars animation */}
            <div className="flex items-end gap-0.5 h-4">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-white rounded-full"
                  animate={{ height: ['4px', '16px', '8px', '14px', '4px'] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                />
              ))}
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
      {!showViewers && !showMentionInput && !showLikers && (
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
              setShowMentionInput(false);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">{viewerCount} {viewerCount === 1 ? 'view' : 'views'}</span>
            <ChevronUp className={`w-4 h-4 transition-transform ${showViewers ? 'rotate-180' : ''}`} />
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
              setShowMentionInput(false);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white"
          >
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="text-sm font-medium">{likesCount}</span>
          </motion.button>
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
              ) : mentionQuery.trim().length > 0 && mentionQuery.trim().length < 2 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Type at least 2 characters to search</p>
              ) : mentionResults.length === 0 && mentionQuery.trim().length >= 2 ? (
                <p className="text-center text-muted-foreground py-8">No users found (only public accounts &amp; followers/following)</p>
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
                      <div className="text-left">
                        <span className="font-medium text-sm block">@{user.username}</span>
                        {user.displayName && (
                          <span className="text-xs text-muted-foreground block">{user.displayName}</span>
                        )}
                      </div>
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
                  {viewers.map((viewer) => {
                    const hasLiked = currentStory?.likes?.includes(viewer.uid);
                    return (
                      <div key={viewer.uid} className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={viewer.photoURL} alt={viewer.username} />
                            <AvatarFallback>{viewer.username.charAt(0).toUpperCase()}</AvatarFallback>
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
                        <AvatarFallback>{liker.username.charAt(0).toUpperCase()}</AvatarFallback>
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
