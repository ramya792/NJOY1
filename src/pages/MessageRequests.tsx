import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, X, Loader2, UserPlus, UserCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, query, where, getDocs, doc, deleteDoc, 
  updateDoc, arrayUnion, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';

interface FollowRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromUserPhoto: string;
  createdAt: Date;
  type: 'incoming' | 'outgoing';
  status?: 'pending' | 'accepted';
}

const MessageRequests: React.FC = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [incomingRequests, setIncomingRequests] = useState<FollowRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const fetchRequests = async () => {
      try {
        // Fetch incoming follow requests
        const incomingQuery = query(
          collection(db, 'notifications'),
          where('toUserId', '==', userProfile.uid),
          where('type', '==', 'follow_request')
        );
        const incomingSnapshot = await getDocs(incomingQuery);
        const incoming = incomingSnapshot.docs.map((d) => ({
          id: d.id,
          fromUserId: d.data().fromUserId,
          fromUsername: d.data().fromUsername,
          fromUserPhoto: d.data().fromUserPhoto || '',
          createdAt: d.data().createdAt?.toDate() || new Date(),
          type: 'incoming' as const,
        }));
        setIncomingRequests(incoming);

        // Fetch outgoing follow requests (requests I sent)
        const outgoingQuery = query(
          collection(db, 'notifications'),
          where('fromUserId', '==', userProfile.uid),
          where('type', '==', 'follow_request')
        );
        const outgoingSnapshot = await getDocs(outgoingQuery);
        const outgoing = outgoingSnapshot.docs.map((d) => ({
          id: d.id,
          fromUserId: d.data().toUserId,
          fromUsername: d.data().toUsername || 'User',
          fromUserPhoto: d.data().toUserPhoto || '',
          createdAt: d.data().createdAt?.toDate() || new Date(),
          type: 'outgoing' as const,
          status: 'pending' as const,
        }));
        setOutgoingRequests(outgoing);
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [userProfile]);

  const handleAcceptRequest = async (request: FollowRequest) => {
    if (!userProfile) return;
    setActionLoading(request.id);
    
    try {
      // Add to followers
      await updateUserProfile({
        followers: [...(userProfile.followers || []), request.fromUserId],
      });
      
      // Add to their following
      const otherUserRef = doc(db, 'users', request.fromUserId);
      await updateDoc(otherUserRef, {
        following: arrayUnion(userProfile.uid),
      });

      // Send acceptance notification
      await addDoc(collection(db, 'notifications'), {
        type: 'follow_accepted',
        fromUserId: userProfile.uid,
        fromUsername: userProfile.username,
        fromUserPhoto: userProfile.photoURL || '',
        toUserId: request.fromUserId,
        message: 'accepted your follow request',
        read: false,
        createdAt: serverTimestamp(),
      });

      // Delete the request notification
      await deleteDoc(doc(db, 'notifications', request.id));
      
      setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (request: FollowRequest) => {
    setActionLoading(request.id);
    
    try {
      await deleteDoc(doc(db, 'notifications', request.id));
      setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (request: FollowRequest) => {
    setActionLoading(request.id);
    
    try {
      await deleteDoc(doc(db, 'notifications', request.id));
      setOutgoingRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error canceling request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const renderRequestItem = (request: FollowRequest, isOutgoing: boolean = false) => (
    <motion.div
      key={request.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 p-4 border-b border-border"
    >
      <button
        onClick={() => navigate(`/user/${request.fromUserId}`)}
        className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0"
      >
        {request.fromUserPhoto ? (
          <img src={request.fromUserPhoto} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
            {request.fromUsername?.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{request.fromUsername}</p>
        <p className="text-xs text-muted-foreground">
          {isOutgoing ? 'Request sent' : 'Wants to follow you'} •{' '}
          {formatDistanceToNow(request.createdAt, { addSuffix: true })}
        </p>
      </div>

      {actionLoading === request.id ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : isOutgoing ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleCancelRequest(request)}
        >
          Cancel
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleAcceptRequest(request)}
            className="btn-gradient"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRejectRequest(request)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate('/messages')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg ml-2">Follow Requests</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="w-full bg-secondary/50 rounded-none h-12 p-0">
            <TabsTrigger
              value="incoming"
              className="flex-1 rounded-none h-full data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Received ({incomingRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="outgoing"
              className="flex-1 rounded-none h-full data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <Clock className="w-4 h-4 mr-2" />
              Sent ({outgoingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full skeleton" />
                    <div className="flex-1">
                      <div className="h-4 w-24 skeleton mb-2" />
                      <div className="h-3 w-32 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : incomingRequests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-4 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <UserCheck className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="font-semibold text-lg mb-2">No Pending Requests</h2>
                <p className="text-sm text-muted-foreground">
                  When someone requests to follow you, it will appear here.
                </p>
              </motion.div>
            ) : (
              <div>
                {incomingRequests.map(request => renderRequestItem(request))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full skeleton" />
                    <div className="flex-1">
                      <div className="h-4 w-24 skeleton mb-2" />
                      <div className="h-3 w-32 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : outgoingRequests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-4 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Clock className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="font-semibold text-lg mb-2">No Pending Requests</h2>
                <p className="text-sm text-muted-foreground">
                  Your sent follow requests will appear here.
                </p>
              </motion.div>
            ) : (
              <div>
                {outgoingRequests.map(request => renderRequestItem(request, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MessageRequests;
