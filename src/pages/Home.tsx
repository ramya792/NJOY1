import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { collection, query, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import StoriesBar from '@/components/home/StoriesBar';
import PostCard from '@/components/home/PostCard';
import PostSkeleton from '@/components/home/PostSkeleton';

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
}

const Home: React.FC = () => {
  const { userProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    // Use real-time listener for posts
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Post[];
      
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Stories */}
      <StoriesBar />

      {/* Posts */}
      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-4 p-4">
            {[1, 2, 3].map((i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <span className="text-4xl">📷</span>
            </div>
            <h2 className="font-display font-semibold text-xl mb-2">
              Welcome to NJOY
            </h2>
            <p className="text-muted-foreground max-w-xs">
              Follow people to see their photos and videos here, or create your first post!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4 pb-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PostCard post={post} onDelete={handlePostDelete} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
