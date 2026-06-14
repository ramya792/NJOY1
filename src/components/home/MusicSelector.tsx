import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Music, Play, Check, Pause, Loader2, Scissors } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { fetchPreviewUrl, searchMusicOnline } from '@/lib/musicData';
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
  const [trimEnd, setTrimEnd] = useState(20);
  const [filteredMusic, setFilteredMusic] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPlayingTrim, setIsPlayingTrim] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trimAudioRef = useRef<HTMLAudioElement | null>(null);

  const waveformBars = useMemo(() => {
    return Array.from({ length: 45 }).map(() => Math.random() * 60 + 20);
  }, [selectedForTrim]);

  // Handle cleanup when dialog closes or component unmounts
  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (trimAudioRef.current) {
        trimAudioRef.current.pause();
        trimAudioRef.current.currentTime = 0;
      }
      setPlayingId(null);
      setIsPlayingTrim(false);
      setSelectedForTrim(null);
    }
  }, [open]);

  // Stop audio when navigating away
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (audioRef.current) audioRef.current.pause();
        if (trimAudioRef.current) trimAudioRef.current.pause();
        setPlayingId(null);
        setIsPlayingTrim(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (trimAudioRef.current) {
        trimAudioRef.current.pause();
        trimAudioRef.current = null;
      }
    };
  }, []);

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

  // Cleanup audio on close and unmount
  useEffect(() => {
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
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (trimAudioRef.current) {
        trimAudioRef.current.pause();
        trimAudioRef.current = null;
      }
    };
  }, [open]);

  // Filter music using online search
  useEffect(() => {
    const search = async () => {
      setIsSearching(true);
      try {
        const results = await searchMusicOnline(searchQuery);
        setFilteredMusic(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(search, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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
    setTrimEnd(Math.min(20, parseDuration(track.duration)));
  };

  const parseDuration = (duration?: string): number => {
    if (!duration) return 30;
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

    setIsPlayingTrim(true);
    const itunesUrl = await fetchPreviewUrl(selectedForTrim.title, selectedForTrim.artist);
    const url = itunesUrl || selectedForTrim.previewUrl;

    const audio = new Audio(url);
    audio.currentTime = trimStart;
    audio.volume = 0.5;
    
    const stopAt = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= trimEnd) {
        audio.currentTime = trimStart; // Loop seamlessly
        setCurrentTime(trimStart);
      }
    };
    
    audio.addEventListener('timeupdate', stopAt);
    audio.addEventListener('pause', () => setIsPlayingTrim(false));
    audio.addEventListener('play', () => setIsPlayingTrim(true));
    
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
            className="fixed inset-0 bg-black/60 z-[70]"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl safe-bottom"
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
                  placeholder="Search songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full"
                  autoFocus
                />
              </div>
              {isSearching ? (
                <p className="text-xs text-muted-foreground mt-2 text-center">Searching...</p>
              ) : filteredMusic.length > 0 && (
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

          {/* Instagram-Style Trim Dialog Overlay */}
          <AnimatePresence>
            {selectedForTrim && (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[80] flex flex-col bg-black/90 backdrop-blur-sm"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 pt-safe-top">
                  <button 
                    onClick={() => {
                      if (trimAudioRef.current) trimAudioRef.current.pause();
                      setSelectedForTrim(null);
                    }}
                    className="text-white text-lg font-medium drop-shadow-md"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveTrimmed}
                    className="text-white text-lg font-bold drop-shadow-md flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Center Art */}
                <div className="flex-1 flex flex-col items-center justify-center -mt-10 px-4">
                  <div className="relative w-56 h-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 mb-6 border border-white/20">
                    <img 
                      src={selectedForTrim.thumbnailUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80'} 
                      alt="Album Art" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
                       {isPlayingTrim ? (
                         <div className="flex gap-1.5 items-end justify-center mb-4 h-10">
                           <div className="w-1.5 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '0ms' }} />
                           <div className="w-1.5 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '150ms' }} />
                           <div className="w-1.5 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '300ms' }} />
                           <div className="w-1.5 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '450ms' }} />
                         </div>
                       ) : (
                         <Music className="w-10 h-10 text-white mb-4 drop-shadow-md" />
                       )}
                       <h3 className="font-serif text-white text-center drop-shadow-md text-[22px] truncate w-full">
                         {selectedForTrim.title || 'Unknown Title'}
                       </h3>
                    </div>
                  </div>
                  <p className="font-serif text-white/90 drop-shadow-md text-lg text-center truncate w-full max-w-[250px]">{selectedForTrim.title}</p>
                  <p className="font-serif text-white/60 text-sm drop-shadow-md text-center truncate w-full max-w-[250px]">{selectedForTrim.artist}</p>
                </div>

                {/* Bottom Controls */}
                <div className="pb-8 pt-6 px-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-8 safe-bottom items-center">
                  
                  {/* Simple Waveform Scrubber */}
                  <div className="relative w-full max-w-sm h-12 bg-black rounded-full overflow-hidden flex items-center shadow-2xl border border-white/5">
                    
                    {/* The Dots */}
                    <div className="absolute inset-0 flex items-center justify-between gap-[2px] px-3 pointer-events-none">
                      {waveformBars.map((h, i) => {
                        const isInside = i / 45 >= trimStart / parseDuration(selectedForTrim.duration) && i / 45 <= (trimStart + 20) / parseDuration(selectedForTrim.duration);
                        return (
                          <div 
                            key={i} 
                            className={`flex-1 rounded-full ${isInside ? 'bg-white' : 'bg-[#333333]'}`} 
                            style={{ height: `${h}%` }} 
                          />
                        );
                      })}
                    </div>

                    {/* Invisible slider for dragging */}
                     <input
                       type="range"
                       min={0}
                       max={Math.max(0, parseDuration(selectedForTrim.duration) - 20)}
                       value={trimStart}
                       onChange={(e) => {
                         const start = Number(e.target.value);
                         setTrimStart(start);
                         setTrimEnd(Math.min(start + 20, parseDuration(selectedForTrim.duration)));
                         if (trimAudioRef.current) {
                           trimAudioRef.current.currentTime = start;
                           setCurrentTime(start);
                           if (trimAudioRef.current.paused) {
                             handlePreviewTrim();
                           }
                         } else {
                           handlePreviewTrim();
                         }
                       }}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                     />
                  </div>

                  <div className="flex items-center justify-between px-4">
                     <div className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center text-white font-bold text-xs shadow-md">
                       20
                     </div>
                     <button 
                       onClick={() => {
                         if (trimAudioRef.current) {
                           if (trimAudioRef.current.paused) trimAudioRef.current.play();
                           else trimAudioRef.current.pause();
                         } else {
                           handlePreviewTrim();
                         }
                       }}
                       className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                     >
                       {isPlayingTrim ? (
                         <Pause className="w-6 h-6" fill="currentColor" />
                       ) : (
                         <Play className="w-6 h-6 ml-1" fill="currentColor" />
                       )}
                     </button>
                     <div className="w-10 h-10" /> {/* Balancer */}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};

export default MusicSelector;
