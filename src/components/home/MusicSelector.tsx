import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Music, Play, Check, Pause, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import MUSIC_LIBRARY, { fetchPreviewUrl, MOOD_CATEGORIES } from '@/lib/musicData';
import type { MusicTrack, MoodCategory } from '@/lib/musicData';

interface MusicSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (track: MusicTrack | null) => void;
  selectedTrack: MusicTrack | null;
}

const MusicSelector: React.FC<MusicSelectorProps> = ({ open, onClose, onSelect, selectedTrack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodCategory | ''>('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreviewPlay = async (track: MusicTrack) => {
    if (playingId === track.id) {
      // Stop playing
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    // Stop previous
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
    setLoadingId(track.id);

    try {
      // Try to fetch real vocal preview from iTunes
      const itunesUrl = await fetchPreviewUrl(track.title, track.artist);
      const url = itunesUrl || track.previewUrl;

      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        // Fallback to SoundHelix if iTunes URL fails
        if (itunesUrl && url !== track.previewUrl) {
          const fallbackAudio = new Audio(track.previewUrl);
          fallbackAudio.volume = 0.5;
          fallbackAudio.onended = () => setPlayingId(null);
          fallbackAudio.play().catch(() => setPlayingId(null));
          audioRef.current = fallbackAudio;
        } else {
          setPlayingId(null);
        }
      };
      await audio.play();
      audioRef.current = audio;
      setPlayingId(track.id);
    } catch {
      setPlayingId(null);
    } finally {
      setLoadingId(null);
    }
  };

  // Cleanup audio on close
  React.useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      setLoadingId(null);
    }
  }, [open]);

  const filteredMusic = MUSIC_LIBRARY.filter((track) => {
    const matchesMood = !selectedMood || track.mood === selectedMood;
    const matchesSearch = !searchQuery.trim() ||
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMood && matchesSearch;
  });

  const handleSelect = async (track: MusicTrack) => {
    // Fetch real preview URL before saving to story
    const itunesUrl = await fetchPreviewUrl(track.title, track.artist);
    const trackWithVocalUrl = {
      ...track,
      previewUrl: itunesUrl || track.previewUrl,
    };
    onSelect(trackWithVocalUrl);
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
            style={{ maxHeight: '85vh' }}
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
            <div className="px-4 pt-3 pb-2">
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

            {/* Mood Filter Pills */}
            <div className="px-4 pb-3 border-b border-border">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {MOOD_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedMood(cat.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedMood === cat.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Music List */}
            <ScrollArea className="h-[calc(85vh-220px)]">
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
                    <p className="text-sm text-muted-foreground mt-1">Try a different search or mood</p>
                  </div>
                ) : (
                  filteredMusic.map((track) => (
                    <div
                      key={track.id}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        selectedTrack?.id === track.id
                          ? 'bg-primary/10'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreviewPlay(track); }}
                          disabled={loadingId === track.id}
                          className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 hover:from-primary/30 hover:to-primary/10 transition-colors"
                        >
                          {loadingId === track.id ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          ) : playingId === track.id ? (
                            <Pause className="w-5 h-5 text-primary" fill="currentColor" />
                          ) : selectedTrack?.id === track.id ? (
                            <Check className="w-5 h-5 text-primary" />
                          ) : (
                            <Play className="w-5 h-5 text-primary" fill="currentColor" />
                          )}
                        </button>
                        <button
                          onClick={() => handleSelect(track)}
                          className="text-left flex-1 min-w-0"
                        >
                          <p className="font-medium text-sm truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">{track.duration}</span>
                    </div>
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
