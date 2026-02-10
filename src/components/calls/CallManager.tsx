import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CallService, CallData } from '@/lib/callService';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import IncomingCall from '@/components/calls/IncomingCall';

const CallManager: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const unsubscribe = CallService.listenForIncomingCalls(
      userProfile.uid,
      (call) => {
        setIncomingCall(call);
        
        // Play ringtone (optional)
        const audio = new Audio('/ringtone.mp3');
        audio.loop = true;
        audio.play().catch(() => {
          // Handle autoplay restrictions
        });
      }
    );

    return () => unsubscribe();
  }, [userProfile]);

  const handleAccept = async () => {
    if (!incomingCall || !incomingCall.id) return;
    
    await CallService.acceptCall(incomingCall.id);
    
    // Find existing conversation with caller
    try {
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userProfile?.uid || '')
      );
      const snapshot = await getDocs(conversationsQuery);
      let foundConvId: string | null = null;
      snapshot.docs.forEach((doc) => {
        if (doc.data().participants.includes(incomingCall.callerId)) {
          foundConvId = doc.id;
        }
      });
      
      if (foundConvId) {
        navigate(`/messages/${foundConvId}`);
      } else {
        navigate(`/messages/new?userId=${incomingCall.callerId}`);
      }
    } catch (error) {
      console.error('Error finding conversation:', error);
      navigate(`/messages/new?userId=${incomingCall.callerId}`);
    }
    
    setIncomingCall(null);
  };

  const handleReject = async () => {
    if (!incomingCall || !incomingCall.id) return;
    
    await CallService.rejectCall(incomingCall.id);
    setIncomingCall(null);
  };

  return <IncomingCall call={incomingCall} onAccept={handleAccept} onReject={handleReject} />;
};

export default CallManager;
