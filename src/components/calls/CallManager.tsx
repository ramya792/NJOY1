import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CallService, CallData } from '@/lib/callService';
import { useNavigate } from 'react-router-dom';
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
    
    // Navigate to chat room with caller
    const conversationQuery = await import('firebase/firestore').then(({ query, collection, where, getDocs }) => 
      getDocs(query(
        collection(import('@/lib/firebase').then(m => m.db), 'conversations'),
        where('participants', 'array-contains', userProfile?.uid || '')
      ))
    );
    
    // Find existing conversation or create new
    navigate(`/messages/${incomingCall.callerId}`);
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
