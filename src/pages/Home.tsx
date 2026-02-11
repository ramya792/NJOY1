import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, limit, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [privateUsers, setPrivateUsers] = useState<Set<string>>(new Set());
  const hasScrolledToPostRef = useRef(false);

  // Cache of private user IDs to filter posts
  const privateUserCacheRef = React.useRef<Map<string, boolean>>(new Map());

  const targetPostId = searchParams.get('post');

  // Scroll to target post when loaded
  useEffect(() => {
    if (!targetPostId || loading || hasScrolledToPostRef.current) return;
    hasScrolledToPostRef.current = true;
    // Small delay to let DOM render
    setTimeout(() => {
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'rounded-lg');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'rounded-lg'), 2000);
      }
      // Clean the URL param after scrolling
      setSearchParams({}, { replace: true });
    }, 300);
  }, [targetPostId, loading, setSearchParams]);

  useEffect(() => {
    if (!userProfile) return;

    // Use real-time listener for posts
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Post[];

      // Check which post authors are private (batch unique userIds)
      const uniqueUserIds = [...new Set(fetchedPosts.map(p => p.userId))];
      const unknownUserIds = uniqueUserIds.filter(id => 
        id !== userProfile.uid && !privateUserCacheRef.current.has(id)
      );

      // Fetch privacy status for unknown users
      if (unknownUserIds.length > 0) {
        const userDocs = await Promise.all(
          unknownUserIds.map(uid => getDoc(doc(db, 'users', uid)))
        );
        userDocs.forEach((userDoc, i) => {
          if (userDoc.exists()) {
            privateUserCacheRef.current.set(unknownUserIds[i], userDoc.data().isPrivate === true);
          }
        });
      }

      // Build set of private user IDs the current user does NOT follow
      const following = new Set(userProfile.following || []);
      const privates = new Set<string>();
      privateUserCacheRef.current.forEach((isPrivate, uid) => {
        if (isPrivate && !following.has(uid) && uid !== userProfile.uid) {
          privates.add(uid);
        }
      });
      setPrivateUsers(privates);

      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Filter out private users' posts
  const visiblePosts = useMemo(() => {
    return posts.filter(post => 
      post.userId === userProfile?.uid || !privateUsers.has(post.userId)
    );
  }, [posts, privateUsers, userProfile?.uid]);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden bg-background">
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
        ) : visiblePosts.length === 0 ? (
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
            {visiblePosts.map((post, index) => (
              <motion.div
                key={post.id}
                id={`post-${post.id}`}
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
