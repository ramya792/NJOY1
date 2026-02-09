import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Play, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Post {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  comments: number;
  userId?: string;
}

interface PostGridProps {
  posts: Post[];
  loading: boolean;
  emptyMessage: string;
  isOwnProfile?: boolean;
  contentType?: 'posts' | 'reels';
  onPostDeleted?: (postId: string) => void;
}

const PostGrid: React.FC<PostGridProps> = ({ 
  posts, 
  loading, 
  emptyMessage, 
  isOwnProfile = false,
  contentType = 'posts',
  onPostDeleted
}) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget || !userProfile) return;
    
    setDeleting(true);
    try {
      const collectionName = contentType === 'reels' ? 'reels' : 'posts';
      await deleteDoc(doc(db, collectionName, deleteTarget.id));
      
      // Decrement posts count
      await updateDoc(doc(db, 'users', userProfile.uid), {
        postsCount: increment(-1)
      });
      
      onPostDeleted?.(deleteTarget.id);
      
      toast({
        title: `${contentType === 'reels' ? 'Reel' : 'Post'} deleted`,
        description: 'Your content has been removed.',
      });
      
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Delete failed',
        description: 'Could not delete the content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-0.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square skeleton" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
          <span className="text-2xl">{contentType === 'reels' ? '🎬' : '📷'}</span>
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative aspect-square bg-secondary group"
          >
            <button
              onClick={() => {
                if (contentType === 'reels') {
                  navigate(`/reels?id=${post.id}`);
                } else {
                  navigate(`/post/${post.id}`);
                }
              }}
              className="w-full h-full"
            >
              {post.mediaType === 'video' ? (
                <>
                  <video
                    src={post.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute top-2 right-2">
                    <Play className="w-5 h-5 text-white fill-white drop-shadow" />
                  </div>
                </>
              ) : (
                <img
                  src={post.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </button>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center gap-6">
              <div className="flex items-center gap-1 text-white font-semibold">
                <Heart className="w-5 h-5 fill-white" />
                <span>{post.likes?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-white font-semibold">
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>{post.comments || 0}</span>
              </div>
            </div>
            
            {/* Delete button for own profile */}
            {isOwnProfile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(post);
                }}
                className="absolute top-2 left-2 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {contentType === 'reels' ? 'Reel' : 'Post'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {contentType === 'reels' ? 'reel' : 'post'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostGrid;
