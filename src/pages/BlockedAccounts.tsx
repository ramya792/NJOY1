import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserX, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface BlockedUser {
  uid: string;
  username: string;
  photoURL: string;
}

const BlockedAccounts: React.FC = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchBlockedUsers = async () => {
      try {
        const blockedIds = userProfile.blockedUsers || [];
        const users: BlockedUser[] = [];

        for (const uid of blockedIds) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            users.push({
              uid,
              username: userDoc.data().username || 'Unknown',
              photoURL: userDoc.data().photoURL || '',
            });
          }
        }

        setBlockedUsers(users);
      } catch (error) {
        console.error('Error fetching blocked users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [userProfile]);

  const handleUnblock = async (uid: string) => {
    if (!userProfile) return;
    setUnblocking(uid);

    try {
      const newBlockedList = (userProfile.blockedUsers || []).filter((id: string) => id !== uid);
      await updateUserProfile({ blockedUsers: newBlockedList });
      setBlockedUsers(prev => prev.filter(user => user.uid !== uid));
      toast({
        title: 'User unblocked',
        description: 'You can now see their content again.',
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: 'Failed to unblock',
        variant: 'destructive',
      });
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate('/settings')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg ml-2">Blocked Accounts</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <UserX className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-display font-semibold text-xl mb-2">No Blocked Accounts</h2>
            <p className="text-muted-foreground max-w-xs">
              When you block someone, they won't be able to find your profile, posts, or story.
            </p>
          </motion.div>
        ) : (
          <div className="divide-y divide-border">
            {blockedUsers.map((user, index) => (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-4"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{user.username}</p>
                  <p className="text-xs text-muted-foreground">Blocked</p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnblock(user.uid)}
                  disabled={unblocking === user.uid}
                >
                  {unblocking === user.uid ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Unblock'
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedAccounts;
