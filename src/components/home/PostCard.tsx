import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Download, Loader2, Trash2, MoreHorizontal, Share2, Send, Copy, ExternalLink, X, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Post {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  likes: string[];
  comments: number;
  saves: string[];
  createdAt: Date;
  allowDownload?: boolean;
}

interface Comment {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  text: string;
  createdAt: Date;
}

interface UserResult {
  uid: string;
  username: string;
  displayName?: string;
  photoURL: string;
}

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
}

const PostCard = React.memo(forwardRef<HTMLDivElement, PostCardProps>(({ post, onDelete }, ref) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.likes?.includes(userProfile?.uid || ''));
  const [saved, setSaved] = useState(post.saves?.includes(userProfile?.uid || ''));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [showHeart, setShowHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments || 0);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState<UserResult[]>([]);
  const [sharingToUser, setSharingToUser] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const isOwner = userProfile?.uid === post.userId;

  const handleDeletePost = async () => {
    if (!userProfile || !isOwner) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      toast({
        title: 'Post deleted',
        description: 'Your post has been removed.',
      });
      onDelete?.(post.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Could not delete post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleLike = async () => {
    if (!userProfile) return;
    const postRef = doc(db, 'posts', post.id);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));

    try {
      await updateDoc(postRef, {
        likes: newLiked ? arrayUnion(userProfile.uid) : arrayRemove(userProfile.uid),
      });

      // Send notification for like
      if (newLiked && post.userId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          type: 'like',
          fromUserId: userProfile.uid,
          fromUsername: userProfile.username,
          fromUserPhoto: userProfile.photoURL || '',
          toUserId: post.userId,
          postId: post.id,
          postImage: post.mediaUrl,
          message: 'liked your post',
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      setLiked(!newLiked);
      setLikesCount((prev) => (newLiked ? prev - 1 : prev + 1));
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!liked) handleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    setLastTap(now);
  };

  const handleSave = async () => {
    if (!userProfile) return;
    const postRef = doc(db, 'posts', post.id);
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      await updateDoc(postRef, {
        saves: newSaved ? arrayUnion(userProfile.uid) : arrayRemove(userProfile.uid),
      });
      toast({
        title: newSaved ? 'Post saved' : 'Post unsaved',
        description: newSaved ? 'Added to your saved posts.' : 'Removed from saved.',
      });
    } catch (error) {
      setSaved(!newSaved);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(post.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `njoy-${post.id}.${post.mediaType === 'video' ? 'mp4' : 'jpg'}`;
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
  
  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/?postId=${post.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied to clipboard!' });
      setShowShareDialog(false);
    } catch (error) {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };
  
  const handleExternalShare = async () => {
    const shareUrl = `${window.location.origin}/?postId=${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out this post by @${post.username} on NJOY`,
          text: post.caption || 'Check out this post on NJOY!',
          url: shareUrl,
        });
        setShowShareDialog(false);
      } catch (error) {
        // User cancelled share
      }
    } else {
      toast({ title: 'Share not supported on this device', variant: 'destructive' });
    }
  };
  
  const handleShareToUser = async (recipientId: string, recipientUsername: string) => {
    if (!userProfile || sharingToUser) return;
    setSharingToUser(recipientId);
    
    try {
      // Find or create conversation
      const convQuery1 = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userProfile.uid),
        limit(50)
      );
      const convSnapshot = await getDocs(convQuery1);
      let existingConvId: string | null = null;

      convSnapshot.forEach((convDoc) => {
        const participants = convDoc.data().participants as string[];
        if (participants.includes(recipientId)) {
          existingConvId = convDoc.id;
        }
      });

      if (existingConvId) {
        // Add message to existing conversation
        await addDoc(collection(db, 'conversations', existingConvId, 'messages'), {
          senderId: userProfile.uid,
          text: `📎 Shared a post by @${post.username}`,
          mediaUrl: post.mediaUrl,
          mediaType: post.mediaType === 'video' ? 'video' : 'image',
          postId: post.id,
          createdAt: serverTimestamp(),
          seen: false,
        });
        await updateDoc(doc(db, 'conversations', existingConvId), {
          lastMessage: `📎 Shared a post`,
          lastMessageTime: serverTimestamp(),
          unreadBy: [recipientId],
        });
      } else {
        // Create new conversation
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
          lastMessage: `📎 Shared a post`,
          lastMessageTime: serverTimestamp(),
          unreadBy: [recipientId],
          createdAt: serverTimestamp(),
        });
        
        await addDoc(collection(db, 'conversations', newConvRef.id, 'messages'), {
          senderId: userProfile.uid,
          text: `📎 Shared a post by @${post.username}`,
          mediaUrl: post.mediaUrl,
          mediaType: post.mediaType === 'video' ? 'video' : 'image',
          postId: post.id,
          createdAt: serverTimestamp(),
          seen: false,
        });
      }
      
      toast({ title: `Sent to @${recipientUsername}!` });
      setShowShareDialog(false);
      setShareSearchQuery('');
      setShareSearchResults([]);
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({ title: 'Failed to share', variant: 'destructive' });
    } finally {
      setSharingToUser(null);
    }
  };
  
  // Search users for sharing
  React.useEffect(() => {
    if (!shareSearchQuery.trim() || shareSearchQuery.trim().length < 2) {
      setShareSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      try {
        const searchLower = shareSearchQuery.toLowerCase().trim();
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '>=', searchLower),
          where('username', '<=', searchLower + '\uf8ff'),
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
        console.error('Error searching users:', error);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [shareSearchQuery, userProfile?.uid]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const commentsQuery = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(commentsQuery);
      setComments(snapshot.docs.map((d) => ({
        id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as Comment[]);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !userProfile || submittingComment) return;
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        userId: userProfile.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL || '',
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'posts', post.id), { comments: commentsCount + 1 });

      // Send notification for comment
      if (post.userId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          type: 'comment',
          fromUserId: userProfile.uid,
          fromUsername: userProfile.username,
          fromUserPhoto: userProfile.photoURL || '',
          toUserId: post.userId,
          postId: post.id,
          postImage: post.mediaUrl,
          message: `commented: "${commentText.trim().slice(0, 50)}"`,
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
      setCommentsCount(prev => prev + 1);
      setCommentText('');
    } catch (error) {
      toast({ title: 'Error', description: 'Could not post comment.', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setCommentText((prev) => prev + emojiData.emoji);
  };

  return (
    <article ref={ref} className="bg-card border-y border-border sm:border sm:rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <button onClick={() => navigate(`/user/${post.userId}`)} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
            {post.userPhoto ? (
              <img src={post.userPhoto} alt={post.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {post.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="font-semibold text-sm">{post.username}</span>
        </button>
        
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-secondary transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-secondary cursor-pointer" onClick={handleDoubleTap}>
        {post.mediaType === 'video' ? (
          <video src={post.mediaUrl} className="w-full h-full object-cover" controls playsInline />
        ) : (
          <img src={post.mediaUrl} alt={post.caption} className="w-full h-full object-cover" loading="lazy" />
        )}
        <AnimatePresence>
          {showHeart && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className={liked ? 'like-animation' : ''}>
              <Heart className={`w-6 h-6 transition-colors ${liked ? 'text-red-500 fill-red-500' : ''}`} />
            </motion.button>
            <button onClick={handleToggleComments}>
              <MessageCircle className="w-6 h-6" />
            </button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </motion.button>
            {(post.allowDownload !== false) && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              </motion.button>
            )}
          </div>
          {(post.allowDownload !== false) && (
            <motion.button whileTap={{ scale: 0.8 }} onClick={handleSave}>
              <Bookmark className={`w-6 h-6 transition-colors ${saved ? 'text-foreground fill-foreground' : ''}`} />
            </motion.button>
          )}
        </div>

        <p className="font-semibold text-sm mb-1">{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</p>

        {post.caption && (
          <p className="text-sm emoji-text">
            <span className="font-semibold mr-1">{post.username}</span>{post.caption}
          </p>
        )}

        {commentsCount > 0 && !showComments && (
          <button onClick={handleToggleComments} className="text-sm text-muted-foreground mt-1">
            View all {commentsCount} comments
          </button>
        )}

        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
              <div className="flex items-center gap-2 mb-3 relative">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      {userProfile?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="h-9 text-sm pr-10 emoji-text" onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()} />
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
                  >
                    <Smile className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-12 right-0 z-50"
                      >
                        <EmojiPicker 
                          onEmojiClick={handleEmojiSelect}
                          theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                          width={300}
                          height={350}
                          previewConfig={{ showPreview: false }}
                          searchPlaceHolder="Search emoji..."
                          skinTonesDisabled
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Button size="sm" variant="ghost" onClick={handleSubmitComment} disabled={!commentText.trim() || submittingComment} className="text-primary font-semibold text-sm px-2">
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                </Button>
              </div>

              {loadingComments ? (
                <div className="space-y-3 py-2">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full skeleton" />
                      <div className="flex-1"><div className="h-3 w-20 skeleton mb-1" /><div className="h-3 w-full skeleton" /></div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No comments yet. Be the first!</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto py-1">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <button onClick={() => navigate(`/user/${comment.userId}`)} className="w-7 h-7 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                        {comment.userPhoto ? (
                          <img src={comment.userPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {comment.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </button>
                      <div className="flex-1">
                        <p className="text-sm emoji-text"><span className="font-semibold mr-1">{comment.username}</span>{comment.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setShowComments(false)} className="w-full text-center mt-2">
                <span className="text-xs text-muted-foreground">Hide comments</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(post.createdAt, { addSuffix: true })}</p>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Post</DialogTitle>
            <DialogDescription>
              Share this post with your friends
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Quick actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 flex flex-col items-center gap-2 h-auto py-4"
                onClick={handleCopyLink}
              >
                <Copy className="w-5 h-5" />
                <span className="text-xs">Copy Link</span>
              </Button>
              
              {navigator.share && (
                <Button
                  variant="outline"
                  className="flex-1 flex flex-col items-center gap-2 h-auto py-4"
                  onClick={handleExternalShare}
                >
                  <ExternalLink className="w-5 h-5" />
                  <span className="text-xs">Share</span>
                </Button>
              )}
            </div>
            
            {/* Search and send to users */}
            <div>
              <h4 className="font-medium text-sm mb-2">Send in Direct Message</h4>
              <Input
                value={shareSearchQuery}
                onChange={(e) => setShareSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="h-10 text-sm"
              />
            </div>
            
            {shareSearchQuery.trim().length > 0 && (
              <ScrollArea className="max-h-64">
                {shareSearchQuery.trim().length < 2 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Type at least 2 characters
                  </p>
                ) : shareSearchResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No users found
                  </p>
                ) : (
                  <div className="space-y-1">
                    {shareSearchResults.map((user) => (
                      <button
                        key={user.uid}
                        onClick={() => handleShareToUser(user.uid, user.username)}
                        disabled={sharingToUser !== null}
                        className="flex items-center justify-between w-full p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
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
                        </div>
                        {sharingToUser === user.uid ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}));

PostCard.displayName = 'PostCard';

export default PostCard;
