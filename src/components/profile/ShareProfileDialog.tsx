import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, Loader2, Check, Link2, Share2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShareUser {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  conversationId?: string;
}

interface ShareProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profileUserId: string;
  profileUsername: string;
}

const ShareProfileDialog: React.FC<ShareProfileDialogProps> = ({
  isOpen,
  onClose,
  profileUserId,
  profileUsername,
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<ShareUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ShareUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  // Fetch following users and existing conversations
  useEffect(() => {
    if (!isOpen || !userProfile) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const userMap = new Map<string, ShareUser>();
        
        // Get conversations - without orderBy to avoid needing composite index
        try {
          const convsQuery = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', userProfile.uid)
          );
          const convsSnapshot = await getDocs(convsQuery);

          // Add conversation participants
          for (const convDoc of convsSnapshot.docs) {
            const data = convDoc.data();
            const otherId = data.participants.find((p: string) => p !== userProfile.uid);
            if (otherId && otherId !== profileUserId) {
              userMap.set(otherId, {
                uid: otherId,
                username: data.participantNames?.[otherId] || 'User',
                displayName: data.participantNames?.[otherId] || 'User',
                photoURL: data.participantPhotos?.[otherId] || '',
                conversationId: convDoc.id,
              });
            }
          }
        } catch (convError) {
          console.error('Error fetching conversations:', convError);
        }
        for (const convDoc of convsSnapshot.docs) {
          const data = convDoc.data();
          const otherId = data.participants.find((p: string) => p !== userProfile.uid);
          if (otherId && otherId !== profileUserId) {
            userMap.set(otherId, {
              uid: otherId,
              username: data.participantNames?.[otherId] || 'User',
              displayName: data.participantNames?.[otherId] || 'User',
              photoURL: data.participantPhotos?.[otherId] || '',
              conversationId: convDoc.id,
            });
          }
        }

        // Also add following users who may not have conversations yet
        const following = userProfile.following || [];
        for (const followedId of following) {
          if (!userMap.has(followedId) && followedId !== profileUserId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', followedId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userMap.set(followedId, {
                  uid: followedId,
                  username: userData.username || 'User',
                  displayName: userData.displayName || userData.username || 'User',
                  photoURL: userData.photoURL || '',
                });
              }
            } catch {
              // Skip users that can't be fetched
            }
          }
        }

        const allUsers = Array.from(userMap.values());
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    setSentTo(new Set());
    setSearchQuery('');
  }, [isOpen, userProfile, profileUserId]);

  // Filter users based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredUsers(
      users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, users]);

  const handleSendProfile = async (targetUser: ShareUser) => {
    if (!userProfile || sendingTo) return;

    setSendingTo(targetUser.uid);
    const shareUrl = `${window.location.origin}/user/${profileUserId}`;
    const messageText = `Check out @${profileUsername}'s profile: ${shareUrl}`;

    try {
      let convId = targetUser.conversationId;

      if (!convId) {
        // Check for existing conversation
        const existingQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', userProfile.uid)
        );
        const existingDocs = await getDocs(existingQuery);

        existingDocs.forEach((docSnap) => {
          if (docSnap.data().participants.includes(targetUser.uid)) {
            convId = docSnap.id;
          }
        });

        if (!convId) {
          // Create new conversation
          const convDoc = await addDoc(collection(db, 'conversations'), {
            participants: [userProfile.uid, targetUser.uid],
            participantNames: {
              [userProfile.uid]: userProfile.username,
              [targetUser.uid]: targetUser.username,
            },
            participantPhotos: {
              [userProfile.uid]: userProfile.photoURL || '',
              [targetUser.uid]: targetUser.photoURL || '',
            },
            lastMessage: messageText,
            lastMessageTime: serverTimestamp(),
            unreadBy: [targetUser.uid],
            createdAt: serverTimestamp(),
          });
          convId = convDoc.id;
        }
      }

      // Send the profile share message
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderId: userProfile.uid,
        text: messageText,
        createdAt: serverTimestamp(),
        seen: false,
      });

      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: `Shared a profile`,
        lastMessageTime: serverTimestamp(),
        unreadBy: [targetUser.uid],
      });

      setSentTo((prev) => new Set(prev).add(targetUser.uid));
      toast({ title: `Profile shared with @${targetUser.username}` });
    } catch (error) {
      console.error('Error sharing profile:', error);
      toast({ title: 'Failed to share profile', variant: 'destructive' });
    } finally {
      setSendingTo(null);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/user/${profileUserId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Profile link copied!' });
    } catch {
      // Fallback for mobile browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({ title: 'Profile link copied!' });
    }
  };

  const handleExternalShare = async () => {
    const shareUrl = `${window.location.origin}/user/${profileUserId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${profileUsername} on NJOY`,
          text: `Check out @${profileUsername}'s profile on NJOY!`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed silently
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[70vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Share Profile</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors mb-2"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-sm">Copy profile link</span>
            </button>

            {/* External Share */}
            <button
              onClick={handleExternalShare}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors mb-3"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-sm">Share to other apps</span>
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="pl-9 h-10 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* User List */}
          <ScrollArea className="flex-1 max-h-[calc(70vh-200px)]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {searchQuery ? 'No users found' : 'No contacts to share with'}
              </p>
            ) : (
              <div className="p-2">
                {filteredUsers.map((user) => {
                  const isSent = sentTo.has(user.uid);
                  const isSending = sendingTo === user.uid;

                  return (
                    <div
                      key={user.uid}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-11 w-11 flex-shrink-0">
                          <AvatarImage src={user.photoURL} alt={user.username} />
                          <AvatarFallback>
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isSent ? 'secondary' : 'default'}
                        disabled={isSending || isSent}
                        onClick={() => handleSendProfile(user)}
                        className="ml-2 min-w-[70px]"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSent ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Sent
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareProfileDialog;
