import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Play, Pause, Volume2, VolumeX, Maximize, X, Loader2, Music } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface VideoSong {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
}

const VideoSongs: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<VideoSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Sample video data - In production, this would come from an API
  const sampleVideos: VideoSong[] = [
    {
      id: '1',
      title: 'Summer Vibes',
      artist: 'Tropical Beats',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: '3:45',
    },
    {
      id: '2',
      title: 'Night City',
      artist: 'Urban Sounds',
      thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: '4:20',
    },
    {
      id: '3',
      title: 'Ocean Waves',
      artist: 'Nature Harmony',
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: '3:15',
    },
    {
      id: '4',
      title: 'Mountain Echo',
      artist: 'Acoustic Dreams',
      thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: '4:05',
    },
    {
      id: '5',
      title: 'Electronic Pulse',
      artist: 'DJ Synth',
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      duration: '3:30',
    },
    {
      id: '6',
      title: 'Jazz Nights',
      artist: 'Smooth Collective',
      thumbnail: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      duration: '5:10',
    },
  ];

  useEffect(() => {
    // Simulate initial load
    setVideos(sampleVideos);
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setVideos(sampleVideos);
      return;
    }

    setLoading(true);
    // Simulate search
    setTimeout(() => {
      const filtered = sampleVideos.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setVideos(filtered);
      setLoading(false);
    }, 500);
  };

  const handlePlayVideo = (video: VideoSong) => {
    setSelectedVideo(video);
    setIsPlaying(true);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    const videoElement = document.getElementById('video-player') as HTMLVideoElement;
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause();
      } else {
        videoElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const videoElement = document.getElementById('video-player') as HTMLVideoElement;
    if (videoElement) {
      videoElement.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    const videoElement = document.getElementById('video-player') as HTMLVideoElement;
    if (videoElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoElement.requestFullscreen();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-5xl mx-auto">
          <h1 className="font-display font-semibold text-lg flex items-center gap-2">
            <Music className="w-5 h-5" />
            Video Songs
          </h1>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3 max-w-5xl mx-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search video songs, artists..."
                className="pl-9 h-10 rounded-full bg-secondary border-0"
              />
            </div>
            <Button onClick={handleSearch} className="rounded-full px-6">
              Search
            </Button>
          </div>
        </div>
      </header>

      {/* Video Grid */}
      <div className="max-w-5xl mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Music className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No Videos Found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Try searching with different keywords
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group cursor-pointer"
                onClick={() => handlePlayVideo(video)}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary mb-2">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs text-white">
                    {video.duration}
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-1">{video.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{video.artist}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-4xl">
            {/* Close Button */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg">{selectedVideo.title}</h2>
                <p className="text-white/70 text-sm">{selectedVideo.artist}</p>
              </div>
              <button
                onClick={handleCloseVideo}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                id="video-player"
                src={selectedVideo.videoUrl}
                className="w-full h-full"
                autoPlay
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlayPause}
                      className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={toggleMute}
                      className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="w-8 h-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <Maximize className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VideoSongs;
