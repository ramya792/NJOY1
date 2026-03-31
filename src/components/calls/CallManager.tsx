import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CallService, CallData } from '@/lib/callService';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, addDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import IncomingCall from '@/components/calls/IncomingCall';
import { webrtcConfig } from "../../lib/webrtcConfig";
import { Button } from '../ui/button';
import ActiveCall from "./ActiveCall";

const CallManager: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [inCall, setInCall] = useState(false);

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
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: incomingCall.type === 'video',
      audio: true,
    });
    setLocalStream(stream);

    const pc = new RTCPeerConnection(webrtcConfig);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = event => {
      setRemoteStream(event.streams[0]);
    };

    const callDocRef = doc(db, 'calls', incomingCall.id);
    const offerCandidatesRef = collection(callDocRef, 'offerCandidates');
    const answerCandidatesRef = collection(callDocRef, 'answerCandidates');

    pc.onicecandidate = event => {
      if (event.candidate) {
        addDoc(answerCandidatesRef, event.candidate.toJSON());
      }
    };

    const callDoc = await getDoc(callDocRef);
    const { offer } = callDoc.data() as any;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDocRef, { answer });

    onSnapshot(offerCandidatesRef, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });

    await CallService.acceptCall(incomingCall.id);
    setInCall(true);
    setIncomingCall(null);
  };

  const handleReject = async () => {
    if (!incomingCall || !incomingCall.id) return;
    
    await CallService.rejectCall(incomingCall.id);
    setIncomingCall(null);
  };

  const endCall = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (incomingCall) {
        await CallService.endCall(incomingCall.id);
        // You might want to calculate the actual duration
        await CallService.createCallHistoryMessage(incomingCall.conversationId, {
            ...incomingCall,
            status: 'ended',
            duration: 0, // Placeholder for duration
        });
    }
    setInCall(false);
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
  };

  if (!userProfile) return null;

  if (inCall && remoteStream && incomingCall) {
    return (
      <ActiveCall
        localStream={localStream}
        remoteStream={remoteStream}
        onEndCall={endCall}
        participant={{
          photoURL: incomingCall.callerPhoto,
          username: incomingCall.callerName,
        }}
        callType={incomingCall.type}
      />
    );
  }

  return <IncomingCall call={incomingCall} onAccept={handleAccept} onReject={handleReject} />;
};

export default CallManager;
