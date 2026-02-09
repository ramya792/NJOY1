import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  followers: string[];
  following: string[];
  postsCount: number;
  createdAt: Date;
  isPrivate?: boolean;
  showActivity?: boolean;
  isOnline?: boolean;
  lastSeen?: Date;
  allowMessages?: boolean;
  blockedUsers?: string[];
  restrictedUsers?: string[];
  savedPosts?: string[];
  savedReels?: string[];
  notifications?: {
    likes?: boolean;
    comments?: boolean;
    follows?: boolean;
    messages?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const createUserProfile = async (user: User, username?: string) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newProfile: Omit<UserProfile, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
        uid: user.uid,
        email: user.email || '',
        username: username || user.email?.split('@')[0] || '',
        displayName: user.displayName || username || '',
        photoURL: user.photoURL || '',
        bio: '',
        followers: [],
        following: [],
        postsCount: 0,
        createdAt: serverTimestamp(),
      };

      await setDoc(userRef, newProfile);
      return newProfile as unknown as UserProfile;
    }

    return userSnap.data() as UserProfile;
  };

  const fetchUserProfile = async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    
    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(userRef, (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setUserProfile(data);
      }
    });
    
    return unsubscribe;
  };

  // Update online status
  const updateOnlineStatus = async (uid: string, isOnline: boolean) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp(),
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        await updateOnlineStatus(user.uid, true);
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Track online status
  useEffect(() => {
    if (!user) return;

    // Set online when app is active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(user.uid, true);
      } else {
        updateOnlineStatus(user.uid, false);
      }
    };

    // Set offline when window closes
    const handleBeforeUnload = () => {
      updateOnlineStatus(user.uid, false);
    };

    // Set online when component mounts
    updateOnlineStatus(user.uid, true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (user) {
        updateOnlineStatus(user.uid, false);
      }
    };
  }, [user]);

  const signUp = async (email: string, password: string, username: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: username });
    await createUserProfile(user, username);
    await fetchUserProfile(user.uid);
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    let email = emailOrUsername;
    
    // If input doesn't look like an email, search by username
    if (!emailOrUsername.includes('@')) {
      const usersQuery = query(
        collection(db, 'users'),
        where('username', '==', emailOrUsername)
      );
      const snapshot = await getDocs(usersQuery);
      if (snapshot.empty) {
        throw { code: 'auth/user-not-found' };
      }
      email = snapshot.docs[0].data().email;
    }
    
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const { user } = await signInWithPopup(auth, googleProvider);
    await createUserProfile(user);
    await fetchUserProfile(user.uid);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, data, { merge: true });
    await fetchUserProfile(user.uid);
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
