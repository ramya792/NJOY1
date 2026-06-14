import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Film, X, Loader2, Users, UserCheck, UsersRound, Music, Sparkles, ChevronLeft, ChevronRight, Type, Sticker, Wand2, AtSign, PenTool, Download, MoreHorizontal, Trash2, AlignLeft, Palette } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import MusicSelector from './MusicSelector';
import MediaEditor from '@/components/media/MediaEditor';
import type { MusicTrack } from '@/lib/musicData';
import type { StoryOverlay } from './StoryViewer';

interface StoryUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

type StoryVisibility = 'followers' | 'following' | 'both';

const StoryUploadDialog: React.FC<StoryUploadDialogProps> = ({ open, onClose }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [musicPosition, setMusicPosition] = useState({ x: 0, y: 0 });
  const [musicScale, setMusicScale] = useState(1);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [visibility, setVisibility] = useState<StoryVisibility>('both');
  const [showVisibilityOptions, setShowVisibilityOptions] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; type: 'image' | 'video' } | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState('none');
  
  // Overlay state
  const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
  const [addingOverlayType, setAddingOverlayType] = useState<'text' | 'mention' | 'sticker' | null>(null);
  const [overlayInputText, setOverlayInputText] = useState('');
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [overlayDistances, setOverlayDistances] = useState<Record<string, number>>({});
  const [activeToolbarTab, setActiveToolbarTab] = useState<'fonts' | 'colors'>('fonts');
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [textStyle, setTextStyle] = useState({
    fontFamily: 'font-sans',
    color: 'text-white',
    hasBackground: false
  });

  // Handle visibility change to pause media
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (previewVideoRef.current) previewVideoRef.current.pause();
        if (previewAudioRef.current) previewAudioRef.current.pause();
      } else {
        if (previewVideoRef.current) previewVideoRef.current.play().catch(() => {});
        if (previewAudioRef.current) previewAudioRef.current.play().catch(() => {});
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch users for mention autocomplete
  React.useEffect(() => {
    if (addingOverlayType !== 'mention' || !overlayInputText) {
      setSuggestedUsers([]);
      return;
    }

    const fetchUsers = async () => {
      const searchTerm = overlayInputText.replace('@', '').toLowerCase();
      if (!searchTerm) {
        setSuggestedUsers([]);
        return;
      }

      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const matches = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((u: any) => u.username.toLowerCase().includes(searchTerm) || u.displayName?.toLowerCase().includes(searchTerm))
          .slice(0, 5);
        setSuggestedUsers(matches);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const debounceId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounceId);
  }, [addingOverlayType, overlayInputText]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setPendingFile({ file, type });
    // Don't go directly to visibility options, let user add music first
  };

  const handleUploadStory = async () => {
    if (!pendingFile || !userProfile) return;

    setUploading(true);
    setUploadProgress(0);
    setShowVisibilityOptions(false);

    try {
      const result = await uploadToCloudinary(pendingFile.file, (progress) => {
        setUploadProgress(progress);
      });

      // Create story document with visibility settings
      await addDoc(collection(db, 'stories'), {
        userId: userProfile.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL || '',
        mediaUrl: result.secure_url,
        mediaType: pendingFile.type,
        viewedBy: [],
        visibility, // 'followers', 'following', or 'both'
        music: selectedMusic ? {
          title: selectedMusic.title,
          artist: selectedMusic.artist,
          previewUrl: selectedMusic.previewUrl,
          startTime: selectedMusic.startTime,
          endTime: selectedMusic.endTime,
          position: musicPosition,
          scale: musicScale
        } : null,
        overlays,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

      toast({
        title: 'Story added!',
        description: `Your story is visible to ${visibility === 'both' ? 'followers and following' : visibility}.`,
      });

      setPendingFile(null);
      setSelectedMusic(null);
      setVisibility('both');
      onClose();
    } catch (error) {
      console.error('Error uploading story:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload your story. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = () => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = pendingFile.file.name;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Saved!', description: 'Media downloaded successfully.' });
    }
  };

  const openFilePicker = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleAddOverlay = (explicitText?: string | React.MouseEvent | React.KeyboardEvent) => {
    const textToAdd = typeof explicitText === 'string' ? explicitText : overlayInputText;
    if (textToAdd.trim()) {
      setOverlays(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: addingOverlayType === 'mention' ? 'mention' : 'text',
          content: addingOverlayType === 'mention' && !textToAdd.startsWith('@') 
            ? `@${textToAdd}` 
            : textToAdd,
          position: { x: 0, y: 0 },
          scale: 1,
          fontFamily: textStyle.fontFamily,
          color: textStyle.color,
          hasBackground: textStyle.hasBackground
        }
      ]);
    }
    setAddingOverlayType(null);
    setOverlayInputText('');
  };

  const handleAddSticker = (emoji: string) => {
    setOverlays(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'sticker',
        content: emoji,
        position: { x: 0, y: 0 },
        scale: 2
      }
    ]);
    setAddingOverlayType(null);
  };

  const handleClose = () => {
    setPendingFile(null);
    setShowVisibilityOptions(false);
    setShowMusicSelector(false);
    setShowEditor(false);
    setSelectedMusic(null);
    setAppliedFilter('none');
    setMusicPosition({ x: 0, y: 0 });
    setMusicScale(1);
    setOverlays([]);
    setAddingOverlayType(null);
    setOverlayInputText('');
    setVisibility('both');
    onClose();
  };

  return (
    <AnimatePresence>
      {/* Backdrop for the initial picker bottom sheet */}
      {open && !pendingFile && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/60 z-[60]"
        />
      )}

      {/* Initial Picker Bottom Sheet */}
      {open && !pendingFile && !showVisibilityOptions && (
        <motion.div
          key="picker"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-0 left-0 right-0 z-[60] bg-card rounded-t-2xl p-6 safe-bottom"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-lg">Add to your story</h3>
            <button onClick={handleClose} className="p-1"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => openFilePicker('image/*')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary hover:bg-accent transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <span className="font-medium text-sm">Photo</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => openFilePicker('video/*')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary hover:bg-accent transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Film className="w-7 h-7 text-primary" />
              </div>
              <span className="font-medium text-sm">Video</span>
            </motion.button>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        </motion.div>
      )}

      {/* Full Screen Editor */}
      {open && pendingFile && (
        <motion.div
          key="editor"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden"
        >
          {/* Background Media */}
          <div ref={previewRef} className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
            {pendingFile.type === 'image' ? (
              <img 
                src={URL.createObjectURL(pendingFile.file)} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
            ) : (
              <video 
                ref={previewVideoRef}
                src={URL.createObjectURL(pendingFile.file)} 
                className="w-full h-full object-contain"
                controls={false}
                autoPlay
                loop
                muted
              />
            )}

            {/* Audio Preview */}
            {selectedMusic && (
              <audio ref={previewAudioRef} src={selectedMusic.previewUrl} autoPlay loop />
            )}

            {/* Draggable Music Sticker */}
            {selectedMusic && (
              <motion.div
                drag
                dragConstraints={previewRef}
                dragMomentum={false}
                onTouchStart={(e) => {
                  if (e.touches.length === 2) {
                    const dist = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                    );
                    setInitialDistance(dist);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2 && initialDistance !== null) {
                    e.stopPropagation();
                    const dist = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                    );
                    const scaleChange = dist / initialDistance;
                    setMusicScale(prev => Math.min(Math.max(0.5, prev * scaleChange), 3));
                    setInitialDistance(dist);
                  }
                }}
                onTouchEnd={() => setInitialDistance(null)}
                onWheel={(e) => {
                  e.stopPropagation();
                  setMusicScale(prev => Math.min(Math.max(0.5, prev - e.deltaY * 0.002), 3));
                }}
                onDragEnd={(_, info) => {
                  setMusicPosition(prev => ({
                    x: prev.x + info.offset.x,
                    y: prev.y + info.offset.y
                  }));
                }}
                initial={{ x: musicPosition.x, y: musicPosition.y, scale: musicScale }}
                style={{ x: musicPosition.x, y: musicPosition.y, scale: musicScale }}
                className="absolute z-30 flex flex-col items-center cursor-move"
              >
                <div className="relative w-32 h-32 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-3 border border-white/20">
                  <img 
                    src={'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80'} 
                    alt="Album Art" 
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2 pointer-events-none">
                     {/* Bouncing Bars */}
                     <div className="flex gap-1 items-end justify-center mb-2 h-6">
                       <div className="w-1 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '0ms' }} />
                       <div className="w-1 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '150ms' }} />
                       <div className="w-1 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '300ms' }} />
                       <div className="w-1 bg-white rounded-full animate-[music-bounce_1s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '450ms' }} />
                     </div>
                     <h3 className="font-serif text-white text-center drop-shadow-md text-[16px] truncate w-full">
                       {selectedMusic.title || 'Unknown Title'}
                     </h3>
                  </div>
                </div>
                <p className="font-serif text-white/95 drop-shadow-lg text-sm text-center truncate w-full max-w-[160px] pointer-events-none">{selectedMusic.title}</p>
                <p className="font-serif text-white/70 text-xs drop-shadow-md text-center truncate w-full max-w-[160px] pointer-events-none">{selectedMusic.artist}</p>
              </motion.div>
            )}

            {/* Draggable Overlays */}
            {overlays.map((overlay) => (
              <motion.div
                key={overlay.id}
                drag
                dragConstraints={previewRef}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  setOverlays(prev => prev.map(o => 
                    o.id === overlay.id 
                      ? { ...o, position: { x: o.position.x + info.offset.x, y: o.position.y + info.offset.y } } 
                      : o
                  ));
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 2) {
                    setActiveOverlayId(overlay.id);
                    const dist = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                    );
                    setOverlayDistances(prev => ({ ...prev, [overlay.id]: dist }));
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2 && activeOverlayId === overlay.id) {
                    e.stopPropagation();
                    const dist = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                    );
                    const initialDist = overlayDistances[overlay.id];
                    if (initialDist) {
                      const scaleChange = dist / initialDist;
                      setOverlays(prev => prev.map(o => 
                        o.id === overlay.id ? { ...o, scale: Math.min(Math.max(0.5, o.scale * scaleChange), 5) } : o
                      ));
                      setOverlayDistances(prev => ({ ...prev, [overlay.id]: dist }));
                    }
                  }
                }}
                onTouchEnd={() => {
                  if (activeOverlayId === overlay.id) {
                    setActiveOverlayId(null);
                  }
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                  setOverlays(prev => prev.map(o => 
                    o.id === overlay.id ? { ...o, scale: Math.min(Math.max(0.5, o.scale - e.deltaY * 0.002), 5) } : o
                  ));
                }}
                initial={{ x: overlay.position.x, y: overlay.position.y, scale: overlay.scale }}
                style={{ x: overlay.position.x, y: overlay.position.y, scale: overlay.scale }}
                className="absolute z-30 cursor-move drop-shadow-xl"
              >
                <div 
                  className="relative group" 
                  onClick={(e) => { e.stopPropagation(); setActiveOverlayId(overlay.id); }}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverlays(prev => prev.filter(o => o.id !== overlay.id));
                      setActiveOverlayId(null);
                    }}
                    className={`absolute -top-4 -right-4 w-8 h-8 bg-black/60 backdrop-blur text-white rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:bg-red-500/80 transition-all z-50 pointer-events-auto ${activeOverlayId === overlay.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 md:group-hover:opacity-100 md:group-hover:scale-100'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {overlay.type === 'text' && (
                    <div 
                      className={`font-bold px-4 py-2 rounded-xl whitespace-pre-wrap text-center ${overlay.fontFamily || 'font-sans'} ${overlay.hasBackground ? (overlay.color === 'text-black' ? 'bg-white text-black' : 'bg-black text-white') : overlay.color || 'text-white'}`} 
                      style={{ textShadow: overlay.hasBackground ? 'none' : '0 2px 10px rgba(0,0,0,0.8)' }}
                    >
                      {overlay.content}
                    </div>
                  )}
                  {overlay.type === 'mention' && (
                    <div 
                      className={`font-bold px-4 py-2 rounded-xl whitespace-pre-wrap text-center ${overlay.fontFamily || 'font-sans'} ${overlay.hasBackground ? (overlay.color === 'text-black' ? 'bg-white text-black' : 'bg-black text-white') : overlay.color || 'text-white'}`} 
                      style={{ textShadow: overlay.hasBackground ? 'none' : '0 2px 10px rgba(0,0,0,0.8)' }}
                    >
                      {overlay.content}
                    </div>
                  )}
                  {overlay.type === 'sticker' && (
                    <div className="text-6xl drop-shadow-2xl">{overlay.content}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 pt-10 z-20 flex justify-between items-start pointer-events-none">
            <button 
              onClick={() => {
                setPendingFile(null);
                setSelectedMusic(null);
                setOverlays([]);
              }} 
              className="p-2.5 bg-black/40 rounded-full backdrop-blur-md pointer-events-auto hover:bg-black/60 transition-colors border border-white/10"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            {/* Temporary Title/Suggested Audio Pill placeholder */}
            {selectedMusic ? (
              <div className="bg-black/80 backdrop-blur-md rounded-full pl-2 pr-4 py-1.5 flex items-center gap-2 pointer-events-auto border border-white/10 shadow-xl">
                <div className="w-6 h-6 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80" alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-white text-xs font-semibold">{selectedMusic.title}</span>
                <button onClick={() => setSelectedMusic(null)} className="ml-1 p-0.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <div className="w-6" /> // spacer
            )}
          </div>

          {/* Right Sidebar Tools */}
          {!showVisibilityOptions && !uploading && (
            <div className="absolute top-20 right-4 z-20 flex flex-col gap-4 items-end pointer-events-none safe-right">
              {[
                { icon: Type, label: 'Text', textIcon: 'Aa', onClick: () => setAddingOverlayType('text') },
                { icon: Sticker, label: 'Stickers', onClick: () => setAddingOverlayType('sticker') },
                { icon: Music, label: 'Music', onClick: () => setShowMusicSelector(true) },
                { icon: Sparkles, label: 'Effects', onClick: () => setShowEditor(true) },
                { icon: AtSign, label: 'Mention', onClick: () => setAddingOverlayType('mention') },
                { icon: Download, label: 'Save', onClick: handleDownload },
              ].map((tool, i) => (
                <div key={i} className="flex items-center gap-3 pointer-events-auto cursor-pointer group" onClick={tool.onClick || (() => toast({ title: 'Coming soon', description: `${tool.label} feature is in development!` }))}>
                  <span className="text-white text-[13px] font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-90 group-hover:opacity-100 transition-opacity">
                    {tool.label}
                  </span>
                  <div className="w-[42px] h-[42px] rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors shadow-lg">
                    {tool.textIcon ? <span className="font-semibold text-lg">{tool.textIcon}</span> : <tool.icon className="w-[22px] h-[22px]" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Bar / Visibility Options Overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none pb-6 px-6 pt-20 bg-gradient-to-t from-black/60 to-transparent">
            {uploading ? (
              <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10 pointer-events-auto shadow-2xl mb-4">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-white" />
                  <div className="w-full">
                    <div className="flex justify-between text-white/80 text-sm mb-2">
                      <span>Uploading...</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : showVisibilityOptions ? (
              <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 border border-white/10 pointer-events-auto shadow-2xl shadow-black mb-4">
                <h3 className="font-display font-semibold text-white text-lg mb-6">Who can see your story?</h3>
                <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as StoryVisibility)} className="space-y-2 mb-6">
                  {[
                    { id: 'followers', icon: Users, title: 'Followers only', desc: 'Only people who follow you' },
                    { id: 'following', icon: UserCheck, title: 'Following only', desc: 'Only people you follow' },
                    { id: 'both', icon: UsersRound, title: 'Everyone', desc: 'Both followers and following' },
                  ].map((opt) => (
                    <div key={opt.id} className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                      <RadioGroupItem value={opt.id} id={opt.id} className="border-white/50 text-white" />
                      <Label htmlFor={opt.id} className="flex items-center gap-3 flex-1 cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                          <opt.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{opt.title}</p>
                          <p className="text-xs text-white/60">{opt.desc}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                <div className="flex gap-3">
                  <button onClick={() => setShowVisibilityOptions(false)} className="flex-1 py-3.5 px-4 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">
                    Back
                  </button>
                  <button onClick={handleUploadStory} className="flex-1 py-3.5 px-4 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    Share Story
                  </button>
                </div>
              </div>
            ) : !addingOverlayType && !showMusicSelector && !showEditor ? (
              <div className="flex justify-end pointer-events-auto">
                <button 
                  onClick={() => setShowVisibilityOptions(true)} 
                  className="bg-white text-black px-4 py-2 rounded-full font-bold flex items-center gap-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:scale-105 transition-transform text-sm"
                >
                  Share <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}

      {/* Overlay Inputs */}
      {open && pendingFile && addingOverlayType && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="absolute top-10 right-4">
            <button onClick={() => setAddingOverlayType(null)} className="text-white p-2 bg-white/20 rounded-full hover:bg-white/30">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {(addingOverlayType === 'text' || addingOverlayType === 'mention') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="absolute top-10 right-16 pointer-events-auto">
                <button onClick={handleAddOverlay} className="text-white font-bold text-lg px-4 py-2 drop-shadow-md hover:text-gray-300 transition-colors">
                  Done
                </button>
              </div>

              <input 
                autoFocus
                type="text"
                value={overlayInputText}
                onChange={(e) => setOverlayInputText(e.target.value)}
                placeholder={addingOverlayType === 'mention' ? "Type username..." : "Type something..."}
                className={`w-full max-w-sm bg-transparent outline-none text-center font-bold pointer-events-auto ${addingOverlayType === 'mention' ? 'text-3xl text-pink-400' : `text-4xl ${textStyle.fontFamily} ${textStyle.hasBackground ? (textStyle.color === 'text-black' ? 'bg-white text-black' : 'bg-black text-white') : textStyle.color || 'text-white'} rounded-xl py-2 px-4`}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddOverlay();
                }}
              />

              {addingOverlayType === 'mention' && suggestedUsers.length > 0 && (
                <div className="w-full max-w-sm mt-4 bg-zinc-900/90 backdrop-blur-md rounded-2xl overflow-hidden pointer-events-auto shadow-2xl border border-white/10">
                  {suggestedUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        handleAddOverlay(`@${u.username}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                    >
                      <img src={u.photoURL || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex flex-col items-start">
                        <span className="text-white font-bold text-sm">{u.username}</span>
                        <span className="text-white/60 text-xs">{u.displayName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {addingOverlayType === 'text' && (
                <div className="absolute bottom-12 left-0 right-0 flex flex-col gap-4 pointer-events-auto">
                  <div className="flex justify-center gap-4 px-4">
                    <button onClick={() => setActiveToolbarTab('fonts')} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${activeToolbarTab === 'fonts' ? 'bg-white text-black border-transparent' : 'bg-black/40 text-white border-white/20 hover:bg-black/60'}`}>
                      <span className="font-bold">Aa</span>
                    </button>
                    <button onClick={() => setActiveToolbarTab('colors')} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${activeToolbarTab === 'colors' ? 'bg-white text-black border-transparent' : 'bg-black/40 text-white border-white/20 hover:bg-black/60'}`}>
                      <Palette className="w-5 h-5" />
                    </button>
                    <button onClick={() => setTextStyle(prev => ({ ...prev, hasBackground: !prev.hasBackground }))} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${textStyle.hasBackground ? 'bg-white text-black border-transparent' : 'bg-black/40 text-white border-white/20 hover:bg-black/60'}`}>
                      <div className="w-5 h-5 border-2 border-current rounded font-bold text-[10px] flex items-center justify-center">A</div>
                    </button>
                  </div>
                  
                  {/* Selector Rows */}
                  <div className="h-12 flex items-center">
                    {activeToolbarTab === 'fonts' ? (
                      <div className="w-full overflow-x-auto flex items-center gap-2 px-4 no-scrollbar pb-1">
                        {[
                          { id: 'font-sans font-bold', label: 'Modern' },
                          { id: 'font-serif font-bold', label: 'Classic' },
                          { id: 'font-[cursive] italic', label: 'Signature' },
                          { id: 'font-mono font-medium', label: 'Editor' },
                          { id: 'font-sans font-black uppercase tracking-tighter', label: 'Poster' },
                          { id: 'font-sans font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]', label: 'Bubble' },
                          { id: 'font-sans font-black tracking-widest', label: 'Deco' },
                          { id: 'font-sans font-bold tracking-tight scale-y-125', label: 'Squeeze' },
                          { id: 'font-sans italic font-bold drop-shadow-md', label: 'Italic' },
                          { id: 'font-serif italic tracking-widest', label: 'Elegant' },
                          { id: 'font-mono uppercase tracking-widest drop-shadow-lg', label: 'Retro' }
                        ].map((font) => (
                          <button
                            key={font.id}
                            onClick={() => setTextStyle(prev => ({ ...prev, fontFamily: font.id }))}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors border shrink-0 ${
                              textStyle.fontFamily === font.id || (textStyle.fontFamily === 'font-sans' && font.id === 'font-sans font-bold') 
                                ? 'bg-white text-black border-transparent' 
                                : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
                            }`}
                          >
                            <span className={font.id}>{font.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full overflow-x-auto flex items-center gap-3 px-4 no-scrollbar pb-1">
                        {[
                          { id: 'text-white', hex: '#ffffff' },
                          { id: 'text-black', hex: '#000000' },
                          { id: 'text-red-500', hex: '#ef4444' },
                          { id: 'text-orange-500', hex: '#f97316' },
                          { id: 'text-yellow-400', hex: '#facc15' },
                          { id: 'text-green-500', hex: '#22c55e' },
                          { id: 'text-blue-500', hex: '#3b82f6' },
                          { id: 'text-indigo-500', hex: '#6366f1' },
                          { id: 'text-purple-500', hex: '#a855f7' },
                          { id: 'text-pink-500', hex: '#ec4899' },
                          { id: 'text-gray-500', hex: '#6b7280' },
                        ].map(color => (
                          <button
                            key={color.id}
                            onClick={() => setTextStyle(prev => ({ ...prev, color: color.id }))}
                            className={`w-8 h-8 rounded-full border-2 shrink-0 ${textStyle.color === color.id ? 'border-white scale-110' : 'border-transparent hover:scale-105 shadow-md'} transition-all`}
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {addingOverlayType === 'sticker' && (
            <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm max-h-[60vh] overflow-y-auto">
              <h3 className="text-white font-bold text-xl mb-4 text-center">Stickers</h3>
              <div className="grid grid-cols-4 gap-4">
                {['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😋', '😜', '🤪', '😎', '🤩', '🥳', '😏', '😒', '😔', '🥺', '😭', '😤', '😡', '🤯', '😳', '😱', '😨', '🥶', '🥵', '😴', '🤤', '🤒', '🤢', '🤮', '🤧', '😇', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓', '😈', '👿', '👹', '👺', '👻', '💀', '👽', '👾', '🤖', '💩', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🧠', '🫀', '🫁', '🦷', '👀', '👁', '👅', '👄', '💋', '🩸', '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿', '🦔', '🦇', '熊', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊', '🦅', '🦆', '🦢', '🦉', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🐞', '🦗', '🕷', '🕸', '🦂', '🦟', '🦠', '💐', '🌸', '💮', '🏵', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊', '🥢', '🍽', '🍴', '🥄', '🔪', '🏺'].map((emoji) => (
                  <button 
                    key={emoji} 
                    onClick={() => handleAddSticker(emoji)}
                    className="text-4xl hover:scale-110 transition-transform flex items-center justify-center h-16 bg-white/5 rounded-xl hover:bg-white/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Music Selector */}
      <MusicSelector open={showMusicSelector} onClose={() => setShowMusicSelector(false)} onSelect={setSelectedMusic} selectedTrack={selectedMusic} />

      {/* Media Editor */}
      {pendingFile && (
        <MediaEditor
          file={pendingFile.file}
          mediaType={pendingFile.type}
          onSave={(editedFile, filter) => {
            setPendingFile({ file: editedFile, type: pendingFile.type });
            setAppliedFilter(filter);
            setShowEditor(false);
          }}
          onCancel={() => setShowEditor(false)}
          open={showEditor}
        />
      )}
    </AnimatePresence>
  );
};

export default StoryUploadDialog;
