import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, Users, Music, Hash, Film, Loader2, Youtube } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import UserSearchResult from './UserSearchResult';
import ReelSearchResult from './ReelSearchResult';
import MusicSearch from './MusicSearch';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  type: 'user' | 'reel' | 'hashtag' | 'music';
  id: string;
  data: any;
}

const SearchTabs: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Extract unique hashtags and songs from reels
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<{ song: string; count: number }[]>([]);

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

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      try {
        const searchResults: SearchResult[] = [];
        const searchLower = searchQuery.toLowerCase();

        // Search users
        if (activeTab === 'all' || activeTab === 'users') {
          const usersQuery = query(
            collection(db, 'users'),
            where('username', '>=', searchLower),
            where('username', '<=', searchLower + '\uf8ff'),
            limit(10)
          );
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach((doc) => {
            searchResults.push({
              type: 'user',
              id: doc.id,
              data: doc.data(),
            });
          });
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
    }, 500);

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
    if (activeTab === 'all') return true;
    if (activeTab === 'users') return result.type === 'user';
    if (activeTab === 'reels') return result.type === 'reel';
    if (activeTab === 'hashtags') return result.type === 'hashtag';
    if (activeTab === 'music') return result.type === 'music';
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
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
              className="pl-10 pr-10 h-11 bg-secondary border-0 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
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
      </div>

      {/* Results */}
      <div className="max-w-lg mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : searched && filteredResults.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
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
          /* Show trending when no search */
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
    </div>
  );
};

export default SearchTabs;
