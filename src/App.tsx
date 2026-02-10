import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Reels from "@/pages/Reels";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import CreatePost from "@/pages/CreatePost";
import UserProfile from "@/pages/UserProfile";
import ChatRoom from "@/pages/ChatRoom";
import Settings from "@/pages/Settings";
import MessageRequests from "@/pages/MessageRequests";
import BlockedAccounts from "@/pages/BlockedAccounts";
import RestrictedAccounts from "@/pages/RestrictedAccounts";
import HiddenChats from "@/pages/HiddenChats";
import HelpCenter from "@/pages/HelpCenter";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import VideoSongs from "@/pages/VideoSongs";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <h1 className="font-display font-bold text-2xl gradient-text">NJOY</h1>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/reels" element={<Reels />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/requests" element={<MessageRequests />} />
      <Route path="/messages/:conversationId" element={<ChatRoom />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/hidden-chats" element={<HiddenChats />} />
      <Route path="/settings/blocked" element={<BlockedAccounts />} />
      <Route path="/settings/restricted" element={<RestrictedAccounts />} />
      <Route path="/settings/help" element={<HelpCenter />} />
      <Route path="/settings/terms" element={<TermsOfService />} />
      <Route path="/settings/privacy" element={<PrivacyPolicy />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/create" element={<CreatePost />} />
      <Route path="/user/:userId" element={<UserProfile />} />
      <Route path="/video-songs" element={<VideoSongs />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
