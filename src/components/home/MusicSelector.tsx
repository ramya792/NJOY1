import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Music, Play, Check, Pause, Loader2, Scissors } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import MUSIC_LIBRARY, { fetchPreviewUrl, searchMusic } from '@/lib/musicData';
import type { MusicTrack } from '@/lib/musicData';

interface MusicSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (track: MusicTrack | null) => void;
  selectedTrack: MusicTrack | null;
}

const MusicSelector: React.FC<MusicSelectorProps> = ({ open, onClose, onSelect, selectedTrack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedForTrim, setSelectedForTrim] = useState<MusicTrack | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trimAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreviewPlay = async (track: MusicTrack) => {
    if (playingId === track.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
    setLoadingId(track.id);

    try {
      // Try to fetch real vocal preview from iTunes
      const itunesUrl = await fetchPreviewUrl(track.title, track.artist);
      const url = itunesUrl || track.previewUrl;

      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 0.5;
      audio.loop = true;

      // Set up event handlers before loading
      audio.oncanplaythrough = () => {
        setLoadingId(null);
      };
      audio.onended = () => {
        // Loop handles this, but just in case
        audio.currentTime = 0;
        audio.play().catch(() => {});
      };
      audio.onerror = () => {
        // Fallback to SoundHelix if iTunes URL fails
        if (itunesUrl && url !== track.previewUrl) {
          const fallbackAudio = new Audio(track.previewUrl);
          fallbackAudio.preload = 'auto';
          fallbackAudio.volume = 0.5;
          fallbackAudio.loop = true;
          fallbackAudio.play().catch(() => setPlayingId(null));
          audioRef.current = fallbackAudio;
        } else {
          setPlayingId(null);
          setLoadingId(null);
        }
      };

      audio.src = url;
      await audio.play();
      audioRef.current = audio;
      setPlayingId(track.id);
      setLoadingId(null);
    } catch {
      setPlayingId(null);
      setLoadingId(null);
    }
  };

  // Cleanup audio on close
  React.useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      audioRef.current = null;
      trimAudioRef.current?.pause();
      trimAudioRef.current = null;
      setPlayingId(null);
      setLoadingId(null);
      setSearchQuery(''); // Reset search on close
      setSelectedForTrim(null);
    }
  }, [open]);

  // Filter music - show all if no search, otherwise search by title, artist, or movie name
  const filteredMusic = searchQuery.trim().length >= 1
    ? searchMusic(searchQuery)
    : MUSIC_LIBRARY;

  const handleTrimSong = async (track: MusicTrack) => {
    // Stop any playing preview
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
    
    // Load song for trimming
    setSelectedForTrim(track);
    setTrimStart(0);
    setTrimEnd(Math.min(30, parseDuration(track.duration)));
  };

  const parseDuration = (duration: string): number => {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 30;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreviewTrim = async () => {
    if (!selectedForTrim) return;
    
    if (trimAudioRef.current) {
      trimAudioRef.current.pause();
      trimAudioRef.current = null;
    }

    const itunesUrl = await fetchPreviewUrl(selectedForTrim.title, selectedForTrim.artist);
    const url = itunesUrl || selectedForTrim.previewUrl;

    const audio = new Audio(url);
    audio.currentTime = trimStart;
    audio.volume = 0.5;
    
    const stopAt = () => {
      if (audio.currentTime >= trimEnd) {
        audio.pause();
        audio.currentTime = trimStart;
      }
    };
    
    audio.addEventListener('timeupdate', stopAt);
    await audio.play();
    trimAudioRef.current = audio;
  };

  const handleSaveTrimmed = async () => {
    if (!selectedForTrim) return;
    
    // Stop trim preview
    if (trimAudioRef.current) {
      trimAudioRef.current.pause();
      trimAudioRef.current = null;
    }

    // Fetch real preview URL
    const itunesUrl = await fetchPreviewUrl(selectedForTrim.title, selectedForTrim.artist);
    const trackWithTrim = {
      ...selectedForTrim,
      previewUrl: itunesUrl || selectedForTrim.previewUrl,
      startTime: trimStart,
      endTime: trimEnd,
    };
    onSelect(trackWithTrim);
    setSelectedForTrim(null);
    onClose();
  };

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
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by song name, artist, or movie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full"
                  autoFocus
                />
              </div>
              {filteredMusic.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {filteredMusic.length} {filteredMusic.length === 1 ? 'song' : 'songs'} {searchQuery ? 'found' : 'available'}
                </p>
              )}
            </div>

            {/* Music List */}
            <ScrollArea className="h-[calc(85vh-180px)]">
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
                      className={`w-full flex items-center gap-2 p-3 rounded-lg transition-colors ${
                        selectedTrack?.id === track.id
                          ? 'bg-primary/10'
                          : 'hover:bg-secondary'
                      }`}
                    >
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
                      <button
                        onClick={() => handleTrimSong(track)}
                        className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                        title="Adjust song timing"
                      >
                        <Scissors className="w-4 h-4 text-primary" />
                      </button>
                      <span className="text-xs text-muted-foreground">{track.duration}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>

          {/* Trim Dialog */}
          <AnimatePresence>
            {selectedForTrim && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
                onClick={() => {
                  if (trimAudioRef.current) {
                    trimAudioRef.current.pause();
                    trimAudioRef.current = null;
                  }
                  setSelectedForTrim(null);
                }}
              >
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-card rounded-2xl p-6 max-w-md w-full"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Scissors className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{selectedForTrim.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{selectedForTrim.artist}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (trimAudioRef.current) {
                          trimAudioRef.current.pause();
                          trimAudioRef.current = null;
                        }
                        setSelectedForTrim(null);
                      }}
                      className="p-2 hover:bg-secondary rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Start Time</label>
                        <span className="text-sm text-muted-foreground">{formatTime(trimStart)}</span>
                      </div>
                      <Slider
                        value={[trimStart]}
                        onValueChange={([val]) => setTrimStart(Math.min(val, trimEnd - 5))}
                        max={parseDuration(selectedForTrim.duration) - 5}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">End Time</label>
                        <span className="text-sm text-muted-foreground">{formatTime(trimEnd)}</span>
                      </div>
                      <Slider
                        value={[trimEnd]}
                        onValueChange={([val]) => setTrimEnd(Math.max(val, trimStart + 5))}
                        max={Math.min(parseDuration(selectedForTrim.duration), trimStart + 30)}
                        min={trimStart + 5}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <span className="text-sm font-medium">Duration</span>
                      <span className="text-sm text-primary font-medium">{formatTime(trimEnd - trimStart)}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={handlePreviewTrim} className="flex-1">
                        <Play className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button onClick={handleSaveTrimmed} className="flex-1">
                        <Check className="w-4 h-4 mr-2" />
                        Use This
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};

export default MusicSelector;
