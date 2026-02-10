import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const reelsQuery = query(
      collection(db, 'reels'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(reelsQuery, (snapshot) => {
      const fetchedReels = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Reel[];
      
      setReels(fetchedReels);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    isScrollingRef.current = true;

    // Debounce: wait for scroll to settle before updating index
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const height = containerRef.current.clientHeight;
      const index = Math.round(scrollTop / height);
      const clampedIndex = Math.max(0, Math.min(index, reels.length - 1));
      
      // Snap to the nearest reel
      containerRef.current.scrollTo({
        top: clampedIndex * height,
        behavior: 'smooth'
      });
      
      setCurrentIndex(clampedIndex);
      isScrollingRef.current = false;
    }, 150);
  }, [reels.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-foreground flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
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
      onScroll={handleScroll}
      className="reel-container scrollbar-hide"
    >
      {reels.map((reel, index) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          isActive={index === currentIndex}
        />
      ))}
    </div>
  );
};

export default Reels;
