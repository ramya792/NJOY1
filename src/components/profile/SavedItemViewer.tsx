import React from 'react';
import { X, Heart, MessageCircle, Download, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  comments: number;
  type: 'post' | 'reel';
  caption?: string;
  username?: string;
  userPhoto?: string;
  allowDownload?: boolean;
}

interface SavedItemViewerProps {
  item: SavedItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const SavedItemViewer: React.FC<SavedItemViewerProps> = ({ item, isOpen, onClose }) => {
  if (!item) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(item.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `njoy-saved-${item.id}.${item.mediaType === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={onClose}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 safe-top">
            <div className="flex items-center gap-3">
              {item.userPhoto && (
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img src={item.userPhoto} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {item.username && (
                <span className="text-white font-semibold text-sm">{item.username}</span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div 
            className="flex-1 flex items-center justify-center px-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {item.mediaType === 'video' ? (
              <video
                src={item.mediaUrl}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-full rounded-lg object-contain"
                style={{ maxHeight: 'calc(100dvh - 180px)' }}
              />
            ) : (
              <img
                src={item.mediaUrl}
                alt=""
                className="max-w-full max-h-full rounded-lg object-contain"
                style={{ maxHeight: 'calc(100dvh - 180px)' }}
              />
            )}
          </div>

          {/* Footer with stats */}
          <div className="flex-shrink-0 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between max-w-lg mx-auto">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-white">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{item.likes?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{item.comments || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {item.allowDownload !== false && (
                  <button onClick={handleDownload} className="text-white hover:text-primary transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                )}
                <Bookmark className="w-5 h-5 text-white fill-white" />
              </div>
            </div>
            {item.caption && (
              <p className="text-white text-sm mt-3 max-w-lg mx-auto">
                <span className="font-semibold mr-1">{item.username}</span>
                {item.caption}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SavedItemViewer;
