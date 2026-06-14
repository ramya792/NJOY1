import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';

// TURN server configuration
export const turnConfig = {
  iceServers: [
    {
      urls: 'turn:njoy.metered.live:80',
      username: '1d1cf6d656abe862914634c0',
      credential: 'gOM1pY7Qacmr7OF/',
    },
  ],
};

export interface CallData {
  id?: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended';
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export class CallService {
  static async initiateCall(callData: Omit<CallData, 'id' | 'startTime' | 'status'>): Promise<string> {
    const callDoc = await addDoc(collection(db, 'calls'), {
      ...callData,
      status: 'ringing',
      startTime: serverTimestamp(),
    });
    return callDoc.id;
  }

  static listenForIncomingCalls(userId: string, onCall: (call: CallData | null) => void) {
    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('status', '==', 'ringing')
    );

    return onSnapshot(callsQuery, (snapshot) => {
      let activeCall: CallData | null = null;
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const startTime = data.startTime?.toDate() || new Date();
        const now = new Date();
        const ageInSeconds = (now.getTime() - startTime.getTime()) / 1000;
        
        if (ageInSeconds < 60) {
          activeCall = {
            id: doc.id,
            ...data,
            startTime,
          } as CallData;
        } else {
          // Clean up ghost calls
          CallService.markAsMissed(doc.id).catch(() => {});
        }
      });
      
      onCall(activeCall);
    });
  }

  static async acceptCall(callId: string) {
    await updateDoc(doc(db, 'calls', callId), {
      status: 'accepted',
    });
  }

  static async rejectCall(callId: string) {
    await updateDoc(doc(db, 'calls', callId), {
      status: 'rejected',
      endTime: serverTimestamp(),
    });
  }

  static async endCall(callId: string, duration: number) {
    await updateDoc(doc(db, 'calls', callId), {
      status: 'ended',
      endTime: serverTimestamp(),
      duration,
    });
  }

  static async markAsMissed(callId: string) {
    await updateDoc(doc(db, 'calls', callId), {
      status: 'missed',
      endTime: serverTimestamp(),
    });
  }

  static async deleteCall(callId: string) {
    await deleteDoc(doc(db, 'calls', callId));
  }
}
