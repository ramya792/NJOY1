import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import FollowersModal from './FollowersModal';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  followers: string[];
  following: string[];
  postsCount: number;
}

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditClick: () => void;
  isOwnProfile?: boolean;
  onProfileUpdate?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  profile, 
  onEditClick, 
  isOwnProfile = true,
  onProfileUpdate
}) => {
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const lastTapRef = useRef(0);

  const handleAvatarTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap - show fullscreen
      if (localProfile.photoURL) {
        setShowFullPhoto(true);
      }
    }
    lastTapRef.current = now;
  }, [localProfile.photoURL]);

  // Deduplicate followers and following arrays
  const uniqueFollowers = [...new Set(localProfile.followers || [])];
  const uniqueFollowing = [...new Set(localProfile.following || [])];

  const refreshProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', profile.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setLocalProfile({ ...profile, ...data });
        onProfileUpdate?.();
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-start gap-6 mb-4">
          {/* Avatar */}
          <div 
            className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-secondary flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
            onClick={handleAvatarTap}
          >
            {localProfile.photoURL ? (
              <img
                src={localProfile.photoURL}
                alt={localProfile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                {localProfile.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="font-semibold">{localProfile.postsCount || 0}</p>
                <p className="text-sm text-muted-foreground">posts</p>
              </div>
              <div 
                className="text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => setShowFollowers(true)}
              >
                <p className="font-semibold">{uniqueFollowers.length}</p>
                <p className="text-sm text-muted-foreground">followers</p>
              </div>
              <div 
                className="text-center cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => setShowFollowing(true)}
              >
                <p className="font-semibold">{uniqueFollowing.length}</p>
                <p className="text-sm text-muted-foreground">following</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <p className="font-semibold text-sm">{localProfile.displayName || localProfile.username}</p>
          {localProfile.bio && (
            <p className="text-sm whitespace-pre-wrap">{localProfile.bio}</p>
          )}
        </div>

        {/* Edit Button */}
        {isOwnProfile && (
          <Button
            onClick={onEditClick}
            variant="secondary"
            className="w-full font-semibold"
          >
            Edit profile
          </Button>
        )}
      </div>

      {/* Fullscreen Photo Viewer */}
      {showFullPhoto && localProfile.photoURL && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setShowFullPhoto(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
            onClick={() => setShowFullPhoto(false)}
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={localProfile.photoURL}
            alt={localProfile.username}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <FollowersModal
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        userIds={uniqueFollowers}
        title="Followers"
        isOwnProfile={isOwnProfile}
        onUserRemoved={refreshProfile}
      />

      <FollowersModal
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        userIds={uniqueFollowing}
        title="Following"
        isOwnProfile={isOwnProfile}
        onUserRemoved={refreshProfile}
      />
    </>
  );
};

export default ProfileHeader;
