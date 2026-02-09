import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Send, Phone, Video, Info, Image, Smile, Paperclip, FileText, X, Loader2, PhoneOff,
  MoreVertical, Trash2, Bookmark, Mic, Square, Play, Pause
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayRemove,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { CallService } from '@/lib/callService';

interface Message {
  id: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'pdf' | 'audio';
  fileName?: string;
  createdAt: Date;
  seen: boolean;
  deletedFor?: string[];
  saved?: boolean;
}

interface Participant {
  uid: string;
  username: string;
  photoURL: string;
  isOnline?: boolean;
  lastSeen?: Date;
  showActivity?: boolean;
}

const ChatRoom: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const newUserId = searchParams.get('userId');
  
  const { userProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [inCall, setInCall] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize conversation
  useEffect(() => {
    if (!userProfile) return;

    const initializeChat = async () => {
      if (newUserId && conversationId === 'new') {
        const userDoc = await getDoc(doc(db, 'users', newUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setParticipant({
            uid: newUserId,
            username: userData.username,
            photoURL: userData.photoURL || '',
            isOnline: userData.isOnline || false,
            lastSeen: userData.lastSeen?.toDate(),
            showActivity: userData.showActivity !== false,
          });
          
          // Listen to participant's online status
          const unsubscribe = onSnapshot(doc(db, 'users', newUserId), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setParticipant(prev => prev ? {
                ...prev,
                isOnline: data.isOnline || false,
                lastSeen: data.lastSeen?.toDate(),
                showActivity: data.showActivity !== false,
              } : null);
            }
          });
        }

        const existingQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', userProfile.uid)
        );
        const existingDocs = await getDocs(existingQuery);
        
        let foundConversation: string | null = null;
        existingDocs.forEach((docSnap) => {
          if (docSnap.data().participants.includes(newUserId)) {
            foundConversation = docSnap.id;
          }
        });

        if (foundConversation) {
          setCurrentConversationId(foundConversation);
        }
        
        setLoading(false);
      } else if (conversationId && conversationId !== 'new') {
        const convDoc = await getDoc(doc(db, 'conversations', conversationId));
        if (convDoc.exists()) {
          const data = convDoc.data();
          const otherId = data.participants.find((p: string) => p !== userProfile.uid);
          
          // Get participant info with online status
          const participantDoc = await getDoc(doc(db, 'users', otherId));
          if (participantDoc.exists()) {
            const participantData = participantDoc.data();
            setParticipant({
              uid: otherId,
              username: participantData.username || 'User',
              photoURL: participantData.photoURL || '',
              isOnline: participantData.isOnline || false,
              lastSeen: participantData.lastSeen?.toDate(),
              showActivity: participantData.showActivity !== false,
            });
            
            // Listen to participant's online status
            onSnapshot(doc(db, 'users', otherId), (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setParticipant(prev => prev ? {
                  ...prev,
                  isOnline: data.isOnline || false,
                  lastSeen: data.lastSeen?.toDate(),
                  showActivity: data.showActivity !== false,
                } : null);
              }
            });
          }

          if (data.unreadBy?.includes(userProfile.uid)) {
            await updateDoc(doc(db, 'conversations', conversationId), {
              unreadBy: arrayRemove(userProfile.uid),
            });
          }
        }
        setCurrentConversationId(conversationId);
        setLoading(false);
      }
    };

    initializeChat();
  }, [conversationId, newUserId, userProfile]);

  // Listen to messages
  useEffect(() => {
    if (!currentConversationId || currentConversationId === 'new' || !userProfile) return;

    const messagesQuery = query(
      collection(db, 'conversations', currentConversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        }))
        .filter((msg: Message) => !msg.deletedFor?.includes(userProfile.uid)) as Message[];
      
      setMessages(fetchedMessages);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [currentConversationId, userProfile]);

  const uploadToCloudinary = async (file: File | Blob, resourceType: string = 'auto'): Promise<{ url: string; type: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'CRAZZY');
    formData.append('cloud_name', 'dnobraoue');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dnobraoue/${resourceType}/upload`,
      { method: 'POST', body: formData }
    );

    const data = await response.json();
    return { url: data.secure_url, type: resourceType };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setShowAttachMenu(false);

    try {
      const resourceType = type === 'video' ? 'video' : type === 'pdf' ? 'raw' : 'image';
      const { url } = await uploadToCloudinary(file, resourceType);
      await sendMediaMessage(url, type, file.name);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        setUploading(true);
        try {
          const { url } = await uploadToCloudinary(audioBlob, 'video');
          await sendMediaMessage(url, 'audio', 'Voice message');
        } catch (error) {
          console.error('Voice upload error:', error);
          toast({
            title: 'Upload failed',
            description: 'Could not upload voice message.',
            variant: 'destructive',
          });
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: 'Recording failed',
        description: 'Could not access microphone.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMediaMessage = async (mediaUrl: string, mediaType: 'image' | 'video' | 'pdf' | 'audio', fileName?: string) => {
    if (!userProfile || !participant) return;

    try {
      let convId = currentConversationId;

      if (!convId || convId === 'new') {
        const convDoc = await addDoc(collection(db, 'conversations'), {
          participants: [userProfile.uid, participant.uid],
          participantNames: {
            [userProfile.uid]: userProfile.username,
            [participant.uid]: participant.username,
          },
          participantPhotos: {
            [userProfile.uid]: userProfile.photoURL || '',
            [participant.uid]: participant.photoURL || '',
          },
          lastMessage: mediaType === 'audio' ? '🎤 Voice message' : `Sent a ${mediaType}`,
          lastMessageTime: serverTimestamp(),
          unreadBy: [participant.uid],
          createdAt: serverTimestamp(),
        });
        convId = convDoc.id;
        setCurrentConversationId(convId);
      }

      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderId: userProfile.uid,
        text: '',
        mediaUrl,
        mediaType,
        fileName,
        createdAt: serverTimestamp(),
        seen: false,
      });

      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: mediaType === 'audio' ? '🎤 Voice message' : `Sent a ${mediaType}`,
        lastMessageTime: serverTimestamp(),
        unreadBy: [participant.uid],
      });

    } catch (error) {
      console.error('Error sending media:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !userProfile || !participant) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);

    try {
      let convId = currentConversationId;

      if (!convId || convId === 'new') {
        const convDoc = await addDoc(collection(db, 'conversations'), {
          participants: [userProfile.uid, participant.uid],
          participantNames: {
            [userProfile.uid]: userProfile.username,
            [participant.uid]: participant.username,
          },
          participantPhotos: {
            [userProfile.uid]: userProfile.photoURL || '',
            [participant.uid]: participant.photoURL || '',
          },
          lastMessage: messageText,
          lastMessageTime: serverTimestamp(),
          unreadBy: [participant.uid],
          createdAt: serverTimestamp(),
        });
        convId = convDoc.id;
        setCurrentConversationId(convId);
      }

      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderId: userProfile.uid,
        text: messageText,
        createdAt: serverTimestamp(),
        seen: false,
      });

      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        unreadBy: [participant.uid],
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setNewMessage((prev) => prev + emoji.native);
  };

  const handleClearChat = async () => {
    if (!currentConversationId || !userProfile) return;

    try {
      const messagesRef = collection(db, 'conversations', currentConversationId, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        const messageData = docSnap.data();
        const deletedFor = messageData.deletedFor || [];
        if (!deletedFor.includes(userProfile.uid)) {
          batch.update(docSnap.ref, {
            deletedFor: [...deletedFor, userProfile.uid]
          });
        }
      });
      
      await batch.commit();
      setShowClearChatDialog(false);
      
      toast({
        title: 'Chat cleared',
        description: 'All messages have been cleared for you.',
      });
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({
        title: 'Error',
        description: 'Could not clear chat.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteForMe = async (message: Message) => {
    if (!currentConversationId || !userProfile) return;

    try {
      const messageRef = doc(db, 'conversations', currentConversationId, 'messages', message.id);
      const deletedFor = message.deletedFor || [];
      
      await updateDoc(messageRef, {
        deletedFor: [...deletedFor, userProfile.uid]
      });
      
      setShowDeleteDialog(false);
      setSelectedMessage(null);
      
      toast({
        title: 'Message deleted',
        description: 'Message deleted for you.',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleDeleteForEveryone = async (message: Message) => {
    if (!currentConversationId || !userProfile || message.senderId !== userProfile.uid) return;

    try {
      await deleteDoc(doc(db, 'conversations', currentConversationId, 'messages', message.id));
      
      setShowDeleteDialog(false);
      setSelectedMessage(null);
      
      toast({
        title: 'Message deleted',
        description: 'Message deleted for everyone.',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleSaveMessage = async (message: Message) => {
    if (!userProfile) return;

    try {
      const savedMessages = userProfile.savedPosts || [];
      const messageId = `msg_${currentConversationId}_${message.id}`;
      
      if (savedMessages.includes(messageId)) {
        await updateUserProfile({
          savedPosts: savedMessages.filter(id => id !== messageId)
        });
        toast({ title: 'Message unsaved' });
      } else {
        await updateUserProfile({
          savedPosts: [...savedMessages, messageId]
        });
        toast({ title: 'Message saved' });
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!userProfile || !participant) return;
    
    try {
      setCallType(type);
      setShowCallDialog(true);
      setInCall(true);
      
      // Initiate call in database
      const callId = await CallService.initiateCall({
        callerId: userProfile.uid,
        callerName: userProfile.username,
        callerPhoto: userProfile.photoURL || '',
        receiverId: participant.uid,
        receiverName: participant.username,
        receiverPhoto: participant.photoURL || '',
        type,
      });
      
      // Listen for call status
      const callDoc = doc(db, 'calls', callId);
      const unsubscribe = onSnapshot(callDoc, (docSnap) => {
        if (docSnap.exists()) {
          const status = docSnap.data().status;
          if (status === 'rejected') {
            handleEndCall();
            toast({
              title: 'Call declined',
              description: `${participant.username} declined the call.`,
              variant: 'destructive',
            });
          } else if (status === 'accepted') {
            toast({
              title: 'Call connected',
              description: `Connected with ${participant.username}`,
            });
          }
        }
      });
      
      // Auto end after 60 seconds if not answered
      setTimeout(() => {
        if (inCall) {
          CallService.markAsMissed(callId);
          handleEndCall();
        }
        unsubscribe();
      }, 60000);
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Call failed',
        description: 'Could not initiate call. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEndCall = () => {
    setInCall(false);
    setShowCallDialog(false);
    toast({
      title: 'Call ended',
      description: `${callType === 'audio' ? 'Voice' : 'Video'} call with ${participant?.username} ended.`,
    });
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = (message: Message) => {
    if (message.mediaUrl) {
      if (message.mediaType === 'image') {
        return (
          <img 
            src={message.mediaUrl} 
            alt="Shared image" 
            className="max-w-full rounded-lg max-h-60 object-cover"
          />
        );
      }
      if (message.mediaType === 'video') {
        return (
          <video 
            src={message.mediaUrl} 
            controls 
            className="max-w-full rounded-lg max-h-60"
          />
        );
      }
      if (message.mediaType === 'audio') {
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const audio = document.getElementById(`audio-${message.id}`) as HTMLAudioElement;
                if (!audio) {
                  console.error('Audio element not found');
                  return;
                }
                
                if (playingAudio === message.id) {
                  audio.pause();
                  setPlayingAudio(null);
                } else {
                  // Pause any other playing audio
                  if (playingAudio) {
                    const otherAudio = document.getElementById(`audio-${playingAudio}`) as HTMLAudioElement;
                    otherAudio?.pause();
                  }
                  
                  audio.play().catch((error) => {
                    console.error('Audio playback error:', error);
                    toast({
                      title: 'Playback failed',
                      description: 'Could not play voice message.',
                      variant: 'destructive',
                    });
                  });
                  setPlayingAudio(message.id);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
            >
              {playingAudio === message.id ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-muted rounded-full">
                <div className="h-full w-0 bg-primary rounded-full" />
              </div>
              <p className="text-xs mt-1 opacity-70">Voice message</p>
            </div>
            <audio 
              id={`audio-${message.id}`} 
              src={message.mediaUrl}
              preload="metadata"
              onEnded={() => setPlayingAudio(null)}
              onError={(e) => {
                console.error('Audio loading error:', e);
                setPlayingAudio(null);
              }}
              className="hidden"
            />
          </div>
        );
      }
      if (message.mediaType === 'pdf') {
        return (
          <a 
            href={message.mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
          >
            <FileText className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm font-medium">{message.fileName || 'Document.pdf'}</p>
              <p className="text-xs text-muted-foreground">PDF Document</p>
            </div>
          </a>
        );
      }
    }
    return <p className="text-sm">{message.text}</p>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="flex-shrink-0 glass border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/messages')} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                {participant?.photoURL ? (
                  <img
                    src={participant.photoURL}
                    alt={participant.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-semibold text-muted-foreground">
                    {participant?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">{participant?.username}</p>
                {participant?.showActivity !== false && (
                  <p className="text-xs text-muted-foreground">
                    {participant?.isOnline 
                      ? 'Active now' 
                      : participant?.lastSeen 
                        ? `Active ${formatDistanceToNow(participant.lastSeen, { addSuffix: true })}`
                        : 'Offline'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleStartCall('audio')}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleStartCall('video')}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <Video className="w-5 h-5" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowClearChatDialog(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile?tab=saved')}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Saved messages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary mb-4">
              {participant?.photoURL ? (
                <img
                  src={participant.photoURL}
                  alt={participant.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                  {participant?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="font-semibold">{participant?.username}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMine = message.senderId === userProfile?.uid;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className={`max-w-[75%] px-4 py-2 cursor-pointer ${isMine ? 'message-sent' : 'message-received'}`}>
                      {renderMessage(message)}
                      <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(message.createdAt, { addSuffix: false })}
                      </p>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleSaveMessage(message)}>
                      <Bookmark className="w-4 h-4 mr-2" />
                      {userProfile?.savedPosts?.includes(`msg_${currentConversationId}_${message.id}`) ? 'Unsave' : 'Save'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSelectedMessage(message); setShowDeleteDialog(true); }}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-4">
        {isRecording ? (
          <div className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="flex-1 flex items-center gap-3 bg-destructive/10 rounded-full px-4 py-2">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
              <span className="text-sm text-muted-foreground">Recording...</span>
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full"
              onClick={stopRecording}
            >
              <Square className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 max-w-lg mx-auto">
            <div className="relative">
              <button 
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <Paperclip className="w-6 h-6 text-muted-foreground" />
              </button>
              
              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-12 left-0 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[160px]"
                  >
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors">
                      <Image className="w-5 h-5 text-green-500" />
                      <span className="text-sm">Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'image')}
                      />
                    </label>
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors">
                      <Video className="w-5 h-5 text-blue-500" />
                      <span className="text-sm">Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'video')}
                      />
                    </label>
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors">
                      <FileText className="w-5 h-5 text-red-500" />
                      <span className="text-sm">PDF Document</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => handleFileSelect(e, 'pdf')}
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Message..."
                className="pr-10 rounded-full"
                disabled={uploading}
              />
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-12 right-0 z-50 shadow-2xl rounded-lg overflow-hidden"
                  >
                    <Picker 
                      data={data} 
                      onEmojiSelect={handleEmojiSelect}
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                      previewPosition="none"
                      skinTonePosition="none"
                      searchPosition="sticky"
                      maxFrequentRows={2}
                      perLine={8}
                      navPosition="bottom"
                      onClickOutside={() => setShowEmojiPicker(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {uploading ? (
              <div className="p-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : newMessage.trim() ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={sending}
                className="p-2 rounded-full text-primary"
              >
                <Send className="w-6 h-6" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={startRecording}
                className="p-2 rounded-full text-muted-foreground hover:text-primary transition-colors"
              >
                <Mic className="w-6 h-6" />
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Call Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {callType === 'audio' ? 'Voice Call' : 'Video Call'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-8">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary mb-4">
              {participant?.photoURL ? (
                <img
                  src={participant.photoURL}
                  alt={participant.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                  {participant?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="font-semibold text-lg">{participant?.username}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {inCall ? 'Calling...' : 'Call ended'}
            </p>
            
            <div className="flex gap-4 mt-8">
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Chat Dialog */}
      <AlertDialog open={showClearChatDialog} onOpenChange={setShowClearChatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in this chat for you. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Message Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to delete this message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={() => selectedMessage && handleDeleteForMe(selectedMessage)}
              className="w-full"
            >
              Delete for me
            </Button>
            {selectedMessage?.senderId === userProfile?.uid && (
              <Button
                variant="destructive"
                onClick={() => selectedMessage && handleDeleteForEveryone(selectedMessage)}
                className="w-full"
              >
                Delete for everyone
              </Button>
            )}
            <AlertDialogCancel className="w-full mt-2">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatRoom;
