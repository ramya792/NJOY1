import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft } from 'lucide-react';
import PostCard from '@/components/home/PostCard';

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
  shares?: number;
  createdAt: Date;
  allowDownload?: boolean;
}

const SinglePost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      try {
        const docRef = doc(db, 'posts', postId);
        let docSnap = await getDoc(docRef);
        let isReel = false;
        
        if (!docSnap.exists()) {
          const reelRef = doc(db, 'reels', postId);
          docSnap = await getDoc(reelRef);
          isReel = true;
        }
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPost({
            id: docSnap.id,
            ...data,
            mediaUrl: isReel ? data.videoUrl : data.mediaUrl,
            mediaType: isReel ? 'video' : (data.mediaType || 'image'),
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Post);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <h2 className="font-display font-semibold text-xl mb-2">Post not found</h2>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border flex items-center h-14 px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-display font-semibold text-lg flex-1">NJOY</h1>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full py-4">
        <PostCard post={post} />
      </div>
    </div>
  );
};

export default SinglePost;
