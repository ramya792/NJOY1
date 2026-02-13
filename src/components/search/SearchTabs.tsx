import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X, Users, Music, Hash, Film, Loader2, Youtube, Play, Heart } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import UserSearchResult from './UserSearchResult';
import ReelSearchResult from './ReelSearchResult';
import MusicSearch from './MusicSearch';
import { useNavigate } from 'react-router-dom';
import PostCard from '@/components/home/PostCard';

interface SearchResult {
  type: 'user' | 'reel' | 'hashtag' | 'music';
  id: string;
  data: any;
}

interface ExploreFeedItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  comments?: number;
  source: 'post' | 'reel';
  userId: string;
  username: string;
}

const SearchTabs: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Explore feed state
  const [exploreFeed, setExploreFeed] = useState<ExploreFeedItem[]>(() => {
    try {
      const cached = sessionStorage.getItem('njoy_explore_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Filter out items with empty mediaUrl from cache
        return parsed.filter((item: any) => item.mediaUrl);
      }
    } catch (e) {
      console.error('Explore cache restore error:', e);
    }
    return [];
  });
  const [exploreLoading, setExploreLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem('njoy_explore_cache');
      return !cached || cached === '[]';
    } catch {
      return true;
    }
  });
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [visibleCount, setVisibleCount] = useState(30); // Lazy loading count

  // Private user filtering
  const [privateUsers, setPrivateUsers] = useState<Set<string>>(new Set());
  const privateUserCacheRef = React.useRef<Map<string, boolean>>(new Map());

  // Extract unique hashtags and songs from reels
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<{ song: string; count: number }[]>([]);

  // Helper to check and cache private users
  const checkPrivateUsers = async (userIds: string[]) => {
    if (!userProfile) return;
    const following = new Set(userProfile.following || []);
    const unknownUserIds = userIds.filter(id =>
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

    const privates = new Set<string>();
    privateUserCacheRef.current.forEach((isPrivate, uid) => {
      if (isPrivate && !following.has(uid) && uid !== userProfile.uid) {
        privates.add(uid);
      }
    });
    setPrivateUsers(privates);
  };

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const reelsQuery = query(
          collection(db, 'reels'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const snapshot = await getDocs(reelsQuery);
        
        const hashtagMap = new Map<string, number>();
        const songMap = new Map<string, number>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          
          // Extract hashtags from caption
          const hashtags = (data.caption || '').match(/#\w+/g) || [];
          hashtags.forEach((tag: string) => {
            const normalizedTag = tag.toLowerCase();
            hashtagMap.set(normalizedTag, (hashtagMap.get(normalizedTag) || 0) + 1);
          });

          // Count songs
          if (data.song) {
            const normalizedSong = data.song.trim();
            songMap.set(normalizedSong, (songMap.get(normalizedSong) || 0) + 1);
          }
        });

        // Sort and get top items
        const sortedHashtags = Array.from(hashtagMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag]) => tag);

        const sortedSongs = Array.from(songMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([song, count]) => ({ song, count }));

        setTrendingHashtags(sortedHashtags);
        setTrendingSongs(sortedSongs);
      } catch (error) {
        console.error('Error fetching trending:', error);
      }
    };

    fetchTrending();
  }, []);

  // Fetch explore feed (posts + reels for grid)
  useEffect(() => {
    if (!userProfile) return;
    
    const fetchExploreFeed = async () => {
      setExploreLoading(true);
      try {
        const feedItems: ExploreFeedItem[] = [];

        // Fetch recent posts and reels in parallel for faster loading
        const [postsSnapshot, reelsSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            limit(30)
          )),
          getDocs(query(
            collection(db, 'reels'),
            orderBy('createdAt', 'desc'),
            limit(20)
          ))
        ]);

        // Process posts
        postsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const mediaUrl = data.mediaUrl || data.imageUrl || '';
          if (!mediaUrl) return; // Skip posts without media
          feedItems.push({
            id: doc.id,
            mediaUrl,
            mediaType: data.mediaType || 'image',
            likes: data.likes || [],
            comments: data.comments || 0,
            source: 'post',
            userId: data.userId || '',
            username: data.username || '',
          });
        });

        // Process reels
        reelsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const mediaUrl = data.videoUrl || data.mediaUrl || data.thumbnailUrl || '';
          if (!mediaUrl) return; // Skip reels without media
          feedItems.push({
            id: doc.id,
            mediaUrl,
            mediaType: 'video',
            likes: data.likes || [],
            comments: data.comments || 0,
            source: 'reel',
            userId: data.userId || '',
            username: data.username || '',
          });
        });

        // Shuffle for variety
        for (let i = feedItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [feedItems[i], feedItems[j]] = [feedItems[j], feedItems[i]];
        }

        setExploreFeed(feedItems);

        // Cache for instant restore (background)
        requestIdleCallback(() => {
          try {
            sessionStorage.setItem('njoy_explore_cache', JSON.stringify(feedItems.slice(0, 30)));
          } catch (e) {
            console.error('Explore cache save error:', e);
          }
        }, { timeout: 2000 });

        // Check privacy for all unique user IDs
        const uniqueUserIds = [...new Set(feedItems.map(item => item.userId))];
        await checkPrivateUsers(uniqueUserIds);
      } catch (error) {
        console.error('Error fetching explore feed:', error);
      } finally {
        setExploreLoading(false);
      }
    };

    fetchExploreFeed();
  }, [userProfile, checkPrivateUsers]);

  // Filter out private users' content and items without media from explore feed
  const visibleExploreFeed = useMemo(() => {
    return exploreFeed.filter(item =>
      item.mediaUrl && (item.userId === userProfile?.uid || !privateUsers.has(item.userId))
    );
  }, [exploreFeed, privateUsers, userProfile?.uid]);

  // Save and restore scroll position
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Restore scroll position
    const savedPos = sessionStorage.getItem('njoy_explore_scroll');
    if (savedPos) {
      requestAnimationFrame(() => {
        container.scrollTop = parseInt(savedPos, 10);
      });
    }
    
    // Lazy loading on scroll
    const handleScroll = () => {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when within 500px of bottom
      if (scrollHeight - scrollTop - clientHeight < 500) {
        setVisibleCount(prev => Math.min(prev + 20, visibleExploreFeed.length));
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      if (container) {
        sessionStorage.setItem('njoy_explore_scroll', String(container.scrollTop));
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [visibleExploreFeed.length]);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length < 1) {
        setResults([]);
        setSearched(false);
        return;
      }

      // Require minimum 3 characters for user search
      const searchLower = searchQuery.toLowerCase().trim();
      const canSearchUsers = searchLower.length >= 3;

      setLoading(true);
      setSearched(true);

      try {
        const searchResults: SearchResult[] = [];

        // Search users - only when 3+ characters typed
        if (canSearchUsers && (activeTab === 'all' || activeTab === 'users')) {
          const foundIds = new Set<string>();

          // Try multiple approaches for user search
          let foundUsers = false;
          
          // Approach 1: Try usernameLower prefix query
          try {
            const prefixEnd = searchLower.slice(0, -1) + String.fromCharCode(searchLower.charCodeAt(searchLower.length - 1) + 1);
            const usernameQuery = query(
              collection(db, 'users'),
              where('usernameLower', '>=', searchLower),
              where('usernameLower', '<', prefixEnd),
              limit(30)
            );
            const usernameSnapshot = await getDocs(usernameQuery);
            if (!usernameSnapshot.empty) {
              foundUsers = true;
              usernameSnapshot.forEach((doc) => {
                if (!foundIds.has(doc.id)) {
                  foundIds.add(doc.id);
                  searchResults.push({ type: 'user', id: doc.id, data: doc.data() });
                }
              });
            }
          } catch {}

          // Approach 2: Try username field (original case) prefix query
          if (!foundUsers) {
            try {
              const prefixEnd = searchLower.slice(0, -1) + String.fromCharCode(searchLower.charCodeAt(searchLower.length - 1) + 1);
              const usernameQuery = query(
                collection(db, 'users'),
                where('username', '>=', searchLower),
                where('username', '<', prefixEnd),
                limit(30)
              );
              const usernameSnapshot = await getDocs(usernameQuery);
              if (!usernameSnapshot.empty) {
                foundUsers = true;
                usernameSnapshot.forEach((doc) => {
                  if (!foundIds.has(doc.id)) {
                    foundIds.add(doc.id);
                    searchResults.push({ type: 'user', id: doc.id, data: doc.data() });
                  }
                });
              }
            } catch {}
          }
          
          // Approach 3: Broad fallback - fetch users and filter client-side
          if (!foundUsers) {
            try {
              const allUsersQuery = query(
                collection(db, 'users'),
                limit(200)
              );
              const allUsersSnapshot = await getDocs(allUsersQuery);
              allUsersSnapshot.forEach((doc) => {
                if (foundIds.has(doc.id)) return;
                const data = doc.data();
                const username = (data.username || '').toLowerCase();
                const displayName = (data.displayName || '').toLowerCase();
                
                if (username.includes(searchLower) || displayName.includes(searchLower)) {
                  foundIds.add(doc.id);
                  searchResults.push({ type: 'user', id: doc.id, data: data });
                }
              });
            } catch {}
          }
        }

        // Search reels by caption, hashtags, and songs
        if (activeTab === 'all' || activeTab === 'reels' || activeTab === 'hashtags' || activeTab === 'music') {
          const reelsQuery = query(
            collection(db, 'reels'),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          const reelsSnapshot = await getDocs(reelsQuery);
          
          reelsSnapshot.forEach((doc) => {
            const reelData = doc.data();
            const caption = (reelData.caption || '').toLowerCase();
            const song = (reelData.song || '').toLowerCase();

            // Check hashtags
            if ((activeTab === 'all' || activeTab === 'hashtags') && caption.includes('#' + searchLower.replace('#', ''))) {
              if (!searchResults.find(r => r.id === doc.id)) {
                searchResults.push({
                  type: 'hashtag',
                  id: doc.id,
                  data: reelData,
                });
              }
            }

            // Check music/songs
            if ((activeTab === 'all' || activeTab === 'music') && song.includes(searchLower)) {
              if (!searchResults.find(r => r.id === doc.id)) {
                searchResults.push({
                  type: 'music',
                  id: doc.id,
                  data: reelData,
                });
              }
            }

            // General reel search
            if ((activeTab === 'all' || activeTab === 'reels') && (caption.includes(searchLower) || song.includes(searchLower))) {
              if (!searchResults.find(r => r.id === doc.id)) {
                searchResults.push({
                  type: 'reel',
                  id: doc.id,
                  data: reelData,
                });
              }
            }
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, activeTab]);

  const handleHashtagClick = (hashtag: string) => {
    setSearchQuery(hashtag);
    setActiveTab('hashtags');
  };

  const handleSongClick = (song: string) => {
    setSearchQuery(song);
    setActiveTab('music');
  };

  const filteredResults = results.filter(result => {
    // Filter by tab type
    if (activeTab === 'users' && result.type !== 'user') return false;
    if (activeTab === 'reels' && result.type !== 'reel') return false;
    if (activeTab === 'hashtags' && result.type !== 'hashtag') return false;
    if (activeTab === 'music' && result.type !== 'music') return false;

    // Filter out private users' content (except users themselves - they appear but profile is locked)
    if (result.type !== 'user' && result.data?.userId) {
      if (privateUsers.has(result.data.userId)) return false;
    }
    // For user search results, filter out private users who we don't follow
    if (result.type === 'user' && result.data?.isPrivate) {
      const following = new Set(userProfile?.following || []);
      if (!following.has(result.id) && result.id !== userProfile?.uid) {
        // Still show the user in search, but their content is hidden
        // (UserProfile page handles locked state)
      }
    }

    return true;
  });

  const showSearchResults = searchFocused || searchQuery.trim().length > 0;

  return (
    <div ref={scrollContainerRef} className="h-full bg-background pb-4 overflow-y-auto overflow-x-hidden">
      {/* Search Header */}
      <div className="sticky top-0 z-40 glass border-b border-border">
        <div className="p-4 max-w-lg mx-auto">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users, hashtags, music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="pl-10 pr-10 h-11 bg-secondary border-0 rounded-xl"
            />
            {(searchQuery || searchFocused) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchFocused(false);
                  setSearched(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs - only show when in search mode */}
        {showSearchResults && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-transparent h-12 p-0 overflow-x-auto scrollbar-hide">
              <div className="flex min-w-full px-4 gap-1">
              <TabsTrigger
                value="all"
                className="flex-shrink-0 px-4 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="flex-shrink-0 px-4 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="w-4 h-4 mr-1" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="hashtags"
                className="flex-shrink-0 px-4 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Hash className="w-4 h-4 mr-1" />
                Hashtags
              </TabsTrigger>
              <TabsTrigger
                value="music"
                className="flex-shrink-0 px-4 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Music className="w-4 h-4 mr-1" />
                Music
              </TabsTrigger>
              <TabsTrigger
                value="reels"
                className="flex-shrink-0 px-4 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Film className="w-4 h-4 mr-1" />
                Reels
              </TabsTrigger>
            </div>
          </TabsList>
        </Tabs>
        )}
      </div>

      {showSearchResults ? (
        /* Search Results */
        <div className="max-w-lg mx-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : searched && filteredResults.length === 0 && searchQuery.trim().length < 3 && (activeTab === 'all' || activeTab === 'users') ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-lg mb-1">Type at least 3 characters</p>
              <p className="text-muted-foreground text-sm">Enter 3 or more letters to search for users</p>
            </motion.div>
          ) : searched && filteredResults.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-lg mb-1">
                {(activeTab === 'all' || activeTab === 'users') ? 'User not found' : 'No results found'}
              </p>
              <p className="text-muted-foreground text-sm">No results found for "{searchQuery}"</p>
              <p className="text-muted-foreground text-xs mt-1">
                {(activeTab === 'all' || activeTab === 'users') 
                  ? 'This user may not have signed up yet. Try a different username or name.'
                  : 'Try searching with different keywords'}
              </p>
            </motion.div>
          ) : searched ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {filteredResults.map((result, index) => (
                <motion.div
                  key={`${result.type}-${result.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {result.type === 'user' ? (
                    <UserSearchResult user={result.data} userId={result.id} />
                  ) : (
                    <ReelSearchResult reel={result.data} reelId={result.id} showType={result.type} />
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* Show trending when focused but no query */
            <div className="space-y-6">
              {/* Trending Hashtags */}
              {trendingHashtags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Trending Hashtags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.map((tag, index) => (
                      <motion.button
                        key={tag}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleHashtagClick(tag)}
                        className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-full text-sm font-medium transition-colors"
                      >
                        {tag}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Music Search Section */}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-destructive" />
                  Search Music (YouTube, Spotify, SoundCloud)
                </h3>
                <MusicSearch />
              </div>

              {/* Trending Music from App */}
              {trendingSongs.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Popular in App
                  </h3>
                  <div className="space-y-2">
                    {trendingSongs.slice(0, 5).map((item, index) => (
                      <motion.button
                        key={item.song}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSongClick(item.song)}
                        className="w-full flex items-center gap-3 p-3 bg-secondary/50 hover:bg-secondary rounded-xl transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Music className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm truncate">{item.song}</p>
                          <p className="text-xs text-muted-foreground">{item.count} reels</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {trendingHashtags.length === 0 && trendingSongs.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <SearchIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Search for users, hashtags, or music
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Explore Feed Grid - Instagram-style */
        <div className="max-w-lg mx-auto">
          {exploreLoading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`bg-secondary animate-pulse ${
                    i % 5 === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
                  }`}
                />
              ))}
            </div>
          ) : exploreFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <SearchIcon className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-semibold text-lg mb-2">Explore</h2>
              <p className="text-muted-foreground text-sm">
                Posts and reels from the community will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-0.5">
                {visibleExploreFeed.slice(0, visibleCount).map((item, index) => {
                // Every 10th item starting from 0 gets the large tile (2x2)
                const isLargeTile = index % 10 === 0;

                return (
                  <motion.button
                    key={`${item.source}-${item.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.02, 0.5) }}
                    onClick={() => {
                      if (item.source === 'reel') {
                        navigate(`/reels?id=${item.id}`);
                      } else {
                        // Navigate to home with post ID to highlight
                        navigate(`/?post=${item.id}`);
                      }
                    }}
                    className={`relative group overflow-hidden bg-secondary ${
                      isLargeTile ? 'col-span-2 row-span-2' : ''
                    } aspect-square`}
                  >
                    {item.mediaType === 'video' ? (
                      <>
                        <video
                          src={item.mediaUrl}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute top-2 right-2">
                          <Play className="w-4 h-4 text-white drop-shadow-lg" fill="white" />
                        </div>
                      </>
                    ) : (
                      <img
                        src={item.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                        }}
                      />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-white font-semibold text-sm">
                        <Heart className="w-5 h-5" fill="white" />
                        <span>{item.likes?.length || 0}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
              </div>
              
              {/* Load more indicator */}
              {visibleCount < visibleExploreFeed.length && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchTabs;