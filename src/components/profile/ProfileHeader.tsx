import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, UserPlus } from 'lucide-react';
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
  onShareClick?: () => void;
  isOwnProfile?: boolean;
  onProfileUpdate?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  profile, 
  onEditClick,
  onShareClick,
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
      <div className="max-w-lg mx-auto px-4 py-3">
        {/* Top row: Avatar + Stats side by side */}
        <div className="flex items-center gap-4 mb-3">
          {/* Avatar */}
          <div 
            className="w-[88px] h-[88px] rounded-full overflow-hidden bg-secondary flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
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

          {/* Stats row */}
          <div className="flex-1 flex items-center justify-evenly">
            <div className="text-center">
              <p className="font-bold text-base leading-tight">{localProfile.postsCount || 0}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">posts</p>
            </div>
            <button 
              className="text-center hover:opacity-70 transition-opacity"
              onClick={() => setShowFollowers(true)}
            >
              <p className="font-bold text-base leading-tight">{uniqueFollowers.length}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">followers</p>
            </button>
            <button 
              className="text-center hover:opacity-70 transition-opacity"
              onClick={() => setShowFollowing(true)}
            >
              <p className="font-bold text-base leading-tight">{uniqueFollowing.length}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">following</p>
            </button>
          </div>
        </div>

        {/* Bio section */}
        <div className="mb-3">
          <p className="font-semibold text-sm leading-tight">{localProfile.displayName || localProfile.username}</p>
          {localProfile.bio && (
            <p className="text-sm whitespace-pre-wrap mt-1 text-foreground/90 leading-tight">{localProfile.bio}</p>
          )}
        </div>

        {/* Action buttons - side by side like Instagram */}
        {isOwnProfile && (
          <div className="flex items-center gap-2">
            <Button
              onClick={onEditClick}
              variant="secondary"
              size="sm"
              className="flex-1 font-semibold h-8 text-sm px-3"
            >
              Edit profile
            </Button>
            <Button
              onClick={onShareClick}
              variant="secondary"
              size="sm"
              className="flex-1 font-semibold h-8 text-sm px-3"
            >
              Share profile
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
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
