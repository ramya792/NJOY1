import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MoreVertical, UserX, Shield, Ban } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserInfo {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userIds: string[];
  title: string;
  isOwnProfile?: boolean;
  onUserRemoved?: () => void;
}

const FollowersModal: React.FC<FollowersModalProps> = ({ 
  isOpen, 
  onClose, 
  userIds, 
  title,
  isOwnProfile = false,
  onUserRemoved
}) => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userProfile, updateUserProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userIds || userIds.length === 0) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        // Deduplicate userIds to prevent showing same user multiple times
        const uniqueUserIds = [...new Set(userIds)];
        
        const userPromises = uniqueUserIds.map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              uid,
              username: data.username || 'Unknown',
              displayName: data.displayName || data.username || 'Unknown',
              photoURL: data.photoURL || '',
            };
          }
          return null;
        });

        const fetchedUsers = await Promise.all(userPromises);
        setUsers(fetchedUsers.filter((u): u is UserInfo => u !== null));
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, userIds]);

  const handleUserClick = (uid: string) => {
    onClose();
    navigate(`/user/${uid}`);
  };

  const handleRemoveFollower = async (uid: string) => {
    if (!userProfile) return;
    
    try {
      // Remove from my followers
      await updateDoc(doc(db, 'users', userProfile.uid), {
        followers: arrayRemove(uid)
      });
      // Remove me from their following
      await updateDoc(doc(db, 'users', uid), {
        following: arrayRemove(userProfile.uid)
      });
      
      setUsers(prev => prev.filter(u => u.uid !== uid));
      onUserRemoved?.();
      
      toast({
        title: 'Follower removed',
        description: 'They will no longer follow you.',
      });
    } catch (error) {
      console.error('Error removing follower:', error);
      toast({
        title: 'Error',
        description: 'Could not remove follower.',
        variant: 'destructive',
      });
    }
  };

  const handleUnfollow = async (uid: string) => {
    if (!userProfile) return;
    
    try {
      // Remove from my following
      await updateDoc(doc(db, 'users', userProfile.uid), {
        following: arrayRemove(uid)
      });
      // Remove me from their followers
      await updateDoc(doc(db, 'users', uid), {
        followers: arrayRemove(userProfile.uid)
      });
      
      setUsers(prev => prev.filter(u => u.uid !== uid));
      onUserRemoved?.();
      
      toast({
        title: 'Unfollowed',
        description: 'You are no longer following this user.',
      });
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast({
        title: 'Error',
        description: 'Could not unfollow user.',
        variant: 'destructive',
      });
    }
  };

  const handleBlockUser = async (uid: string, username: string) => {
    if (!userProfile) return;
    
    try {
      // Add to blocked list
      const newBlockedList = [...(userProfile.blockedUsers || []), uid];
      await updateUserProfile({ blockedUsers: newBlockedList });
      
      // Also unfollow and remove as follower
      await updateDoc(doc(db, 'users', userProfile.uid), {
        followers: arrayRemove(uid),
        following: arrayRemove(uid)
      });
      await updateDoc(doc(db, 'users', uid), {
        followers: arrayRemove(userProfile.uid),
        following: arrayRemove(userProfile.uid)
      });
      
      setUsers(prev => prev.filter(u => u.uid !== uid));
      onUserRemoved?.();
      
      toast({
        title: 'User blocked',
        description: `${username} has been blocked.`,
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'Could not block user.',
        variant: 'destructive',
      });
    }
  };

  const handleRestrictUser = async (uid: string, username: string) => {
    if (!userProfile) return;
    
    try {
      const isRestricted = userProfile.restrictedUsers?.includes(uid);
      const newRestrictedList = isRestricted
        ? (userProfile.restrictedUsers || []).filter(id => id !== uid)
        : [...(userProfile.restrictedUsers || []), uid];
      
      await updateUserProfile({ restrictedUsers: newRestrictedList });
      
      toast({
        title: isRestricted ? 'Restriction removed' : 'User restricted',
        description: isRestricted 
          ? `${username}'s interactions will be visible again.`
          : `${username}'s comments on your posts will only be visible to them.`,
      });
    } catch (error) {
      console.error('Error restricting user:', error);
      toast({
        title: 'Error',
        description: 'Could not update restriction.',
        variant: 'destructive',
      });
    }
  };

  const isFollowersList = title.toLowerCase() === 'followers';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No {title.toLowerCase()} yet</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => handleUserClick(user.uid)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL} alt={user.username} />
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.displayName}</p>
                    </div>
                  </div>
                  
                  {isOwnProfile && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isFollowersList ? (
                          <DropdownMenuItem onClick={() => handleRemoveFollower(user.uid)}>
                            <UserX className="w-4 h-4 mr-2" />
                            Remove follower
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleUnfollow(user.uid)}>
                            <UserX className="w-4 h-4 mr-2" />
                            Unfollow
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleRestrictUser(user.uid, user.username)}>
                          <Shield className="w-4 h-4 mr-2" />
                          {userProfile?.restrictedUsers?.includes(user.uid) ? 'Unrestrict' : 'Restrict'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleBlockUser(user.uid, user.username)}
                          className="text-destructive"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Block user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersModal;
