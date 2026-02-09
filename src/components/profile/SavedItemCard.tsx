import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SavedItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  comments: number;
  type: 'post' | 'reel';
}

interface SavedItemCardProps {
  item: SavedItem;
  index: number;
  onUnsave: (item: SavedItem) => void;
}

const SavedItemCard: React.FC<SavedItemCardProps> = ({ item, index, onUnsave }) => {
  const navigate = useNavigate();
  const [lastTap, setLastTap] = useState(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap - open the item
      if (item.type === 'reel') {
        navigate(`/reels?id=${item.id}`);
      } else {
        navigate(`/post/${item.id}`);
      }
    }
    setLastTap(now);
  };

  return (
    <motion.div
      key={`${item.type}-${item.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="aspect-square relative group cursor-pointer"
      onClick={handleTap}
    >
      {item.mediaType === 'video' ? (
        <video
          src={item.mediaUrl}
          className="w-full h-full object-cover"
          muted
        />
      ) : (
        <img
          src={item.mediaUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
      
      {/* Type indicator */}
      <div className="absolute top-2 right-2">
        {item.type === 'reel' && (
          <Film className="w-4 h-4 text-white drop-shadow-lg" />
        )}
      </div>
      
      {/* Overlay with unsave button */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <p className="text-white text-xs">Double-tap to open</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnsave(item);
          }}
          className="p-2 bg-destructive rounded-full"
        >
          <Trash2 className="w-4 h-4 text-white" />
        </button>
      </div>
    </motion.div>
  );
};

export default SavedItemCard;
