import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, ExternalLink, Loader2, Youtube, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MusicSearchProps {
  onSelectSong?: (song: string, url: string) => void;
}

const MusicSearch: React.FC<MusicSearchProps> = ({ onSelectSong }) => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Array<{ title: string; artist: string; url: string }>>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    
    // Simulate search results - in production, integrate with YouTube/Spotify API
    // For now, generate YouTube search links
    const searchQuery = encodeURIComponent(query);
    
    // Create search result links
    const mockResults = [
      {
        title: query,
        artist: 'Search on YouTube',
        url: `https://www.youtube.com/results?search_query=${searchQuery}`,
      },
      {
        title: query,
        artist: 'Search on Spotify',
        url: `https://open.spotify.com/search/${searchQuery}`,
      },
      {
        title: query,
        artist: 'Search on SoundCloud',
        url: `https://soundcloud.com/search?q=${searchQuery}`,
      },
    ];
    
    setTimeout(() => {
      setResults(mockResults);
      setSearching(false);
    }, 500);
  };

  const openLink = (url: string, title: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onSelectSong?.(title, url);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for songs, artists, movies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 h-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={searching || !query.trim()}>
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-sm text-muted-foreground">
            Click to search "{query}" on:
          </p>
          {results.map((result, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => openLink(result.url, result.title)}
              className="w-full flex items-center gap-3 p-3 bg-secondary/50 hover:bg-secondary rounded-xl transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {result.artist.includes('YouTube') ? (
                  <Youtube className="w-5 h-5 text-destructive" />
                ) : (
                  <Music className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{result.artist}</p>
                <p className="text-xs text-muted-foreground truncate">"{result.title}"</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Hint text */}
      {results.length === 0 && !searching && (
        <div className="text-center py-6">
          <Music className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Search for any song, artist, or movie soundtrack
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Results will open on YouTube, Spotify, or SoundCloud
          </p>
        </div>
      )}
    </div>
  );
};

export default MusicSearch;
