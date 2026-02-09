import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';

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

  static listenForIncomingCalls(userId: string, onCall: (call: CallData) => void) {
    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('status', '==', 'ringing')
    );

    return onSnapshot(callsQuery, (snapshot) => {
      snapshot.docs.forEach((doc) => {
        const callData = {
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate() || new Date(),
        } as CallData;
        onCall(callData);
      });
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
