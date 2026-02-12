import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Image, Film, X, Loader2, Download, Lock, Sparkles, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import MediaEditor from '@/components/media/MediaEditor';

const CreatePost: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [song, setSong] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [postType, setPostType] = useState<'post' | 'reel'>('post');
  const [allowDownload, setAllowDownload] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState('none');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setMediaFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
    setAppliedFilter('none');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setCaption((prev) => prev + emojiData.emoji);
  };

  const handleSubmit = async () => {
    if (!mediaFile || !userProfile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(mediaFile, (progress) => {
        setUploadProgress(progress);
      });

      const collectionName = postType === 'reel' ? 'reels' : 'posts';

      // Create post/reel document
      const docData = {
        userId: userProfile.uid,
        username: userProfile.username,
        userPhoto: userProfile.photoURL || '',
        [postType === 'reel' ? 'videoUrl' : 'mediaUrl']: result.secure_url,
        mediaType: postType === 'reel' ? 'video' : mediaType,
        caption,
        likes: [],
        comments: 0,
        saves: [],
        allowDownload,
        createdAt: serverTimestamp(),
        ...(postType === 'reel' && { song }),
      };

      await addDoc(collection(db, collectionName), docData);

      // Update user's post count
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        postsCount: increment(1),
      });

      toast({
        title: 'Success!',
        description: `Your ${postType} has been shared.`,
      });

      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg">New Post</h1>
          <Button
            onClick={handleSubmit}
            disabled={!mediaFile || uploading}
            variant="ghost"
            className="text-primary font-semibold"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Share'}
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4">
        {/* Type Selector */}
        <Tabs value={postType} onValueChange={(v) => setPostType(v as 'post' | 'reel')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="post" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Post
            </TabsTrigger>
            <TabsTrigger value="reel" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Reel
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Media Selection */}
        {!mediaPreview ? (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors"
          >
            {postType === 'reel' ? (
              <Film className="w-16 h-16 text-muted-foreground" />
            ) : (
              <Image className="w-16 h-16 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="font-semibold">Tap to select {postType === 'reel' ? 'video' : 'photo or video'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {postType === 'reel' ? 'Videos up to 60 seconds' : 'JPG, PNG, or MP4'}
              </p>
            </div>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-xl overflow-hidden"
          >
            {mediaType === 'video' ? (
              <video
                src={mediaPreview}
                className="w-full aspect-square object-cover"
                controls
              />
            ) : (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-full aspect-square object-cover"
              />
            )}
            <button
              onClick={clearMedia}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowEditor(true)}
              className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium"
            >
              <Sparkles className="w-4 h-4" />
              {appliedFilter !== 'none' ? 'Edit Again' : 'Edit & Filters'}
            </button>
          </motion.div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={postType === 'reel' ? 'video/*' : 'image/*,video/*'}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Caption */}
        {mediaPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 space-y-4"
          >
            <div className="relative">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="resize-none min-h-[100px] pr-12 emoji-text"
              />
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute top-3 right-3 p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 z-50"
                  >
                    <EmojiPicker 
                      onEmojiClick={handleEmojiSelect}
                      theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                      width={300}
                      height={400}
                      previewConfig={{ showPreview: false }}
                      searchPlaceHolder="Search emoji..."
                      skinTonesDisabled
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {postType === 'reel' && (
              <Input
                value={song}
                onChange={(e) => setSong(e.target.value)}
                placeholder="Add a song name (optional)"
              />
            )}

            {/* Download Permission Toggle */}
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
              <div className="flex items-center gap-3">
                {allowDownload ? (
                  <Download className="w-5 h-5 text-primary" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="allow-download" className="font-medium text-sm cursor-pointer">
                    Allow Download
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {allowDownload 
                      ? 'Others can download this content' 
                      : 'Download disabled for privacy'
                    }
                  </p>
                </div>
              </div>
              <Switch
                id="allow-download"
                checked={allowDownload}
                onCheckedChange={setAllowDownload}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Media Editor */}
      {mediaFile && (
        <MediaEditor
          file={mediaFile}
          mediaType={mediaType}
          onSave={(editedFile, filter) => {
            setMediaFile(editedFile);
            setAppliedFilter(filter);
            const reader = new FileReader();
            reader.onload = (event) => {
              setMediaPreview(event.target?.result as string);
            };
            reader.readAsDataURL(editedFile);
            setShowEditor(false);
          }}
          onCancel={() => setShowEditor(false)}
          open={showEditor}
        />
      )}
    </div>
  );
};

export default CreatePost;
