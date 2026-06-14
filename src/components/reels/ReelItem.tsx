import React, { useRef, useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Volume2, VolumeX, Play, Download, Loader2, Share2, Copy, ExternalLink, Send, Plus, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp, getDocs, query, limit, where, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ReelComments from './ReelComments';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Reel {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  videoUrl: string;
  caption: string;
  song?: string;
  likes: string[];
  comments: number;
  saves: string[];
  shares?: number;
  createdAt: Date;
}

interface UserResult {
  uid: string;
  username: string;
  displayName?: string;
  photoURL: string;
}

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  inFeed?: boolean;
  shouldPreload?: boolean;
  globalMuted?: boolean;
  onMuteToggle?: (muted: boolean) => void;
}

const ReelItem: React.FC<ReelItemProps> = memo(({ reel, isActive, inFeed = false, shouldPreload = false, globalMuted = false, onMuteToggle }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.likes?.includes(userProfile?.uid || ''));
  const [saved, setSaved] = useState(reel.saves?.includes(userProfile?.uid || ''));
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [sharesCount, setSharesCount] = useState(reel.shares || 0);
  const [commentsCount, setCommentsCount] = useState(reel.comments || 0);
  const [showHeart, setShowHeart] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState<UserResult[]>([]);
  const [sharingToUser, setSharingToUser] = useState<string | null>(null);

  // Robust play/pause based on isActive
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    if (isActive) {
      setVideoLoading(true);
      setVideoError(false);

      const tryPlay = () => {
        if (cancelled) return;
        video.play().then(() => {
          if (!cancelled) {
            setPlaying(true);
            setVideoLoading(false);
          }
        }).catch(() => {
          if (!cancelled) {
            // Autoplay can be blocked by browser policy; keep UI usable.
            setPlaying(false);
            setVideoLoading(false);
          }
        });
      };

      // If video already has enough data, play immediately
      if (video.readyState >= 2) {
        tryPlay();
      } else {
        // Force load and use multiple event listeners + polling fallback
        video.load();

        const onReady = () => {
          tryPlay();
          cleanup();
        };

        video.addEventListener('canplay', onReady);
        video.addEventListener('loadeddata', onReady);

        // Polling fallback — checks every 300ms in case events were missed
        const pollInterval = setInterval(() => {
          if (cancelled) { clearInterval(pollInterval); return; }
          if (video.readyState >= 2) {
            tryPlay();
            clearInterval(pollInterval);
          }
        }, 300);

        // Timeout fallback — force play attempt after 3s regardless
        const forceTimeout = setTimeout(() => {
          if (!cancelled && !playing) {
            tryPlay();
          }
        }, 3000);

        const cleanup = () => {
          video.removeEventListener('canplay', onReady);
          video.removeEventListener('loadeddata', onReady);
          clearInterval(pollInterval);
          clearTimeout(forceTimeout);
        };

        return () => { cancelled = true; cleanup(); };
      }
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
      setShowComments(false);
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
        setPlaying(false);
      } else if (isActive && !showComments) {
        // We can try to resume if it was active
        video.play().catch(() => {});
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => { 
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (video) {
        video.pause();
      }
    };
  }, [isActive, showComments]);

  const pointerDownTime = useRef<number>(0);

  const togglePlay = (e?: React.MouseEvent) => {
    if (showComments) return;
    const duration = Date.now() - pointerDownTime.current;
    if (duration > 300) {
      // It was a long press, do not pause
      return;
    }
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleDoubleTap = () => {
    if (showComments) return;
    if (!liked) handleLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const handleLike = async () => {
    if (!userProfile) return;
    const reelRef = doc(db, 'reels', reel.id);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));

    try {
      await updateDoc(reelRef, {
        likes: newLiked ? arrayUnion(userProfile.uid) : arrayRemove(userProfile.uid),
      });

      // Send notification for like
      if (newLiked && reel.userId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          type: 'like',
          fromUserId: userProfile.uid,
          fromUsername: userProfile.username,
          fromUserPhoto: userProfile.photoURL || '',
          toUserId: reel.userId,
          message: 'liked your reel',
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      setLiked(!newLiked);
      setLikesCount((prev) => (newLiked ? prev - 1 : prev + 1));
    }
  };

  const handleSave = async () => {
    if (!userProfile) return;
    const reelRef = doc(db, 'reels', reel.id);
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      await updateDoc(reelRef, {
        saves: newSaved ? arrayUnion(userProfile.uid) : arrayRemove(userProfile.uid),
      });
      toast({
        title: newSaved ? 'Reel saved' : 'Reel unsaved',
        description: newSaved ? 'Added to your saved reels.' : 'Removed from saved.',
      });
    } catch (error) {
      setSaved(!newSaved);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(reel.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `njoy-reel-${reel.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Download started' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setShowShareDialog(true);
  };

  const incrementShare = async () => {
    try {
      await updateDoc(doc(db, 'reels', reel.id), { shares: increment(1) });
      setSharesCount(prev => prev + 1);
    } catch (e) {
      console.error('Error incrementing share count:', e);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/reels?id=${reel.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied to clipboard!' });
      setShowShareDialog(false);
      incrementShare();
    } catch (error) {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };

  const handleExternalShare = async () => {
    const shareUrl = `${window.location.origin}/reels?id=${reel.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out this reel by @${reel.username} on NJOY`,
          text: reel.caption || 'Check out this reel on NJOY!',
          url: shareUrl,
        });
        setShowShareDialog(false);
        incrementShare();
      } catch (error) {
        // User cancelled
      }
    } else {
      toast({ title: 'Share not supported on this device', variant: 'destructive' });
    }
  };

  const handleShareToUser = async (recipientId: string, recipientUsername: string) => {
    if (!userProfile || sharingToUser) return;
    setSharingToUser(recipientId);
    
    try {
      const convQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userProfile.uid),
        limit(50)
      );
      const convSnapshot = await getDocs(convQuery);
      let existingConvId: string | null = null;

      convSnapshot.forEach((convDoc) => {
        const participants = convDoc.data().participants as string[];
        if (participants.includes(recipientId)) {
          existingConvId = convDoc.id;
        }
      });

      const messageData = {
        senderId: userProfile.uid,
        text: `📎 Shared a reel by @${reel.username}`,
        mediaUrl: reel.videoUrl,
        mediaType: 'video',
        postId: reel.id,
        createdAt: serverTimestamp(),
        seen: false,
      };

      if (existingConvId) {
        await addDoc(collection(db, 'conversations', existingConvId, 'messages'), messageData);
        await updateDoc(doc(db, 'conversations', existingConvId), {
          lastMessage: `📎 Shared a reel`,
          lastMessageTime: serverTimestamp(),
          unreadBy: [recipientId],
        });
      } else {
        const recipientDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', recipientId)));
        const recipientData = recipientDoc.docs[0]?.data();
        
        const newConvRef = await addDoc(collection(db, 'conversations'), {
          participants: [userProfile.uid, recipientId],
          participantNames: {
            [userProfile.uid]: userProfile.username,
            [recipientId]: recipientUsername,
          },
          participantPhotos: {
            [userProfile.uid]: userProfile.photoURL || '',
            [recipientId]: recipientData?.photoURL || '',
          },
          lastMessage: `📎 Shared a reel`,
          lastMessageTime: serverTimestamp(),
          unreadBy: [recipientId],
          createdAt: serverTimestamp(),
        });
        
        await addDoc(collection(db, 'conversations', newConvRef.id, 'messages'), messageData);
      }
      
      toast({ title: `Sent to @${recipientUsername}!` });
      setShowShareDialog(false);
      setShareSearchQuery('');
      setShareSearchResults([]);
      incrementShare();
    } catch (error) {
      console.error('Error sharing reel:', error);
      toast({ title: 'Failed to share', variant: 'destructive' });
    } finally {
      setSharingToUser(null);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!shareSearchQuery.trim() || shareSearchQuery.trim().length < 2) {
          // If no search query, fetch following or some default users
          if (userProfile?.following && userProfile.following.length > 0) {
            // Fetch users they follow
            const results: UserResult[] = [];
            // Limit to 15 to avoid too many reads
            const toFetch = userProfile.following.slice(0, 15);
            
            // We can fetch them individually or use 'in' query. 'in' query limits to 10.
            for (let i = 0; i < toFetch.length; i += 10) {
              const batch = toFetch.slice(i, i + 10);
              const q = query(collection(db, 'users'), where('__name__', 'in', batch));
              const snap = await getDocs(q);
              snap.forEach(docSnap => {
                if (docSnap.id !== userProfile.uid) {
                  const data = docSnap.data();
                  results.push({
                    uid: docSnap.id,
                    username: data.username || '',
                    displayName: data.displayName || '',
                    photoURL: data.photoURL || '',
                  });
                }
              });
            }
            setShareSearchResults(results);
          } else {
            // Just fetch recent users if they don't follow anyone
            const q = query(collection(db, 'users'), limit(15));
            const snap = await getDocs(q);
            const results: UserResult[] = [];
            snap.forEach(docSnap => {
              if (docSnap.id !== userProfile?.uid) {
                const data = docSnap.data();
                results.push({
                  uid: docSnap.id,
                  username: data.username || '',
                  displayName: data.displayName || '',
                  photoURL: data.photoURL || '',
                });
              }
            });
            setShareSearchResults(results);
          }
          return;
        }

        const searchLower = shareSearchQuery.toLowerCase().trim();
        const usersQuery = query(
          collection(db, 'users'),
          where('usernameLower', '>=', searchLower),
          where('usernameLower', '<=', searchLower + '\uf8ff'),
          limit(20)
        );
        const snapshot = await getDocs(usersQuery);
        const results: UserResult[] = [];

        snapshot.forEach((docSnap) => {
          if (docSnap.id !== userProfile?.uid) {
            const data = docSnap.data();
            results.push({
              uid: docSnap.id,
              username: data.username || '',
              displayName: data.displayName || '',
              photoURL: data.photoURL || '',
            });
          }
        });
        setShareSearchResults(results);
      } catch (error) {
        console.error('Error fetching users for share:', error);
      }
    };

    const searchTimeout = setTimeout(fetchUsers, shareSearchQuery.trim() ? 300 : 0);

    return () => clearTimeout(searchTimeout);
  }, [shareSearchQuery, userProfile?.uid, userProfile?.following]);

  return (
    <div className={inFeed ? 'relative bg-black w-full h-full' : 'reel-item relative bg-black'}>
      {reel.videoUrl ? (
        shouldPreload || isActive ? (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            poster={reel.videoUrl && typeof reel.videoUrl === 'string' && reel.videoUrl.includes('cloudinary.com') ? reel.videoUrl.replace(/\.[^/.]+$/, ".jpg") : undefined}
            className="w-full h-full object-cover"
            loop
            muted={globalMuted}
            playsInline
            preload={isActive ? 'auto' : 'metadata'}
            onClick={togglePlay}
            onPointerDown={() => {
              pointerDownTime.current = Date.now();
              if (videoRef.current) videoRef.current.playbackRate = 2.0;
            }}
            onPointerUp={() => {
              if (videoRef.current) videoRef.current.playbackRate = 1.0;
            }}
            onPointerCancel={() => {
              if (videoRef.current) videoRef.current.playbackRate = 1.0;
            }}
            onTouchStart={() => {
              pointerDownTime.current = Date.now();
              if (videoRef.current) videoRef.current.playbackRate = 2.0;
            }}
            onTouchEnd={() => {
              if (videoRef.current) videoRef.current.playbackRate = 1.0;
            }}
            onTouchCancel={() => {
              if (videoRef.current) videoRef.current.playbackRate = 1.0;
            }}
            onDoubleClick={handleDoubleTap}
            onCanPlay={() => setVideoLoading(false)}
            onLoadedData={() => setVideoLoading(false)}
            onWaiting={() => { if (isActive) setVideoLoading(true); }}
            onPlaying={() => { setVideoLoading(false); setVideoError(false); setPlaying(true); }}
            onError={(e) => {
              if (isActive && videoRef.current?.src) {
                setVideoLoading(false);
                setVideoError(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-black" />
        )
      ) : (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <p className="text-white/50 text-center px-4">Video not available</p>
        </div>
      )}

      {/* Video loading spinner */}
      {videoLoading && isActive && !videoError && reel.videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {/* Video error - retry button */}
      {videoError && reel.videoUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[5]">
          <p className="text-white/70 text-sm mb-3">Video failed to load</p>
          <button
            onClick={() => {
              setVideoError(false);
              setVideoLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
            className="px-4 py-2 bg-white/20 rounded-full text-white text-sm"
          >
            Tap to retry
          </button>
        </div>
      )}

      {/* Play/Pause indicator */}
      <AnimatePresence>
        {!playing && !showComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-32 h-32 text-white fill-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom gradient for text readability */}
      <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-[5]" />

      {/* Right side actions */}
      <div className={`absolute right-3 ${inFeed ? 'bottom-4' : 'bottom-[64px]'} flex flex-col items-center gap-4 z-10`}>
        <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart className={`w-7 h-7 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          <span className="text-white text-xs font-medium drop-shadow-lg">{likesCount}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.8 }} onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="text-white text-xs font-medium drop-shadow-lg">{commentsCount}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.8 }} onClick={handleShare} className="flex flex-col items-center gap-1">
          <Send className="w-6 h-6 text-white" />
          <span className="text-white text-xs font-medium drop-shadow-lg">{sharesCount}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.8 }} onClick={handleDownload} disabled={downloading} className="flex flex-col items-center gap-1">
          {downloading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Download className="w-6 h-6 text-white" />}
        </motion.button>

        <motion.button whileTap={{ scale: 0.8 }} onClick={handleSave}>
          <Bookmark className={`w-7 h-7 ${saved ? 'text-white fill-white' : 'text-white'}`} />
        </motion.button>

        {/* User avatar */}
        <button onClick={() => navigate(`/user/${reel.userId}`)} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white">
          {reel.userPhoto ? (
            <img src={reel.userPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-white text-sm font-bold">
              {reel.username?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </button>
      </div>

      {/* Bottom info - order: username → caption → hashtags */}
      <div className={`absolute left-3 right-16 ${inFeed ? 'bottom-4' : 'bottom-[64px]'} z-10 max-w-[calc(100%-5rem)]`}>
        <button onClick={() => navigate(`/user/${reel.userId}`)} className="font-semibold text-white text-sm block mb-1 drop-shadow-lg">
          @{reel.username}
        </button>
        {(() => {
          const captionText = (reel.caption || '').replace(/#\w+/g, '').trim();
          return captionText ? (
            <p className="text-white text-sm line-clamp-2 mb-1 drop-shadow-lg">{captionText}</p>
          ) : null;
        })()}
        {(() => {
          const hashtags = (reel.caption || '').match(/#\w+/g);
          if (!hashtags || hashtags.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1 mb-1">
              {hashtags.map((tag, i) => (
                <span key={i} className="text-blue-400 text-xs font-medium drop-shadow-lg">{tag}</span>
              ))}
            </div>
          );
        })()}
        {reel.song && (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-4 h-4 bg-white/20 rounded-full animate-spin" />
            <span className="text-white text-xs truncate drop-shadow-lg">🎵 {reel.song}</span>
          </div>
        )}
      </div>

      {/* Mute button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onMuteToggle?.(!globalMuted);
        }} 
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-20"
      >
        {globalMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
      </button>

      {/* Comments panel */}
      <AnimatePresence>
        {showComments && (
          <ReelComments
            reelId={reel.id}
            reelOwnerId={reel.userId}
            commentsCount={commentsCount}
            onClose={() => setShowComments(false)}
            onCommentAdded={() => setCommentsCount(prev => prev + 1)}
          />
        )}
      </AnimatePresence>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md p-0 border-0 bg-[#1f1f1f] text-white rounded-t-3xl overflow-hidden sm:rounded-b-3xl">
          <DialogTitle className="sr-only">Share Reel</DialogTitle>
          <div className="w-full flex flex-col h-[70vh] max-h-[600px]">
            {/* Top Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Search Bar */}
            <div className="px-4 py-2 flex items-center gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <input
                  type="text"
                  value={shareSearchQuery}
                  onChange={(e) => setShareSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-[#2a2a2a] text-white placeholder:text-white/50 rounded-xl h-10 pl-10 pr-4 outline-none border-none text-sm focus:ring-0"
                />
              </div>
              <button className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5 text-white/80" />
              </button>
            </div>

            {/* Users Grid */}
            <div className="flex-1 overflow-y-auto px-2 pt-2 pb-24 scrollbar-hide">
              {shareSearchQuery.trim().length > 0 && shareSearchResults.length === 0 ? (
                <div className="text-center text-white/50 py-10 text-sm">No users found</div>
              ) : (
                <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                  {(shareSearchResults.length > 0 ? shareSearchResults : [
                    // Mock users if empty search just to show the grid (in a real app we'd load suggestions)
                    // For now, if no search, we just show nothing or we could show following list.
                    // We'll map search results here. If empty, maybe prompt to search.
                  ]).map((user) => (
                    <button
                      key={user.uid}
                      onClick={() => handleShareToUser(user.uid, user.username)}
                      disabled={sharingToUser !== null}
                      className="flex flex-col items-center gap-2 group relative"
                    >
                      <div className="relative">
                        <Avatar className="w-16 h-16 border-2 border-transparent group-active:scale-95 transition-transform">
                          <AvatarImage src={user.photoURL} alt={user.username} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-purple-500 text-lg">
                            {user.username?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {sharingToUser === user.uid && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-white text-center w-full truncate px-1">
                        {user.displayName || user.username}
                      </span>
                    </button>
                  ))}
                  {shareSearchQuery.trim().length === 0 && (
                    <div className="col-span-3 text-center text-white/50 py-10 text-sm">
                      Type to search users...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#1f1f1f] border-t border-white/10 p-4">
              <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide pb-2">
                <button className="flex flex-col items-center gap-2 min-w-[72px]" onClick={() => {
                  toast({ title: 'Feature coming soon' });
                }}>
                  <div className="w-14 h-14 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-white/80 text-center leading-tight">Add to<br/>story</span>
                </button>
                
                {navigator.share && (
                  <button className="flex flex-col items-center gap-2 min-w-[72px]" onClick={handleExternalShare}>
                    <div className="w-14 h-14 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                      <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] text-white/80 text-center">Share</span>
                  </button>
                )}

                <button className="flex flex-col items-center gap-2 min-w-[72px]" onClick={handleDownload}>
                  <div className="w-14 h-14 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                    {downloading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Download className="w-6 h-6 text-white" />}
                  </div>
                  <span className="text-[10px] text-white/80 text-center">Download</span>
                </button>

                <button className="flex flex-col items-center gap-2 min-w-[72px]" onClick={handleCopyLink}>
                  <div className="w-14 h-14 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                    <Copy className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-white/80 text-center">Copy link</span>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ReelItem.displayName = 'ReelItem';

export default ReelItem;
