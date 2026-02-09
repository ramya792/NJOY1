import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserMinus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface RestrictedUser {
  uid: string;
  username: string;
  photoURL: string;
}

const RestrictedAccounts: React.FC = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restrictedUsers, setRestrictedUsers] = useState<RestrictedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unrestricting, setUnrestricting] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchRestrictedUsers = async () => {
      try {
        const restrictedIds = userProfile.restrictedUsers || [];
        const users: RestrictedUser[] = [];

        for (const uid of restrictedIds) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            users.push({
              uid,
              username: userDoc.data().username || 'Unknown',
              photoURL: userDoc.data().photoURL || '',
            });
          }
        }

        setRestrictedUsers(users);
      } catch (error) {
        console.error('Error fetching restricted users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestrictedUsers();
  }, [userProfile]);

  const handleUnrestrict = async (uid: string) => {
    if (!userProfile) return;
    setUnrestricting(uid);

    try {
      const newRestrictedList = (userProfile.restrictedUsers || []).filter((id: string) => id !== uid);
      await updateUserProfile({ restrictedUsers: newRestrictedList });
      setRestrictedUsers(prev => prev.filter(user => user.uid !== uid));
      toast({
        title: 'User unrestricted',
        description: 'Their comments will now be visible to everyone.',
      });
    } catch (error) {
      console.error('Error unrestricting user:', error);
      toast({
        title: 'Failed to unrestrict',
        variant: 'destructive',
      });
    } finally {
      setUnrestricting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate('/settings')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg ml-2">Restricted Accounts</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : restrictedUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <UserMinus className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-display font-semibold text-xl mb-2">No Restricted Accounts</h2>
            <p className="text-muted-foreground max-w-xs">
              When you restrict someone, their comments on your posts will only be visible to them. They won't know they're restricted.
            </p>
          </motion.div>
        ) : (
          <div className="divide-y divide-border">
            {restrictedUsers.map((user, index) => (
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
                  <p className="text-xs text-muted-foreground">Restricted</p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnrestrict(user.uid)}
                  disabled={unrestricting === user.uid}
                >
                  {unrestricting === user.uid ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Unrestrict'
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

export default RestrictedAccounts;
