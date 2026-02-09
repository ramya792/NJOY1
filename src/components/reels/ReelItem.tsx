import React, { useRef, useState, useEffect } from 'react';
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
}

const ReelItem: React.FC<ReelItemProps> = ({ reel, isActive }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(reel.likes?.includes(userProfile?.uid || ''));
  const [saved, setSaved] = useState(reel.saves?.includes(userProfile?.uid || ''));
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [commentsCount, setCommentsCount] = useState(reel.comments || 0);
  const [showHeart, setShowHeart] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setPlaying(true);
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setPlaying(false);
        setShowComments(false);
      }
    }
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
    <div className="reel-item relative bg-black">
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="w-full h-full object-contain"
        loop
        muted={muted}
        playsInline
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
      />

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

      {/* Right side actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-6">
        <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart className={`w-7 h-7 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          <span className="text-white text-xs font-medium">{likesCount}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.8 }} onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="text-white text-xs font-medium">{commentsCount}</span>
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

      {/* Bottom info */}
      <div className="absolute left-3 right-16 bottom-8">
        <button onClick={() => navigate(`/user/${reel.userId}`)} className="font-semibold text-white text-sm mb-2">
          @{reel.username}
        </button>
        <p className="text-white text-sm line-clamp-2">{reel.caption}</p>
        {reel.song && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-4 h-4 bg-white/20 rounded animate-spin" />
            <span className="text-white text-xs">🎵 {reel.song}</span>
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
};

export default ReelItem;
