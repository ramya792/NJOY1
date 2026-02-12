import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import ReelItem from '@/components/reels/ReelItem';

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

const Reels: React.FC = () => {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const targetReelId = searchParams.get('id');
  const [reels, setReels] = useState<Reel[]>(() => {
    // Restore cached reels for instant display
    try {
      const cached = sessionStorage.getItem('njoy_reels_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt)
        }));
      }
    } catch (e) {
      console.error('Reels cache restore error:', e);
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem('njoy_reels_cache');
      return !cached || cached === '[]';
    } catch {
      return true;
    }
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Restore scroll position
    try {
      const savedIndex = sessionStorage.getItem('njoy_reels_index');
      return savedIndex ? parseInt(savedIndex, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [privateUsers, setPrivateUsers] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const privateUserCacheRef = useRef<Map<string, boolean>>(new Map());
  const hasScrolledToTargetRef = useRef(false);

  useEffect(() => {
    if (!userProfile) return;

    const reelsQuery = query(
      collection(db, 'reels'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(reelsQuery, async (snapshot) => {
      const fetchedReels = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as Reel[];

      // Check privacy status
      const uniqueUserIds = [...new Set(fetchedReels.map(r => r.userId))];
      const unknownUserIds = uniqueUserIds.filter(id =>
        id !== userProfile.uid && !privateUserCacheRef.current.has(id)
      );

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

      const following = new Set(userProfile.following || []);
      const privates = new Set<string>();
      privateUserCacheRef.current.forEach((isPrivate, uid) => {
        if (isPrivate && !following.has(uid) && uid !== userProfile.uid) {
          privates.add(uid);
        }
      });
      setPrivateUsers(privates);
      
      setReels(fetchedReels);
      
      // Cache reels for instant restore (background)
      requestIdleCallback(() => {
        try {
          sessionStorage.setItem('njoy_reels_cache', JSON.stringify(
            fetchedReels.slice(0, 30).map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))
          ));
        } catch (e) {
          console.error('Reels cache save error:', e);
        }
      }, { timeout: 2000 });
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Filter out private users' reels
  const visibleReels = useMemo(() => {
    return reels.filter(reel =>
      reel.userId === userProfile?.uid || !privateUsers.has(reel.userId)
    );
  }, [reels, privateUsers, userProfile?.uid]);

  // Auto-scroll to target reel from URL ?id= parameter
  useEffect(() => {
    if (!targetReelId || hasScrolledToTargetRef.current || visibleReels.length === 0) return;
    const targetIndex = visibleReels.findIndex(r => r.id === targetReelId);
    if (targetIndex >= 0) {
      setCurrentIndex(targetIndex);
      hasScrolledToTargetRef.current = true;
      // Scroll to position after a tick to let the DOM render
      setTimeout(() => {
        if (containerRef.current) {
          const height = containerRef.current.clientHeight;
          containerRef.current.scrollTo({ top: targetIndex * height, behavior: 'auto' });
        }
      }, 50);
    }
  }, [targetReelId, visibleReels]);

  const scrollToIndex = useCallback((index: number) => {
    if (!containerRef.current || isAnimatingRef.current) return;
    const clampedIndex = Math.max(0, Math.min(index, visibleReels.length - 1));
    if (clampedIndex === currentIndex && index !== 0) return;
    
    isAnimatingRef.current = true;
    const height = containerRef.current.clientHeight;
    
    containerRef.current.scrollTo({
      top: clampedIndex * height,
      behavior: 'smooth',
    });

    setCurrentIndex(clampedIndex);

    // Unlock after the smooth scroll animation completes
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, 600);
  }, [currentIndex, visibleReels.length]);

  // Handle wheel events (desktop) — one scroll = one reel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimatingRef.current) return;

      if (e.deltaY > 30) {
        scrollToIndex(currentIndex + 1);
      } else if (e.deltaY < -30) {
        scrollToIndex(currentIndex - 1);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentIndex, scrollToIndex]);

  // Detect current reel via scroll position (CSS snap handles the actual snapping)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const height = container.clientHeight;
        if (height === 0) return;
        const newIndex = Math.round(container.scrollTop / height);
        const clamped = Math.max(0, Math.min(newIndex, visibleReels.length - 1));
        if (clamped !== currentIndex) {
          setCurrentIndex(clamped);
        }
        isAnimatingRef.current = false;
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentIndex, visibleReels.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToIndex(currentIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToIndex(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, scrollToIndex]);

  if (loading) {
    return (
      <div className="h-screen bg-foreground flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (visibleReels.length === 0) {
    return (
      <div className="h-screen bg-foreground flex flex-col items-center justify-center text-background px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-background/10 flex items-center justify-center mb-6"
        >
          <span className="text-4xl">🎬</span>
        </motion.div>
        <h2 className="font-display font-semibold text-xl mb-2">
          No Reels Yet
        </h2>
        <p className="text-background/70 text-center">
          Be the first to create a reel!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="reel-container scrollbar-hide"
      style={{ touchAction: 'pan-y', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }}
    >
      {visibleReels.map((reel, index) => (
        <div key={reel.id} style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
          <ReelItem
            reel={reel}
            isActive={index === currentIndex}
          />
        </div>
      ))}
    </div>
  );
};

export default Reels;
