import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Lock, Bell, Eye, Shield, HelpCircle, 
  LogOut, ChevronRight, Moon, Sun, User, Globe, UserX,
  Heart, MessageCircle, Loader2, Key, AtSign, Music
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ChangePasswordDialog from '@/components/settings/ChangePasswordDialog';
import ChangeUsernameDialog from '@/components/settings/ChangeUsernameDialog';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Settings: React.FC = () => {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isPrivate, setIsPrivate] = useState(userProfile?.isPrivate ?? true);
  const [showActivity, setShowActivity] = useState(userProfile?.showActivity ?? true);
  const [allowMessages, setAllowMessages] = useState(userProfile?.allowMessages ?? true);
  const [likesNotifications, setLikesNotifications] = useState(userProfile?.notifications?.likes ?? true);
  const [commentsNotifications, setCommentsNotifications] = useState(userProfile?.notifications?.comments ?? true);
  const [followNotifications, setFollowNotifications] = useState(userProfile?.notifications?.follows ?? true);
  const [messagesNotifications, setMessagesNotifications] = useState(userProfile?.notifications?.messages ?? true);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);

  // Update activity status in Firestore when online
  useEffect(() => {
    if (!userProfile?.uid || !showActivity) return;

    const updateActivityStatus = async () => {
      try {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          lastSeen: serverTimestamp(),
          isOnline: true,
        });
      } catch (error) {
        console.error('Error updating activity status:', error);
      }
    };

    updateActivityStatus();

    // Set offline when leaving
    const handleBeforeUnload = async () => {
      if (userProfile?.uid) {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userProfile?.uid, showActivity]);

  const handleTogglePrivacy = async (value: boolean) => {
    setIsPrivate(value);
    setSaving(true);
    try {
      await updateUserProfile({ isPrivate: value });
      toast({
        title: value ? 'Account set to Private' : 'Account set to Public',
        description: value 
          ? 'Only approved followers can see your posts and reels.' 
          : 'Anyone can see your posts, reels, and profile.',
      });
    } catch (error) {
      setIsPrivate(!value);
      toast({ title: 'Failed to update privacy', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivity = async (value: boolean) => {
    setShowActivity(value);
    try {
      await updateUserProfile({ showActivity: value });
      
      // If disabling, hide online status
      if (!value && userProfile?.uid) {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          isOnline: false,
          lastSeen: null,
        });
      }
      
      toast({
        title: value ? 'Activity Status Visible' : 'Activity Status Hidden',
        description: value 
          ? 'Others can see when you were last active.' 
          : 'Your online status and last seen are now hidden.',
      });
    } catch (error) {
      setShowActivity(!value);
    }
  };

  const handleToggleMessages = async (value: boolean) => {
    setAllowMessages(value);
    try {
      await updateUserProfile({ allowMessages: value });
    } catch (error) {
      setAllowMessages(!value);
    }
  };

  const handleNotificationToggle = async (type: string, value: boolean) => {
    const updates: any = { notifications: { ...userProfile?.notifications, [type]: value } };
    
    switch (type) {
      case 'likes':
        setLikesNotifications(value);
        break;
      case 'comments':
        setCommentsNotifications(value);
        break;
      case 'follows':
        setFollowNotifications(value);
        break;
      case 'messages':
        setMessagesNotifications(value);
        break;
    }

    try {
      await updateUserProfile(updates);
    } catch (error) {
      switch (type) {
        case 'likes':
          setLikesNotifications(!value);
          break;
        case 'comments':
          setCommentsNotifications(!value);
          break;
        case 'follows':
          setFollowNotifications(!value);
          break;
        case 'messages':
          setMessagesNotifications(!value);
          break;
      }
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkMode(value);
    if (value) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    if (userProfile?.uid) {
      try {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error updating status on logout:', error);
      }
    }
    await logout();
    navigate('/login');
  };

  const settingSections = [
    {
      title: 'Account',
      items: [
        {
          icon: <Key className="w-5 h-5" />,
          label: 'Change Password',
          description: 'Update your account password',
          action: () => setShowPasswordDialog(true),
        },
        {
          icon: <AtSign className="w-5 h-5" />,
          label: 'Change Username',
          description: `Current: @${userProfile?.username || ''}`,
          action: () => setShowUsernameDialog(true),
        },
      ],
    },
    {
      title: 'Account Privacy',
      items: [
        {
          icon: <Lock className="w-5 h-5" />,
          label: 'Private Account',
          description: 'Only approved followers can see your posts & reels',
          toggle: true,
          toggleValue: isPrivate,
          onToggle: handleTogglePrivacy,
        },
        {
          icon: <Eye className="w-5 h-5" />,
          label: 'Show Activity Status',
          description: 'Let others see when you were last active or online',
          toggle: true,
          toggleValue: showActivity,
          onToggle: handleToggleActivity,
        },
        {
          icon: <MessageCircle className="w-5 h-5" />,
          label: 'Allow Messages',
          description: 'Let anyone send you messages',
          toggle: true,
          toggleValue: allowMessages,
          onToggle: handleToggleMessages,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: <Heart className="w-5 h-5" />,
          label: 'Likes',
          description: 'Notify when someone likes your posts',
          toggle: true,
          toggleValue: likesNotifications,
          onToggle: (v: boolean) => handleNotificationToggle('likes', v),
        },
        {
          icon: <MessageCircle className="w-5 h-5" />,
          label: 'Comments',
          description: 'Notify when someone comments on your posts',
          toggle: true,
          toggleValue: commentsNotifications,
          onToggle: (v: boolean) => handleNotificationToggle('comments', v),
        },
        {
          icon: <User className="w-5 h-5" />,
          label: 'Follow Requests',
          description: 'Notify when someone requests to follow you',
          toggle: true,
          toggleValue: followNotifications,
          onToggle: (v: boolean) => handleNotificationToggle('follows', v),
        },
        {
          icon: <Bell className="w-5 h-5" />,
          label: 'Messages',
          description: 'Notify when you receive new messages',
          toggle: true,
          toggleValue: messagesNotifications,
          onToggle: (v: boolean) => handleNotificationToggle('messages', v),
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />,
          label: 'Dark Mode',
          description: 'Toggle dark theme',
          toggle: true,
          toggleValue: darkMode,
          onToggle: handleDarkModeToggle,
        },
      ],
    },
    {
      title: 'Entertainment',
      items: [
        {
          icon: <Music className="w-5 h-5" />,
          label: 'Video Songs',
          description: 'Browse and watch music videos',
          action: () => navigate('/video-songs'),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: <Shield className="w-5 h-5" />,
          label: 'Blocked Accounts',
          description: 'Manage blocked users',
          action: () => navigate('/settings/blocked'),
        },
        {
          icon: <UserX className="w-5 h-5" />,
          label: 'Restricted Accounts',
          description: 'Manage restricted users',
          action: () => navigate('/settings/restricted'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: <HelpCircle className="w-5 h-5" />,
          label: 'Help Center',
          description: 'Get help and support',
          action: () => navigate('/settings/help'),
        },
        {
          icon: <Globe className="w-5 h-5" />,
          label: 'Terms of Service',
          description: 'Read our terms',
          action: () => navigate('/settings/terms'),
        },
        {
          icon: <Shield className="w-5 h-5" />,
          label: 'Privacy Policy',
          description: 'Read our privacy policy',
          action: () => navigate('/settings/privacy'),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate('/profile')} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg ml-2">Settings</h1>
          {saving && <Loader2 className="w-4 h-4 ml-auto animate-spin text-muted-foreground" />}
        </div>
      </header>

      {/* Settings Sections */}
      <div className="max-w-lg mx-auto">
        {settingSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.05 }}
            className="py-4"
          >
            <h2 className="px-4 text-sm font-semibold text-muted-foreground mb-2">
              {section.title}
            </h2>
            <div className="bg-card border-y border-border divide-y divide-border">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between px-4 py-3 ${
                    item.action && !item.toggle ? 'cursor-pointer hover:bg-secondary/50 transition-colors' : ''
                  }`}
                  onClick={item.action && !item.toggle ? item.action : undefined}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-muted-foreground">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {item.toggle ? (
                    <Switch
                      checked={item.toggleValue}
                      onCheckedChange={item.onToggle}
                      className="flex-shrink-0"
                    />
                  ) : item.action ? (
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Logout Button */}
        <div className="px-4 py-6">
          <Button
            onClick={() => setShowLogoutDialog(true)}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pb-6">
          NJOY v1.0.0
        </p>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowLogoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleLogout}
            >
              Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <ChangePasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
      />

      {/* Username Change Dialog */}
      <ChangeUsernameDialog
        isOpen={showUsernameDialog}
        onClose={() => setShowUsernameDialog(false)}
        currentUsername={userProfile?.username || ''}
      />
    </div>
  );
};

export default Settings;
