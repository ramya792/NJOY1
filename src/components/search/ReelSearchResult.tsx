import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

interface ReelSearchResultProps {
  reel: {
    videoUrl: string;
    caption: string;
    song?: string;
    likes: string[];
  };
  reelId: string;
  showType?: 'reel' | 'hashtag' | 'music';
}

const ReelSearchResult: React.FC<ReelSearchResultProps> = ({ reel, reelId, showType }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/reels?id=${reelId}`)}
      className="flex items-center gap-3 w-full p-3 hover:bg-secondary rounded-lg transition-colors"
    >
      <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
        <video
          src={reel.videoUrl}
          className="w-full h-full object-cover"
          muted
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="w-6 h-6 text-white fill-white" />
        </div>
      </div>
      <div className="text-left flex-1 min-w-0">
        <p className="text-sm truncate">{reel.caption || 'Reel'}</p>
        {reel.song && (
          <p className="text-xs text-muted-foreground truncate">🎵 {reel.song}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {reel.likes?.length || 0} likes
        </p>
      </div>
    </button>
  );
};

export default ReelSearchResult;
