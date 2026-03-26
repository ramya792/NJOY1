import React, { useRef, useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Volume2, VolumeX, Play, Download, Loader2, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ReelComments from './ReelComments';

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
  createdAt: Date;
}

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  inFeed?: boolean;
  shouldPreload?: boolean;
}

const ReelItem: React.FC<ReelItemProps> = memo(({ reel, isActive, inFeed = false, shouldPreload = false }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(reel.likes?.includes(userProfile?.uid || ''));
  const [saved, setSaved] = useState(reel.saves?.includes(userProfile?.uid || ''));
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [commentsCount, setCommentsCount] = useState(reel.comments || 0);
  const [showHeart, setShowHeart] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

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

    return () => { cancelled = true; };
  }, [isActive]);

  const togglePlay = () => {
    if (showComments) return;
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
    const shareUrl = `${window.location.origin}/reels?id=${reel.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this reel on NJOY', url: shareUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  return (
    <div className={inFeed ? 'relative bg-black w-full h-full' : 'reel-item relative bg-black'}>
      {reel.videoUrl ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          preload={isActive ? 'auto' : shouldPreload ? 'auto' : 'metadata'}
          onClick={togglePlay}
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
          <Share2 className="w-6 h-6 text-white" />
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
              {reel.username?.charAt(0).toUpperCase()}
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
      <button onClick={() => setMuted(!muted)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
        {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
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
    </div>
  );
});

ReelItem.displayName = 'ReelItem';

export default ReelItem;
