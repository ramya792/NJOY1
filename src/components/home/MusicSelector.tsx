import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Music, Play, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
}

interface MusicSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (track: MusicTrack | null) => void;
  selectedTrack: MusicTrack | null;
}

// Trending music list (simulated - in production this would come from an API)
const TRENDING_MUSIC: MusicTrack[] = [
  { id: '1', title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20' },
  { id: '2', title: 'Levitating', artist: 'Dua Lipa', duration: '3:23' },
  { id: '3', title: 'Save Your Tears', artist: 'The Weeknd', duration: '3:35' },
  { id: '4', title: 'Good 4 U', artist: 'Olivia Rodrigo', duration: '2:58' },
  { id: '5', title: 'Peaches', artist: 'Justin Bieber', duration: '3:18' },
  { id: '6', title: 'Montero', artist: 'Lil Nas X', duration: '2:17' },
  { id: '7', title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', duration: '2:21' },
  { id: '8', title: 'Heat Waves', artist: 'Glass Animals', duration: '3:58' },
  { id: '9', title: 'Butter', artist: 'BTS', duration: '2:44' },
  { id: '10', title: 'Kiss Me More', artist: 'Doja Cat ft. SZA', duration: '3:28' },
  { id: '11', title: 'Industry Baby', artist: 'Lil Nas X', duration: '3:32' },
  { id: '12', title: 'Shivers', artist: 'Ed Sheeran', duration: '3:27' },
  { id: '13', title: 'Bad Habits', artist: 'Ed Sheeran', duration: '3:50' },
  { id: '14', title: 'Mood', artist: '24kGoldn ft. iann dior', duration: '2:20' },
  { id: '15', title: 'Drivers License', artist: 'Olivia Rodrigo', duration: '4:02' },
];

const MusicSelector: React.FC<MusicSelectorProps> = ({ open, onClose, onSelect, selectedTrack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredMusic = searchQuery.trim()
    ? TRENDING_MUSIC.filter(
        (track) =>
          track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          track.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : TRENDING_MUSIC;

  const handleSelect = (track: MusicTrack) => {
    onSelect(track);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl safe-bottom"
            style={{ maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-2" />
              <div className="flex items-center gap-2 mt-2">
                <Music className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-lg">Add Music</h3>
              </div>
              <button onClick={onClose} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search songs or artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full"
                />
              </div>
            </div>

            {/* Music List */}
            <ScrollArea className="h-[calc(80vh-180px)]">
              <div className="p-2">
                {selectedTrack && (
                  <button
                    onClick={() => {
                      onSelect(null);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 mb-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                        <X className="w-5 h-5 text-destructive" />
                      </div>
                      <span className="font-medium text-destructive">Remove Music</span>
                    </div>
                  </button>
                )}

                {filteredMusic.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Music className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No songs found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different search</p>
                  </div>
                ) : (
                  filteredMusic.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => handleSelect(track)}
                      onMouseEnter={() => setHoveredId(track.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        selectedTrack?.id === track.id
                          ? 'bg-primary/10'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                          {hoveredId === track.id ? (
                            <Play className="w-5 h-5 text-primary" fill="currentColor" />
                          ) : selectedTrack?.id === track.id ? (
                            <Check className="w-5 h-5 text-primary" />
                          ) : (
                            <Music className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">{track.duration}</span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MusicSelector;
