import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Film, X, Loader2, Users, UserCheck, UsersRound } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface StoryUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

type StoryVisibility = 'followers' | 'following' | 'both';

const StoryUploadDialog: React.FC<StoryUploadDialogProps> = ({ open, onClose }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [visibility, setVisibility] = useState<StoryVisibility>('both');
  const [showVisibilityOptions, setShowVisibilityOptions] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; type: 'image' | 'video' } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setPendingFile({ file, type });
    setShowVisibilityOptions(true);
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
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

      toast({
        title: 'Story added!',
        description: `Your story is visible to ${visibility === 'both' ? 'followers and following' : visibility}.`,
      });

      setPendingFile(null);
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

  const openFilePicker = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleClose = () => {
    setPendingFile(null);
    setShowVisibilityOptions(false);
    setVisibility('both');
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl p-6 safe-bottom"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-semibold text-lg">
                {showVisibilityOptions ? 'Who can see your story?' : 'Add to your story'}
              </h3>
              <button onClick={handleClose} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploading ? (
              <div className="py-8 flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : showVisibilityOptions ? (
              <div className="space-y-6">
                <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as StoryVisibility)}>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                    <RadioGroupItem value="followers" id="followers" />
                    <Label htmlFor="followers" className="flex items-center gap-3 flex-1 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Followers only</p>
                        <p className="text-xs text-muted-foreground">Only people who follow you</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                    <RadioGroupItem value="following" id="following" />
                    <Label htmlFor="following" className="flex items-center gap-3 flex-1 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Following only</p>
                        <p className="text-xs text-muted-foreground">Only people you follow</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="flex items-center gap-3 flex-1 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UsersRound className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Everyone</p>
                        <p className="text-xs text-muted-foreground">Both followers and following</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowVisibilityOptions(false);
                      setPendingFile(null);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-secondary font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleUploadStory}
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium"
                  >
                    Share Story
                  </button>
                </div>
              </div>
            ) : (
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
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StoryUploadDialog;
