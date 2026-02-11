import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Upload, Image, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Default wallpaper gallery
const DEFAULT_WALLPAPERS = [
  { id: 'none', label: 'None', color: 'transparent', preview: '' },
  { id: 'gradient-1', label: 'Ocean', color: '', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gradient-2', label: 'Sunset', color: '', preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'gradient-3', label: 'Forest', color: '', preview: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'gradient-4', label: 'Night', color: '', preview: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)' },
  { id: 'gradient-5', label: 'Warm', color: '', preview: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'gradient-6', label: 'Mint', color: '', preview: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { id: 'gradient-7', label: 'Aurora', color: '', preview: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  { id: 'gradient-8', label: 'Twilight', color: '', preview: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)' },
  { id: 'gradient-9', label: 'Cherry', color: '', preview: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)' },
  { id: 'gradient-10', label: 'Lavender', color: '', preview: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)' },
  { id: 'gradient-11', label: 'Peach', color: '', preview: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { id: 'gradient-12', label: 'Deep Sea', color: '', preview: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
  { id: 'solid-1', label: 'Dark', color: '#1a1a1a', preview: '' },
  { id: 'solid-2', label: 'Slate', color: '#334155', preview: '' },
  { id: 'solid-3', label: 'Navy', color: '#1e3a5f', preview: '' },
  { id: 'solid-4', label: 'Teal', color: '#134e4a', preview: '' },
  { id: 'solid-5', label: 'Wine', color: '#4a1942', preview: '' },
  { id: 'solid-6', label: 'Blush', color: '#fdf2f8', preview: '' },
];

const WALLPAPER_STORAGE_KEY = 'njoy_chat_wallpapers';

export interface WallpaperConfig {
  type: 'none' | 'gradient' | 'solid' | 'custom';
  value: string; // gradient string, hex color, or base64/URL
}

// Get wallpaper for a specific chat
export function getChatWallpaper(conversationId: string): WallpaperConfig {
  try {
    const stored = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    if (stored) {
      const wallpapers = JSON.parse(stored);
      if (wallpapers[conversationId]) return wallpapers[conversationId];
      if (wallpapers['__default__']) return wallpapers['__default__'];
    }
  } catch {}
  return { type: 'none', value: '' };
}

// Save wallpaper for a specific chat or as default
export function saveChatWallpaper(conversationId: string | '__default__', config: WallpaperConfig) {
  try {
    const stored = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    const wallpapers = stored ? JSON.parse(stored) : {};
    wallpapers[conversationId] = config;
    localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(wallpapers));
  } catch {}
}

// Get CSS background style from config
export function getWallpaperStyle(config: WallpaperConfig): React.CSSProperties {
  if (config.type === 'none') return {};
  if (config.type === 'gradient') return { background: config.value };
  if (config.type === 'solid') return { backgroundColor: config.value };
  if (config.type === 'custom') return {
    backgroundImage: `url(${config.value})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
  return {};
}

interface ChatWallpaperPickerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onWallpaperChange: (config: WallpaperConfig) => void;
  currentWallpaper: WallpaperConfig;
}

const ChatWallpaperPicker: React.FC<ChatWallpaperPickerProps> = ({
  isOpen,
  onClose,
  conversationId,
  onWallpaperChange,
  currentWallpaper,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<WallpaperConfig>(currentWallpaper);
  const [applyTo, setApplyTo] = useState<'this' | 'all'>('this');

  const handleSelectWallpaper = (wp: typeof DEFAULT_WALLPAPERS[0]) => {
    if (wp.id === 'none') {
      setSelected({ type: 'none', value: '' });
    } else if (wp.preview) {
      setSelected({ type: 'gradient', value: wp.preview });
    } else {
      setSelected({ type: 'solid', value: wp.color });
    }
  };

  const handleCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 5 MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setSelected({ type: 'custom', value: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    if (applyTo === 'all') {
      saveChatWallpaper('__default__', selected);
    }
    saveChatWallpaper(conversationId, selected);
    onWallpaperChange(selected);
    toast({ title: 'Wallpaper updated!' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Chat Wallpaper
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview */}
          <div className="px-4 pt-4">
            <div
              className="h-32 rounded-xl border border-border overflow-hidden flex items-center justify-center"
              style={getWallpaperStyle(selected)}
            >
              {selected.type === 'none' ? (
                <span className="text-muted-foreground text-sm">No wallpaper</span>
              ) : (
                <div className="flex flex-col gap-2 px-6 w-full">
                  <div className="self-start bg-white/90 dark:bg-zinc-800/90 rounded-2xl rounded-bl-sm px-3 py-1.5">
                    <p className="text-xs">Hey! How are you? 👋</p>
                  </div>
                  <div className="self-end bg-primary/90 text-primary-foreground rounded-2xl rounded-br-sm px-3 py-1.5">
                    <p className="text-xs">I'm great! Thanks 😊</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Custom Upload */}
          <div className="px-4 pt-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <Upload className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Upload custom image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCustomImage}
              className="hidden"
            />
          </div>

          {/* Gallery */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_WALLPAPERS.map((wp) => {
                const isSelected =
                  (wp.id === 'none' && selected.type === 'none') ||
                  (wp.preview && selected.value === wp.preview) ||
                  (wp.color && selected.value === wp.color);

                return (
                  <button
                    key={wp.id}
                    onClick={() => handleSelectWallpaper(wp)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-primary scale-95' : 'border-transparent'
                    }`}
                    style={
                      wp.id === 'none'
                        ? { backgroundColor: 'var(--secondary)' }
                        : wp.preview
                        ? { background: wp.preview }
                        : { backgroundColor: wp.color }
                    }
                  >
                    {wp.id === 'none' && (
                      <div className="flex items-center justify-center h-full">
                        <X className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <span className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {wp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Apply Options */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setApplyTo('this')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  applyTo === 'this' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                This chat
              </button>
              <button
                onClick={() => setApplyTo('all')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  applyTo === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                All chats
              </button>
            </div>
            <button
              onClick={handleApply}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Apply Wallpaper
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatWallpaperPicker;
