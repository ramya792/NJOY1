import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Loader2, Users, ChevronRight } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

interface User {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
}

interface CreateGroupChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGroupChat: React.FC<CreateGroupChatProps> = ({ open, onOpenChange }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'select' | 'name'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Search all users in real-time based on search query
  useEffect(() => {
    if (!userProfile || !open) return;

    const searchUsers = async () => {
      setLoading(true);
      try {
        let fetchedUsers: User[] = [];

        if (searchQuery.trim()) {
          // Search users by username or displayName
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          
          const searchLower = searchQuery.toLowerCase();
          fetchedUsers = usersSnapshot.docs
            .filter(doc => {
              const data = doc.data();
              return doc.id !== userProfile.uid && (
                data.username?.toLowerCase().includes(searchLower) ||
                data.displayName?.toLowerCase().includes(searchLower)
              );
            })
            .map(doc => ({
              uid: doc.id,
              username: doc.data().username || '',
              displayName: doc.data().displayName || '',
              photoURL: doc.data().photoURL || '',
            }));
        } else {
          // When no search query, show followers + following
          // Get user's following list
          const followingQuery = query(
            collection(db, 'follows'),
            where('followerId', '==', userProfile.uid)
          );
          const followingSnapshot = await getDocs(followingQuery);
          const followingIds = followingSnapshot.docs.map(doc => doc.data().followingId);

          // Get user's followers list
          const followersQuery = query(
            collection(db, 'follows'),
            where('followingId', '==', userProfile.uid)
          );
          const followersSnapshot = await getDocs(followersQuery);
          const followerIds = followersSnapshot.docs.map(doc => doc.data().followerId);

          // Merge and deduplicate IDs (exclude self)
          const allIds = [...new Set([...followingIds, ...followerIds])].filter(
            id => id !== userProfile.uid
          );

          if (allIds.length > 0) {
            // Firestore 'in' supports max 10 per query, so batch
            for (let i = 0; i < allIds.length; i += 10) {
              const batch = allIds.slice(i, i + 10);
              const usersQuery = query(
                collection(db, 'users'),
                where('__name__', 'in', batch)
              );
              const usersSnapshot = await getDocs(usersQuery);
              usersSnapshot.docs.forEach(doc => {
                fetchedUsers.push({
                  uid: doc.id,
                  username: doc.data().username || '',
                  displayName: doc.data().displayName || '',
                  photoURL: doc.data().photoURL || '',
                });
              });
            }
          }
        }

        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    // Debounce search to avoid too many requests
    const timeoutId = setTimeout(searchUsers, searchQuery ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [userProfile, open, searchQuery, toast]);

  const filteredUsers = users;

  const toggleUser = (user: User) => {
    if (selectedUsers.find(u => u.uid === user.uid)) {
      setSelectedUsers(selectedUsers.filter(u => u.uid !== user.uid));
    } else {
      if (selectedUsers.length >= 31) { // Max 32 participants including creator
        toast({
          title: 'Maximum Reached',
          description: 'You can add up to 31 people to a group',
        });
        return;
      }
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleNext = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Select Members',
        description: 'Please select at least one person for the group',
      });
      return;
    }
    setStep('name');
  };

  const handleCreateGroup = async () => {
    if (!userProfile) return;
    
    if (!groupName.trim()) {
      toast({
        title: 'Group Name Required',
        description: 'Please enter a name for the group',
      });
      return;
    }

    setCreating(true);
    try {
      // Create group conversation
      const participants = [userProfile.uid, ...selectedUsers.map(u => u.uid)];
      const participantNames: { [key: string]: string } = {
        [userProfile.uid]: userProfile.username,
      };
      const participantPhotos: { [key: string]: string } = {
        [userProfile.uid]: userProfile.photoURL || '',
      };

      selectedUsers.forEach(user => {
        participantNames[user.uid] = user.username;
        participantPhotos[user.uid] = user.photoURL;
      });

      const groupData = {
        participants,
        participantNames,
        participantPhotos,
        groupName: groupName.trim(),
        groupPhoto: '', // Can add group photo upload later
        isGroup: true,
        createdBy: userProfile.uid,
        createdAt: serverTimestamp(),
        lastMessage: `${userProfile.username} created the group`,
        lastMessageTime: serverTimestamp(),
        unreadBy: participants.filter(p => p !== userProfile.uid),
        admins: [userProfile.uid], // Creator is admin
      };

      const groupRef = await addDoc(collection(db, 'conversations'), groupData);

      // Add system message
      await addDoc(collection(db, 'conversations', groupRef.id, 'messages'), {
        senderId: 'system',
        text: `${userProfile.username} created the group "${groupName.trim()}"`,
        createdAt: serverTimestamp(),
        type: 'system',
      });

      toast({
        title: 'Group Created',
        description: `${groupName.trim()} has been created successfully`,
      });

      onOpenChange(false);
      navigate(`/chat/${groupRef.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedUsers([]);
    setGroupName('');
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        {step === 'select' ? (
          <>
            <DialogHeader className="px-4 pt-4 pb-3 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle>New Group</DialogTitle>
                <Button
                  onClick={handleNext}
                  disabled={selectedUsers.length === 0}
                  size="sm"
                  className="h-8 px-3"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </DialogHeader>

            {/* Search */}
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9 h-9 rounded-full bg-secondary border-0"
                />
              </div>
            </div>

            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="px-4 py-2 border-b bg-secondary/30">
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <motion.div
                      key={user.uid}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {user.username}
                      <button
                        onClick={() => toggleUser(user)}
                        className="hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedUsers.length} selected
                </p>
              </div>
            )}

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No users found' : 'No followers or following yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map(user => {
                    const isSelected = selectedUsers.find(u => u.uid === user.uid);
                    return (
                      <button
                        key={user.uid}
                        onClick={() => toggleUser(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                              {user.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{user.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.displayName}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-4 pt-4 pb-3 border-b">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('select')}
                  className="p-1 hover:bg-secondary rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
                <DialogTitle>Name Your Group</DialogTitle>
              </div>
            </DialogHeader>

            <div className="flex-1 p-4 space-y-4">
              {/* Group Icon Placeholder */}
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Users className="w-12 h-12 text-primary" />
                </div>
              </div>

              {/* Group Name Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Group Name</label>
                <Input
                  autoFocus
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  maxLength={50}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {groupName.length}/50 characters
                </p>
              </div>

              {/* Members Preview */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Members ({selectedUsers.length + 1})
                </label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {/* Creator */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                      {userProfile?.photoURL ? (
                        <img
                          src={userProfile.photoURL}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-semibold">
                          {userProfile?.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm">
                      {userProfile?.username} <span className="text-muted-foreground">(You)</span>
                    </span>
                  </div>
                  {/* Selected Members */}
                  {selectedUsers.map(user => (
                    <div key={user.uid} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-semibold">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm">{user.username}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateGroup}
                disabled={creating || !groupName.trim()}
                className="w-full h-10"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Create Group
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupChat;
