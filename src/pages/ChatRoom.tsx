import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Send, Phone, Video, Info, Image, Smile, Paperclip, FileText, X, Loader2, PhoneOff,
  MoreVertical, Trash2, Bookmark, Mic, Square, Play, Pause, Users, User, Palette, Pencil, Check, Bot, Sparkles, CheckCircle2, AtSign
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
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { aiService } from '@/lib/aiService';
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
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { CallService } from '@/lib/callService';
import ChatWallpaperPicker, { getChatWallpaper, getWallpaperStyle, WallpaperConfig } from '@/components/chat/ChatWallpaper';

interface MentionedUser {
  uid: string;
  username: string;
}

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
  editedAt?: Date;
  isEdited?: boolean;
  mentions?: MentionedUser[];
}

interface Participant {
  uid: string;
  username: string;
  photoURL: string;
  isOnline?: boolean;
  lastSeen?: Date;
  showActivity?: boolean;
  isAI?: boolean;
  aiType?: string;
}

interface GroupInfo {
  groupName: string;
  groupPhoto: string;
  participants: string[];
  participantNames: { [key: string]: string };
  participantPhotos: { [key: string]: string };
  admins: string[];
  isGroup: true;
}

const ChatRoom: React.FC = () => {
  const { conversationId, aiId } = useParams<{ conversationId?: string; aiId?: string }>();
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
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [isAIChat, setIsAIChat] = useState(false);
  const [aiTyping, setAITyping] = useState(false);
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
  const [showUserInfoDialog, setShowUserInfoDialog] = useState(false);
  const [participantFollowers, setParticipantFollowers] = useState<string[]>([]);
  const [participantFollowing, setParticipantFollowing] = useState<string[]>([]);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>({ type: 'none', value: '' });
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<MentionedUser[]>([]);
  const [mentionableUsers, setMentionableUsers] = useState<{uid: string; username: string; photoURL: string; isFollower?: boolean; isFollowing?: boolean}[]>([]);
  const [mentionTab, setMentionTab] = useState<'followers' | 'following'>('followers');
  const [alreadyMentionedUsers, setAlreadyMentionedUsers] = useState<Set<string>>(new Set());
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Fetch mentionable users (conversation participants or followers/following)
  useEffect(() => {
    if (!userProfile) return;

    const fetchMentionableUsers = async () => {
      try {
        // For group chats, use group participants
        if (groupInfo) {
          const users = groupInfo.participants
            .filter(uid => uid !== userProfile.uid)
            .map(uid => ({
              uid,
              username: groupInfo.participantNames[uid] || 'User',
              photoURL: groupInfo.participantPhotos[uid] || '',
            }));
          setMentionableUsers(users);
          return;
        }

        // For 1-on-1 chats, show followers and following separately
        const userIds = new Set<string>();
        const followerIds = new Set<string>(userProfile.followers || []);
        const followingIds = new Set<string>(userProfile.following || []);

        // Add the other participant
        if (participant && !participant.isAI) {
          userIds.add(participant.uid);
        }

        // Add followers and following
        followerIds.forEach(id => userIds.add(id));
        followingIds.forEach(id => userIds.add(id));

        // Remove self
        userIds.delete(userProfile.uid);

        const users: {uid: string; username: string; photoURL: string; isFollower?: boolean; isFollowing?: boolean}[] = [];
        const idsArray = Array.from(userIds).slice(0, 100); // limit to 100

        for (const uid of idsArray) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            users.push({
              uid,
              username: data.username || 'User',
              photoURL: data.photoURL || '',
              isFollower: followerIds.has(uid),
              isFollowing: followingIds.has(uid),
            });
          }
        }
        setMentionableUsers(users);
      } catch (error) {
        console.error('Error fetching mentionable users:', error);
      }
    };

    fetchMentionableUsers();
  }, [userProfile, participant, groupInfo]);

  // Handle input change with @ mention detection
  const handleInputChange = (value: string) => {
    if (editingMessage) {
      setEditText(value);
    } else {
      setNewMessage(value);
    }

    // Detect @ symbol
    const cursorText = value;
    const lastAtIndex = cursorText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = cursorText.slice(lastAtIndex + 1);
      // Only show picker if @ is at start or after space, and no space in search term
      const charBeforeAt = lastAtIndex > 0 ? cursorText[lastAtIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
    setMentionSearch('');
    setSelectedMentions([]); // Clear selections when picker auto-closes
  };

  // Toggle mention selection
  const toggleMentionUser = (user: {uid: string; username: string}) => {
    // Prevent selecting users who have already been mentioned in the conversation
    if (alreadyMentionedUsers.has(user.uid)) {
      toast({
        title: 'Already mentioned',
        description: `@${user.username} has already been mentioned in this conversation`,
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedMentions(prev => {
      const exists = prev.find(m => m.uid === user.uid);
      if (exists) {
        return prev.filter(m => m.uid !== user.uid);
      }
      return [...prev, { uid: user.uid, username: user.username }];
    });
  };

  // Confirm mentions and insert into message
  const confirmMentions = () => {
    if (selectedMentions.length === 0) {
      setShowMentionPicker(false);
      setSelectedMentions([]); // Clear even if empty
      return;
    }

    const currentText = editingMessage ? editText : newMessage;
    // Remove the partial @search from the message
    const lastAtIndex = currentText.lastIndexOf('@');
    const textBeforeAt = lastAtIndex >= 0 ? currentText.slice(0, lastAtIndex) : currentText;
    
    // Build mention tags
    const mentionTags = selectedMentions.map(m => `@${m.username}`).join(' ');
    const finalText = `${textBeforeAt}${mentionTags} `;

    if (editingMessage) {
      setEditText(finalText);
    } else {
      setNewMessage(finalText);
    }
    setShowMentionPicker(false);
    setMentionSearch('');
    setSelectedMentions([]); // Clear selections for next mention
  };

  // Remove a mention tag from the message
  const removeMention = (username: string) => {
    const currentText = editingMessage ? editText : newMessage;
    const updated = currentText.replace(new RegExp(`@${username}\\s?`, 'g'), '');
    if (editingMessage) {
      setEditText(updated);
    } else {
      setNewMessage(updated);
    }
    setSelectedMentions(prev => prev.filter(m => m.username !== username));
  };

  // Load wallpaper on mount
  useEffect(() => {
    if (currentConversationId) {
      setWallpaper(getChatWallpaper(currentConversationId));
    }
  }, [currentConversationId]);

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

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside emoji picker
      if (!target.closest('.emoji-picker-react') && !target.closest('[data-emoji-button]')) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Scroll to bottom - instant for new messages, smooth for user actions
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: behavior,
        });
      }
    });
  }, []);

  // Track if user is near bottom to auto-scroll on new messages - optimized with debouncing
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    // Mark that user is actively scrolling
    isUserScrollingRef.current = true;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce scroll detection
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        // More lenient threshold for auto-scroll (200px from bottom)
        isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 200;
      }
    }, 100);
  }, []);

  // Initialize conversation
  useEffect(() => {
    if (!userProfile) return;

    // Reset mentions tracking when conversation changes
    setAlreadyMentionedUsers(new Set());

    const initializeChat = async () => {
      try {
        // Handle AI Chat
        if (aiId) {
        setIsAIChat(true);
        const assistants = aiService.getAIAssistants();
        const aiAssistant = assistants.find(a => a.id === aiId);
        
        if (aiAssistant) {
          setParticipant({
            uid: `ai-${aiId}`,
            username: aiAssistant.name,
            photoURL: '', // Will use gradient icon instead
            isOnline: true,
            isAI: true,
            aiType: aiId,
          });
          
          // Load AI conversation from localStorage
          const savedMessages = localStorage.getItem(`ai-chat-${aiId}-${userProfile.uid}`);
          if (savedMessages) {
            try {
              const parsed = JSON.parse(savedMessages);
              setMessages(parsed.map((m: any) => ({
                ...m,
                createdAt: new Date(m.createdAt),
              })));
              // Scroll to bottom after loading AI messages
              setTimeout(() => scrollToBottom('auto'), 100);
            } catch (error) {
              console.error('Error loading AI messages:', error);
            }
          }
        }
        setLoading(false);
        return;
      }

      // Handle regular/group chat
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
              // Always set participant data, don't rely on prev being present
              setParticipant({
                uid: newUserId,
                username: data.username || userData.username,
                photoURL: data.photoURL || userData.photoURL || '',
                isOnline: data.isOnline || false,
                lastSeen: data.lastSeen?.toDate(),
                showActivity: data.showActivity !== false,
              });
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
          
          // Check if it's a group chat
          if (data.isGroup) {
            setGroupInfo({
              groupName: data.groupName || 'Group Chat',
              groupPhoto: data.groupPhoto || '',
              participants: data.participants || [],
              participantNames: data.participantNames || {},
              participantPhotos: data.participantPhotos || {},
              admins: data.admins || [],
              isGroup: true,
            });
          } else {
            // Regular 1-on-1 chat
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
                  // Always set participant data, don't rely on prev being present
                  setParticipant({
                    uid: otherId,
                    username: data.username || participantData.username || 'User',
                    photoURL: data.photoURL || participantData.photoURL || '',
                    isOnline: data.isOnline || false,
                    lastSeen: data.lastSeen?.toDate(),
                    showActivity: data.showActivity !== false,
                  });
                }
              });
            }
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
    } catch (error) {
      console.error('Error initializing chat:', error);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  initializeChat();
}, [conversationId, aiId, newUserId, userProfile, toast]);

  // Listen to messages
  useEffect(() => {
    if (!currentConversationId || currentConversationId === 'new' || !userProfile) return;

    // Reset initial load flag when conversation changes
    isInitialLoadRef.current = true;

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
          editedAt: docSnap.data().editedAt?.toDate() || undefined,
        }))
        .filter((msg: Message) => !msg.deletedFor?.includes(userProfile.uid)) as Message[];
      
      setMessages(fetchedMessages);
      
      // Extract all already mentioned user IDs from all messages
      const mentionedUserIds = new Set<string>();
      fetchedMessages.forEach((msg) => {
        if (msg.mentions && Array.isArray(msg.mentions)) {
          msg.mentions.forEach((mention) => {
            if (mention.uid) {
              mentionedUserIds.add(mention.uid);
            }
          });
        }
      });
      setAlreadyMentionedUsers(mentionedUserIds);
      
      // Only auto-scroll if user is near bottom and not actively scrolling (not initial load)
      if (!isInitialLoadRef.current && isNearBottomRef.current && !isUserScrollingRef.current) {
        scrollToBottom('smooth');
      }
    });

    return () => unsubscribe();
  }, [currentConversationId, userProfile, scrollToBottom]);

  // Ensure scroll to bottom after messages render on initial load
  useEffect(() => {
    if (messages.length > 0 && isInitialLoadRef.current && messagesContainerRef.current) {
      // Wait for images and media to load before scrolling
      // Use multiple delays to ensure content is fully rendered
      const scrollTimer = setTimeout(() => {
        if (messagesContainerRef.current) {
          // Force scroll to bottom
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          
          // Double-check after a brief moment in case images are still loading
          setTimeout(() => {
            if (messagesContainerRef.current && isInitialLoadRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              isInitialLoadRef.current = false;
            }
          }, 100);
        }
      }, 50);

      return () => clearTimeout(scrollTimer);
    }
  }, [messages.length]);

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
    if (!newMessage.trim() || !userProfile) return;
    
    // AI Chat handling
    if (isAIChat && participant?.isAI) {
      const messageText = newMessage.trim();
      setNewMessage('');
      setShowEmojiPicker(false);

      // Add user message
      const userMessageId = `user_${Date.now()}`;
      const userMessage: Message = {
        id: userMessageId,
        senderId: userProfile.uid,
        text: messageText,
        createdAt: new Date(),
        seen: true,
      };
      
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      scrollToBottom();

      // Save to localStorage
      localStorage.setItem(
        `ai-chat-${participant.aiType}-${userProfile.uid}`,
        JSON.stringify(updatedMessages)
      );

      // Show AI typing indicator
      setAITyping(true);

      try {
        // Get AI response
        const conversationHistory = messages
          .filter(m => !m.mediaUrl)
          .map(m => ({
            role: m.senderId === userProfile.uid ? 'user' as const : 'model' as const,
            parts: [{ text: m.text }],
          }));

        const aiResponse = await aiService.sendMessage(messageText, conversationHistory);

        // Add AI response
        const aiMessageId = `ai_${Date.now()}`;
        const aiMessage: Message = {
          id: aiMessageId,
          senderId: participant.uid,
          text: aiResponse,
          createdAt: new Date(),
          seen: true,
        };

        const newMessages = [...updatedMessages, aiMessage];
        setMessages(newMessages);
        scrollToBottom('smooth');

        // Save updated conversation
        localStorage.setItem(
          `ai-chat-${participant.aiType}-${userProfile.uid}`,
          JSON.stringify(newMessages)
        );
      } catch (error) {
        console.error('AI response error:', error);
        toast({
          title: 'AI unavailable',
          description: 'Could not get AI response. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setAITyping(false);
      }
      
      return;
    }

    // Regular chat handling
    if (!participant || participant.isAI) return;

    const messageText = newMessage.trim();
    const messageMentions = selectedMentions.length > 0 ? [...selectedMentions] : undefined;
    setNewMessage('');
    setShowEmojiPicker(false);
    setSelectedMentions([]);
    setShowMentionPicker(false);

    // Optimistic update - add message immediately to UI
    const optimisticId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      senderId: userProfile.uid,
      text: messageText,
      createdAt: new Date(),
      seen: false,
      mentions: messageMentions,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    requestAnimationFrame(() => scrollToBottom());

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
        ...(messageMentions ? { mentions: messageMentions } : {}),
      });

      // For group chats, mark all other participants as unread
      if (groupInfo) {
        const unreadUsers = groupInfo.participants.filter(p => p !== userProfile.uid);
        await updateDoc(doc(db, 'conversations', convId), {
          lastMessage: messageText,
          lastMessageTime: serverTimestamp(),
          unreadBy: unreadUsers,
        });
      } else {
        await updateDoc(doc(db, 'conversations', convId), {
          lastMessage: messageText,
          lastMessageTime: serverTimestamp(),
          unreadBy: [participant.uid],
        });
      }

      // Send notifications to mentioned users
      if (messageMentions && messageMentions.length > 0) {
        const notificationPromises = messageMentions.map(async (mention) => {
          // Don't send notification to self
          if (mention.uid === userProfile.uid) return;
          
          try {
            // Check for existing recent notification from this user in this conversation
            const recentNotificationQuery = query(
              collection(db, 'notifications'),
              where('type', '==', 'mention'),
              where('fromUserId', '==', userProfile.uid),
              where('toUserId', '==', mention.uid),
              where('conversationId', '==', convId),
              limit(1)
            );
            
            const existingNotifs = await getDocs(recentNotificationQuery);
            
            if (!existingNotifs.empty) {
              // Update existing notification instead of creating duplicate
              const existingNotifId = existingNotifs.docs[0].id;
              await updateDoc(doc(db, 'notifications', existingNotifId), {
                message: `@${userProfile.username} mentioned you in a message`,
                read: false,
                createdAt: serverTimestamp(),
              });
            } else {
              // Create new notification
              await addDoc(collection(db, 'notifications'), {
                type: 'mention',
                fromUserId: userProfile.uid,
                fromUsername: userProfile.username,
                fromUserPhoto: userProfile.photoURL || '',
                toUserId: mention.uid,
                conversationId: convId,
                message: `@${userProfile.username} mentioned you in a message`,
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          } catch (error) {
            console.error('Error sending mention notification:', error);
          }
        });
        
        await Promise.all(notificationPromises);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setNewMessage(messageText);
      toast({
        title: 'Failed to send',
        description: 'Message could not be sent. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    if (editingMessage) {
      setEditText((prev) => prev + emojiData.emoji);
    } else {
      setNewMessage((prev) => prev + emojiData.emoji);
    }
  };

  // Check if message can be edited (within 60 seconds)
  const canEditMessage = useCallback((message: Message): boolean => {
    if (!userProfile || message.senderId !== userProfile.uid) return false;
    if (message.mediaUrl) return false; // Can't edit media messages
    const now = new Date().getTime();
    const messageTime = message.createdAt.getTime();
    return (now - messageTime) < 60000; // 60 seconds
  }, [userProfile]);

  const handleStartEdit = useCallback((message: Message) => {
    setEditingMessage(message);
    setEditText(message.text);
    setShowEmojiPicker(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setEditText('');
  }, []);

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim() || !currentConversationId) return;
    if (!canEditMessage(editingMessage)) {
      toast({
        title: 'Cannot edit',
        description: 'Edit window (60 seconds) has expired.',
        variant: 'destructive',
      });
      handleCancelEdit();
      return;
    }

    const trimmedText = editText.trim();
    const oldText = editingMessage.text;
    
    // Optimistic update
    setMessages(prev => prev.map(m => 
      m.id === editingMessage.id ? { ...m, text: trimmedText, isEdited: true, editedAt: new Date() } : m
    ));
    handleCancelEdit();

    try {
      const messageRef = doc(db, 'conversations', currentConversationId, 'messages', editingMessage.id);
      await updateDoc(messageRef, {
        text: trimmedText,
        isEdited: true,
        editedAt: serverTimestamp(),
      });

      // Update lastMessage in conversation if this was the latest message
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.id === editingMessage.id) {
        await updateDoc(doc(db, 'conversations', currentConversationId), {
          lastMessage: trimmedText,
        });
      }
    } catch (error) {
      console.error('Error editing message:', error);
      // Revert optimistic update
      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id ? { ...m, text: oldText, isEdited: editingMessage.isEdited, editedAt: editingMessage.editedAt } : m
      ));
      toast({
        title: 'Edit failed',
        description: 'Could not edit message. Please try again.',
        variant: 'destructive',
      });
    }
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

  // Render text with clickable profile links and URLs
  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    
    // Match profile links and regular URLs
    const profileLinkRegex = /(https?:\/\/[^\s]*\/user\/[^\s]+)/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Check for profile share pattern
    const profileMatch = text.match(/\/user\/([\w-]+)/);
    if (profileMatch) {
      const parts = text.split(urlRegex);
      return (
        <span>
          {parts.map((part, i) => {
            if (urlRegex.test(part)) {
              const userMatch = part.match(/\/user\/([\w-]+)/);
              if (userMatch) {
                return (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigate(`/user/${userMatch[1]}`);
                    }}
                    className="text-blue-400 underline hover:text-blue-300 break-all"
                  >
                    {part}
                  </button>
                );
              }
              return (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-400 underline hover:text-blue-300 break-all"
                >
                  {part}
                </a>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    }
    
    // Handle regular URLs
    const urlParts = text.split(urlRegex);
    if (urlParts.length > 1) {
      return (
        <span>
          {urlParts.map((part, i) => {
            if (urlRegex.test(part)) {
              return (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-400 underline hover:text-blue-300 break-all"
                >
                  {part}
                </a>
              );
            }
            return renderMentionsInText(part, i);
          })}
        </span>
      );
    }
    
    return renderMentionsInText(text, 0);
  };

  // Render @mentions as highlighted clickable tags
  const renderMentionsInText = (text: string, keyPrefix: number) => {
    const mentionRegex = /@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(<span key={`${keyPrefix}-t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
      }
      // Add highlighted mention
      const mentionUsername = match[1];
      parts.push(
        <button
          key={`${keyPrefix}-m-${match.index}`}
          onClick={(e) => {
            e.stopPropagation();
            // Find the user and navigate to their profile
            const mentionedUser = mentionableUsers.find(u => u.username === mentionUsername);
            if (mentionedUser) {
              navigate(`/profile/${mentionedUser.uid}`);
            }
          }}
          className="inline-flex items-center bg-primary/20 text-primary font-semibold rounded px-1 py-0.5 text-sm hover:bg-primary/30 transition-colors"
        >
          @{mentionUsername}
        </button>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`${keyPrefix}-t-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? <span>{parts}</span> : <span>{text}</span>;
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
    return (
      <p className="text-sm emoji-text" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        {renderTextWithLinks(message.text)}
      </p>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex-shrink-0 glass border-b border-border z-10">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => navigate(isAIChat ? '/ai-chats' : '/messages')} className="p-2 -ml-2 flex-shrink-0">
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <button
              onClick={() => {
                if (isAIChat) return; // No profile for AI
                if (groupInfo) {
                  setShowUserInfoDialog(true); // Show group info
                } else if (participant) {
                  navigate(`/user/${participant.uid}`);
                }
              }}
              className="flex items-center gap-3 flex-1 min-w-0"
              disabled={isAIChat}
            >
              {/* Profile/Group/AI Icon */}
              <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${
                isAIChat 
                  ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400' 
                  : groupInfo 
                    ? 'bg-gradient-to-br from-primary/20 to-primary/10'
                    : 'bg-secondary'
              }`}>
                {isAIChat ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                ) : groupInfo ? (
                  groupInfo.groupPhoto ? (
                    <img
                      src={groupInfo.groupPhoto}
                      alt={groupInfo.groupName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  )
                ) : participant?.photoURL ? (
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
              
              {/* Name and Status */}
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1 max-w-full">
                  <p className="font-semibold text-sm truncate flex-1">
                    {isAIChat ? participant?.username : groupInfo?.groupName || participant?.username}
                  </p>
                  {isAIChat && participant?.aiType === 'meta-ai' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500 flex-shrink-0" />
                  )}
                </div>
                {isAIChat ? (
                  <p className="text-xs text-muted-foreground truncate">AI Assistant</p>
                ) : groupInfo ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {groupInfo.participants.length} members
                  </p>
                ) : participant?.showActivity !== false ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {participant?.isOnline 
                      ? 'Active now' 
                      : participant?.lastSeen 
                        ? `Active ${formatDistanceToNow(participant.lastSeen, { addSuffix: true })}`
                        : 'Offline'
                    }
                  </p>
                ) : null}
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Hide call buttons for AI chats and group chats */}
            {!isAIChat && !groupInfo && (
              <>
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
              </>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isAIChat && !groupInfo && (
                  <DropdownMenuItem onClick={async () => {
                    if (!participant) return;
                    try {
                      const userDoc = await getDoc(doc(db, 'users', participant.uid));
                      if (userDoc.exists()) {
                        const data = userDoc.data();
                        setParticipantFollowers(data.followers || []);
                        setParticipantFollowing(data.following || []);
                      }
                      setShowUserInfoDialog(true);
                    } catch (error) {
                      console.error('Error fetching user info:', error);
                    }
                  }}>
                    <User className="w-4 h-4 mr-2" />
                    View info
                  </DropdownMenuItem>
                )}
                {groupInfo && (
                  <DropdownMenuItem onClick={() => setShowUserInfoDialog(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Group info
                  </DropdownMenuItem>
                )}
                {isAIChat && (
                  <DropdownMenuItem onClick={() => {
                    if (participant?.aiType) {
                      localStorage.removeItem(`ai-chat-${participant.aiType}-${userProfile?.uid}`);
                      setMessages([]);
                      toast({
                        title: 'Chat cleared',
                        description: 'All messages have been deleted.',
                      });
                    }
                  }}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear chat
                  </DropdownMenuItem>
                )}
                {!isAIChat && (
                  <>
                    <DropdownMenuItem onClick={() => setShowWallpaperPicker(true)}>
                      <Palette className="w-4 h-4 mr-2" />
                      Wallpaper
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowClearChatDialog(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile?tab=saved')}>
                      <Bookmark className="w-4 h-4 mr-2" />
                      Saved messages
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 chat-messages" 
        style={{ 
          minHeight: 0,
          scrollBehavior: 'auto',
          WebkitOverflowScrolling: 'touch',
          willChange: 'scroll-position',
          ...getWallpaperStyle(wallpaper) 
        }}
      >
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
          messages.map((message) => {
            const isMine = message.senderId === userProfile?.uid;
            const editable = canEditMessage(message);
            
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className={`max-w-[75%] px-4 py-2 cursor-pointer ${isMine ? 'message-sent' : 'message-received'}`} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {renderMessage(message)}
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        <p className="text-xs">
                          {formatDistanceToNow(message.createdAt, { addSuffix: false })}
                        </p>
                        {message.isEdited && (
                          <span className="text-xs italic">· edited</span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {editable && (
                      <DropdownMenuItem onClick={() => handleStartEdit(message)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
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
              </div>
            );
          })
        )}
        
        {/* AI Typing Indicator */}
        {aiTyping && isAIChat && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4"
          >
            <div className="flex items-end gap-2 max-w-[75%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="px-4 py-3 message-received">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Edit message banner */}
      {editingMessage && (
        <div className="flex-shrink-0 border-t border-border px-4 py-2 bg-secondary/50 flex items-center gap-3">
          <Pencil className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-medium">Editing message</p>
            <p className="text-xs text-muted-foreground truncate">{editingMessage.text}</p>
          </div>
          <button onClick={handleCancelEdit} className="p-1 hover:bg-secondary rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-2 bg-background" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
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
            {/* Hide attachment button for AI chats */}
            {!isAIChat && (
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
            )}
            
            <div className="flex-1 relative">
              {/* Mention tags above input */}
              {selectedMentions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1 px-1">
                  {selectedMentions.map(m => (
                    <span key={m.uid} className="inline-flex items-center gap-1 bg-primary/15 text-primary text-xs font-medium rounded-full px-2 py-0.5">
                      @{m.username}
                      <button onClick={() => removeMention(m.username)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Mention Picker Popup */}
              <AnimatePresence>
                {showMentionPicker && !isAIChat && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-14 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-50 max-h-80 flex flex-col"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <AtSign className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Mention Users</span>
                      </div>
                      <button onClick={() => { setShowMentionPicker(false); setMentionSearch(''); setSelectedMentions([]); }} className="p-1 hover:bg-secondary rounded-full">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Tabs for Followers/Following (only show for non-group chats) */}
                    {!groupInfo && (
                      <div className="flex border-b border-border">
                        <button
                          onClick={() => setMentionTab('followers')}
                          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                            mentionTab === 'followers' 
                              ? 'text-primary border-b-2 border-primary' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Followers ({mentionableUsers.filter(u => u.isFollower).length})
                        </button>
                        <button
                          onClick={() => setMentionTab('following')}
                          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                            mentionTab === 'following' 
                              ? 'text-primary border-b-2 border-primary' 
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Following ({mentionableUsers.filter(u => u.isFollowing).length})
                        </button>
                      </div>
                    )}
                    
                    <div className="flex-1 overflow-y-auto">
                      {mentionableUsers
                        .filter(u => {
                          // Filter by tab (only for non-group chats)
                          if (!groupInfo) {
                            if (mentionTab === 'followers' && !u.isFollower) return false;
                            if (mentionTab === 'following' && !u.isFollowing) return false;
                          }
                          // Filter by search
                          if (mentionSearch && !u.username.toLowerCase().includes(mentionSearch.toLowerCase())) return false;
                          return true;
                        })
                        .map(user => {
                          const isSelected = selectedMentions.some(m => m.uid === user.uid);
                          const alreadyMentioned = alreadyMentionedUsers.has(user.uid);
                          return (
                            <button
                              key={user.uid}
                              onClick={() => toggleMentionUser(user)}
                              disabled={alreadyMentioned}
                              className={`flex items-center gap-3 w-full px-3 py-2.5 transition-colors ${
                                alreadyMentioned 
                                  ? 'opacity-50 cursor-not-allowed bg-secondary/30' 
                                  : 'hover:bg-secondary/60'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                alreadyMentioned 
                                  ? 'bg-muted border-muted' 
                                  : isSelected 
                                    ? 'bg-primary border-primary' 
                                    : 'border-muted-foreground/40'
                              }`}>
                                {alreadyMentioned ? (
                                  <X className="w-3 h-3 text-muted-foreground" />
                                ) : isSelected ? (
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                ) : null}
                              </div>
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                                {user.photoURL ? (
                                  <img src={user.photoURL} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                    {user.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <span className="text-sm font-medium truncate">{user.username}</span>
                                {alreadyMentioned && (
                                  <span className="text-xs text-muted-foreground block">Already mentioned</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      {mentionableUsers.filter(u => {
                        if (!groupInfo) {
                          if (mentionTab === 'followers' && !u.isFollower) return false;
                          if (mentionTab === 'following' && !u.isFollowing) return false;
                        }
                        if (mentionSearch && !u.username.toLowerCase().includes(mentionSearch.toLowerCase())) return false;
                        return true;
                      }).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                      )}
                    </div>
                    <div className="border-t border-border px-3 py-2">
                      <Button
                        size="sm"
                        onClick={confirmMentions}
                        disabled={selectedMentions.length === 0}
                        className="w-full h-8 text-sm font-semibold btn-gradient"
                      >
                        Done ({selectedMentions.length} selected)
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Input
                value={editingMessage ? editText : newMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (editingMessage) {
                      handleSaveEdit();
                    } else {
                      handleSend();
                    }
                  }
                  if (e.key === 'Escape' && editingMessage) {
                    handleCancelEdit();
                  }
                }}
                placeholder={
                  editingMessage 
                    ? "Edit message..." 
                    : isAIChat 
                      ? "Ask me anything..." 
                      : "Message..."
                }
                className="pr-10 rounded-full emoji-text"
                disabled={uploading}
              />
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                data-emoji-button
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-14 right-0 z-50"
                  >
                    <EmojiPicker 
                      onEmojiClick={handleEmojiSelect}
                      theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                      width={320}
                      height={400}
                      previewConfig={{ showPreview: false }}
                      searchPlaceHolder="Search emoji..."
                      skinTonesDisabled
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {uploading ? (
              <div className="p-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : editingMessage ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="p-2 rounded-full text-primary disabled:opacity-50"
              >
                <Check className="w-6 h-6" />
              </motion.button>
            ) : newMessage.trim() ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={sending || aiTyping}
                className="p-2 rounded-full text-primary disabled:opacity-50"
              >
                <Send className="w-6 h-6" />
              </motion.button>
            ) : !isAIChat ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={startRecording}
                className="p-2 rounded-full text-muted-foreground hover:text-primary transition-colors"
              >
                <Mic className="w-6 h-6" />
              </motion.button>
            ) : (
              <div className="p-2">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              </div>
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

      {/* User Info Dialog - shown on double tap of username */}
      <Dialog open={showUserInfoDialog} onOpenChange={setShowUserInfoDialog}>
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center">
              {groupInfo ? groupInfo.groupName : participant?.username}
            </DialogTitle>
          </DialogHeader>
          
          {groupInfo ? (
            /* Group Info - Show Members */
            <div className="flex flex-col py-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 mb-3">
                  {groupInfo.groupPhoto ? (
                    <img
                      src={groupInfo.groupPhoto}
                      alt={groupInfo.groupName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {groupInfo.participants.length} members
                </p>
              </div>
              
              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-semibold mb-2 px-1">Group Members</h3>
                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                  {groupInfo.participants.map((uid) => {
                    const username = groupInfo.participantNames[uid] || 'User';
                    const photoURL = groupInfo.participantPhotos[uid] || '';
                    const isCurrentUser = uid === userProfile?.uid;
                    
                    return (
                      <button
                        key={uid}
                        onClick={() => {
                          if (!isCurrentUser) {
                            setShowUserInfoDialog(false);
                            navigate(`/user/${uid}`);
                          }
                        }}
                        className="flex items-center gap-3 px-2 py-2 hover:bg-secondary rounded-lg transition-colors"
                        disabled={isCurrentUser}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                          {photoURL ? (
                            <img
                              src={photoURL}
                              alt={username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                              {username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">
                            {username}
                            {isCurrentUser && <span className="text-muted-foreground ml-1">(You)</span>}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* 1-on-1 Chat Info - Show Participant Profile */
            <div className="flex flex-col items-center py-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary mb-4">
                {participant?.photoURL ? (
                  <img
                    src={participant.photoURL}
                    alt={participant.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                    {participant?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-8 mt-2">
                <div className="text-center">
                  <p className="font-bold text-lg">{participantFollowers.length}</p>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{participantFollowing.length}</p>
                  <p className="text-sm text-muted-foreground">Following</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowUserInfoDialog(false);
                    navigate(`/user/${participant?.uid}`);
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Wallpaper Picker */}
      {currentConversationId && (
        <ChatWallpaperPicker
          isOpen={showWallpaperPicker}
          onClose={() => setShowWallpaperPicker(false)}
          conversationId={currentConversationId}
          onWallpaperChange={setWallpaper}
          currentWallpaper={wallpaper}
        />
      )}
    </div>
  );
};

export default ChatRoom;
