import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {ArrowLeft, Archive, Loader2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface HiddenConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string;
  lastMessage: string;
  lastMessageTime: Date;
}

const HiddenChats: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hiddenConversations, setHiddenConversations] = useState<HiddenConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unhiding, setUnhiding] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchHiddenConversations = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userProfile.uid));
        const hiddenIds = userDoc.data()?.hiddenChats || [];
        const conversations: HiddenConversation[] = [];

        for (const conversationId of hiddenIds) {
          const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
          if (conversationDoc.exists()) {
            const data = conversationDoc.data();
            const otherParticipantId = data.participants.find(
              (p: string) => p !== userProfile.uid
            );

            conversations.push({
              id: conversationId,
              participantId: otherParticipantId,
              participantName: data.participantNames?.[otherParticipantId] || 'User',
              participantPhoto: data.participantPhotos?.[otherParticipantId] || '',
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
            });
          }
        }

        setHiddenConversations(conversations);
      } catch (error) {
        console.error('Error fetching hidden conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHiddenConversations();
  }, [userProfile]);

  const handleUnhide = async (conversationId: string) => {
    if (!userProfile) return;
    setUnhiding(conversationId);

    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        hiddenChats: arrayRemove(conversationId),
      });

      setHiddenConversations(prev => prev.filter(conv => conv.id !== conversationId));

      toast({
        title: 'Conversation unhidden',
        description: 'The conversation is now visible in your messages.',
      });
    } catch (error) {
      console.error('Error unhiding conversation:', error);
      toast({
        title: 'Failed to unhide',
        description: 'Could not unhide conversation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUnhiding(null);
    }
  };

  const handleViewChat = (conversationId: string) => {
    navigate(`/messages/${conversationId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate('/settings')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg ml-2">Hidden Chats</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : hiddenConversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Archive className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-display font-semibold text-xl mb-2">No Hidden Chats</h2>
            <p className="text-muted-foreground max-w-xs">
              Hidden conversations will appear here. You can unhide them anytime.
            </p>
          </motion.div>
        ) : (
          <div className="divide-y divide-border">
            {hiddenConversations.map((conversation, index) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-4"
              >
                <button
                  onClick={() => handleViewChat(conversation.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                    {conversation.participantPhoto ? (
                      <img
                        src={conversation.participantPhoto}
                        alt={conversation.participantName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-muted-foreground">
                        {conversation.participantName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{conversation.participantName}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(conversation.lastMessageTime, { addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                  </div>
                </button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnhide(conversation.id)}
                  disabled={unhiding === conversation.id}
                >
                  {unhiding === conversation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
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

export default HiddenChats;
