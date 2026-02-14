import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import React, { Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

// Eagerly loaded (critical path)
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import Home from "@/pages/Home";

// Lazy loaded (secondary pages)
const Search = React.lazy(() => import("@/pages/Search"));
const Reels = React.lazy(() => import("@/pages/Reels"));
const Messages = React.lazy(() => import("@/pages/Messages"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const Notifications = React.lazy(() => import("@/pages/Notifications"));
const CreatePost = React.lazy(() => import("@/pages/CreatePost"));
const UserProfile = React.lazy(() => import("@/pages/UserProfile"));
const ChatRoom = React.lazy(() => import("@/pages/ChatRoom"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const MessageRequests = React.lazy(() => import("@/pages/MessageRequests"));
const BlockedAccounts = React.lazy(() => import("@/pages/BlockedAccounts"));
const RestrictedAccounts = React.lazy(() => import("@/pages/RestrictedAccounts"));
const HiddenChats = React.lazy(() => import("@/pages/HiddenChats"));
const HelpCenter = React.lazy(() => import("@/pages/HelpCenter"));
const TermsOfService = React.lazy(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = React.lazy(() => import("@/pages/PrivacyPolicy"));
const VideoSongs = React.lazy(() => import("@/pages/VideoSongs"));
const AIChats = React.lazy(() => import("@/pages/AIChats"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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
  <Suspense fallback={<PageLoader />}>
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
        <Route path="/ai-chats" element={<AIChats />} />
        <Route path="/chat/:conversationId" element={<ChatRoom />} />
        <Route path="/chat/ai/:aiId" element={<ChatRoom />} />
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
  </Suspense>
);

const App = () => (
  <ErrorBoundary>
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
  </ErrorBoundary>
);

export default App;
