import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Send } from 'lucide-react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Comment {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  text: string;
  createdAt: Date;
}

interface ReelCommentsProps {
  reelId: string;
  reelOwnerId: string;
  commentsCount: number;
  onClose: () => void;
  onCommentAdded: () => void;
}

const ReelComments: React.FC<ReelCommentsProps> = ({ reelId, reelOwnerId, commentsCount, onClose, onCommentAdded }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const commentsQuery = query(
          collection(db, 'reels', reelId, 'comments'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(commentsQuery);
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })) as Comment[];
        setComments(fetched);
      } catch (error) {
        console.error('Error fetching reel comments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [reelId]);

  const handleSubmit = async () => {
    if (!commentText.trim() || !userProfile || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reels', reelId, 'comments'), {
        userId: userProfile.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL || '',
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'reels', reelId), {
        comments: commentsCount + 1,
      });

      // Send notification for comment
      if (reelOwnerId && reelOwnerId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          type: 'comment',
          fromUserId: userProfile.uid,
          fromUsername: userProfile.username,
          fromUserPhoto: userProfile.photoURL || '',
          toUserId: reelOwnerId,
          message: `commented on your reel: "${commentText.trim().slice(0, 30)}"`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setComments(prev => [{
        id: Date.now().toString(),
        userId: userProfile.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL || '',
        text: commentText.trim(),
        createdAt: new Date(),
      }, ...prev]);

      setCommentText('');
      onCommentAdded();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 max-h-[60vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Comments</h3>
        <button onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <button
                onClick={() => { onClose(); navigate(`/user/${comment.userId}`); }}
                className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0"
              >
                {comment.userPhoto ? (
                  <img src={comment.userPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {comment.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold mr-1">{comment.username}</span>
                  {comment.text}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
              {userProfile?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <Input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 h-9 text-sm rounded-full"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={!commentText.trim() || submitting}
          className={`p-2 ${commentText.trim() ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </motion.div>
  );
};

export default ReelComments;
