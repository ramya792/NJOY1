import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, MessageCircle, Search, X, Loader2, UserPlus, PenSquare, Users, Bot, CheckCircle2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, getDocs, limit, deleteDoc, doc, writeBatch, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MessageListItem from '@/components/messages/MessageListItem';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string;
  lastMessage: string;
  lastMessageTime: Date;
  unread: boolean;
}

interface UserResult {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
}

const Messages: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hiddenChats, setHiddenChats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  
  // Scroll position memory
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);

  // Scroll position memory - restore on mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('njoy_messages_scroll');
    if (savedScroll && scrollContainerRef.current && !loading) {
      isRestoringScroll.current = true;
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = parseInt(savedScroll);
          setTimeout(() => {
            isRestoringScroll.current = false;
          }, 100);
        }
      });
    }
  }, [loading]);

  // Save scroll position before unmount
  useEffect(() => {
    return () => {
      if (scrollContainerRef.current && !isRestoringScroll.current) {
        sessionStorage.setItem('njoy_messages_scroll', scrollContainerRef.current.scrollTop.toString());
      }
    };
  }, []);

  // Fetch hidden chats from user profile
  useEffect(() => {
    if (!userProfile) return;
    
    const fetchHiddenChats = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userProfile.uid));
        if (userDoc.exists()) {
          setHiddenChats(userDoc.data().hiddenChats || []);
        }
      } catch (error) {
        console.error('Error fetching hidden chats:', error);
      }
    };
    
    fetchHiddenChats();
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userProfile.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      const fetchedConversations = snapshot.docs.map((doc) => {
        const data = doc.data();
        const otherParticipantId = data.participants.find(
          (p: string) => p !== userProfile.uid
        );
        
        return {
          id: doc.id,
          participantId: otherParticipantId,
          participantName: data.participantNames?.[otherParticipantId] || 'User',
          participantPhoto: data.participantPhotos?.[otherParticipantId] || '',
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
          unread: data.unreadBy?.includes(userProfile.uid) || false,
        };
      }) as Conversation[];
      
      setConversations(fetchedConversations);
      setLoading(false);
    });

    // Fetch pending requests count
    const fetchRequestsCount = async () => {
      try {
        const requestsQuery = query(
          collection(db, 'notifications'),
          where('toUserId', '==', userProfile.uid),
          where('type', '==', 'follow_request')
        );
        const snapshot = await getDocs(requestsQuery);
        setPendingRequestsCount(snapshot.size);
      } catch (error) {
        console.error('Error fetching requests count:', error);
      }
    };
    fetchRequestsCount();

    return () => unsubscribe();
  }, [userProfile]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '>=', searchQuery.toLowerCase()),
          where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
          limit(10)
        );
        const snapshot = await getDocs(usersQuery);
        const results = snapshot.docs
          .map((doc) => ({
            uid: doc.id,
            username: doc.data().username,
            displayName: doc.data().displayName,
            photoURL: doc.data().photoURL || '',
          }))
          .filter((u) => u.uid !== userProfile?.uid);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, userProfile]);

  const handleStartChat = (user: UserResult) => {
    navigate(`/messages/new?userId=${user.uid}`);
  };

  const handleHideConversation = async (conversationId: string) => {
    if (!userProfile) return;
    
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        hiddenChats: arrayUnion(conversationId)
      });
      
      setHiddenChats(prev => [...prev, conversationId]);
      
      toast({
        title: 'Conversation hidden',
        description: 'You can unhide it from Settings > Hidden Chats.',
      });
    } catch (error) {
      console.error('Error hiding conversation:', error);
      toast({
        title: 'Error',
        description: 'Could not hide conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const batch = writeBatch(db);
      
      // Delete all messages in the conversation
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const messagesSnap = await getDocs(messagesRef);
      messagesSnap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      // Delete the conversation itself
      batch.delete(doc(db, 'conversations', conversationId));
      
      await batch.commit();
      
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been permanently deleted.',
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Could not delete conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  
  // Filter conversations based on search and hidden chats
  const filteredConversations = conversations
    .filter(c => !hiddenChats.includes(c.id)) // Exclude hidden chats
    .filter(c => 
      searchQuery.trim() 
        ? c.participantName.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <h1 className="font-display font-semibold text-lg">
            {userProfile?.username || 'Messages'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/messages/requests')}
              className="p-2 rounded-full hover:bg-secondary transition-colors relative"
            >
              <UserPlus className="w-5 h-5" />
              {pendingRequestsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1"
                >
                  {pendingRequestsCount}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setShowNewMessageDialog(true)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="New message"
            >
              <PenSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Search Bar - Always visible */}
        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-compose-search
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={showSearch ? "Search users to start chat..." : "Search conversations..."}
              className="pl-9 pr-10 h-10 rounded-full bg-secondary border-0"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); if (showSearch) setShowSearch(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Search Results - New Users */}
      {searchQuery.trim() && (
        <div className="max-w-lg mx-auto border-b border-border">
          <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
            Start new chat with
          </p>
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No users found for "{searchQuery}"
            </p>
          ) : (
            searchResults.map((user) => (
              <button
                key={user.uid}
                onClick={() => handleStartChat(user)}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground bg-gradient-to-br from-primary/20 to-primary/10">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.displayName}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Messages List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto max-w-lg mx-auto w-full"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          willChange: 'scroll-position'
        }}
      >
        {/* Group Chat & AI Options */}
        {!showSearch && (
          <div className="border-b border-border">
            {/* Group Chat Option */}
            <button
              onClick={() => {
                toast({
                  title: 'Coming Soon',
                  description: 'Group chat feature will be available soon!',
                });
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Users className="w-7 h-7 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-base">Group chat</p>
              </div>
            </button>

            {/* AI Chats Option */}
            <button
              onClick={() => {
                toast({
                  title: 'Coming Soon',
                  description: 'AI chat feature will be available soon!',
                });
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Bot className="w-7 h-7 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-base">AI chats</p>
              </div>
            </button>
          </div>
        )}

        {/* Suggested Section - Meta AI */}
        {!showSearch && (
          <div className="py-4 border-b border-border">
            <h3 className="px-4 mb-3 text-base font-semibold text-foreground">Suggested</h3>
            <button
              onClick={() => {
                toast({
                  title: 'Meta AI Chat',
                  description: 'AI assistant coming soon! Get help, ask questions, and more.',
                });
              }}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-secondary/50 transition-colors"
            >
              {/* Meta AI Gradient Icon */}
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400 opacity-90" />
                <div className="absolute inset-2 rounded-full bg-background" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-base">Meta AI</p>
                  <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500" />
                </div>
                <p className="text-sm text-muted-foreground">AI</p>
              </div>
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full skeleton" />
                <div className="flex-1">
                  <div className="h-4 w-24 skeleton mb-2" />
                  <div className="h-3 w-40 skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 && searchQuery ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No conversations match "{searchQuery}"</p>
          </div>
        ) : filteredConversations.length === 0 && !searchQuery && !showSearch ? (
          // Empty state when no conversations - options are already shown above
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground max-w-xs">
              Start a conversation by tapping the new message icon above.
            </p>
          </motion.div>
        ) : filteredConversations.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation, index) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MessageListItem 
                  conversation={conversation} 
                  onDelete={handleDeleteConversation}
                  onHide={handleHideConversation}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b">
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9 pr-10 h-10 rounded-full bg-secondary border-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Group Chat Option */}
            <button
              onClick={() => {
                setShowNewMessageDialog(false);
                toast({
                  title: 'Coming Soon',
                  description: 'Group chat feature will be available soon!',
                });
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors border-b"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">Create Group Chat</p>
                <p className="text-xs text-muted-foreground">Chat with multiple people</p>
              </div>
            </button>

            {/* AI Chat Option */}
            <button
              onClick={() => {
                setShowNewMessageDialog(false);
                toast({
                  title: 'Coming Soon',
                  description: 'AI chat feature will be available soon!',
                });
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors border-b"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">AI Chat Assistant</p>
                <p className="text-xs text-muted-foreground">Get help from AI</p>
              </div>
            </button>

            {/* Meta AI */}
            <div className="p-4 border-b">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">SUGGESTED</h4>
              <button
                onClick={() => {
                  setShowNewMessageDialog(false);
                  toast({
                    title: 'Meta AI Chat',
                    description: 'AI assistant coming soon!',
                  });
                }}
                className="w-full flex items-center gap-3 p-2 hover:bg-secondary/50 transition-colors rounded-lg"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400" />
                  <div className="absolute inset-1 rounded-full bg-background" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm">Meta AI</p>
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">AI assistant</p>
                </div>
              </button>
            </div>

            {/* Search Results */}
            {searching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="divide-y">
                {searchResults.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => {
                      setShowNewMessageDialog(false);
                      navigate(`/chat/${user.uid}`);
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground bg-gradient-to-br from-primary/20 to-primary/10">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.displayName}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 3 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;
