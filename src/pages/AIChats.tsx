import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bot, Palette, Book, Code, CheckCircle2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '@/lib/aiService';

const AIChats: React.FC = () => {
  const navigate = useNavigate();
  const aiAssistants = aiService.getAIAssistants();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'bot':
        return Bot;
      case 'palette':
        return Palette;
      case 'book':
        return Book;
      case 'code':
        return Code;
      default:
        return Bot;
    }
  };

  const handleAIClick = (aiId: string) => {
    navigate(`/chat/ai/${aiId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/messages')}
              className="p-2 hover:bg-secondary rounded-full transition-colors -ml-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">AI Chats</h1>
              <p className="text-xs text-muted-foreground">
                Choose your AI assistant
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full p-4">
          {/* Header Section */}
          <div className="text-center mb-6 py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400 mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">AI Assistants</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Get instant help from our AI-powered assistants. Choose the one that best fits your needs.
            </p>
          </div>

          {/* AI Assistants List */}
          <div className="space-y-3">
            {aiAssistants.map((ai, index) => {
              const Icon = getIcon(ai.icon);
              
              return (
                <motion.button
                  key={ai.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleAIClick(ai.id)}
                  className="w-full flex items-start gap-4 p-4 rounded-xl bg-card hover:bg-secondary/50 transition-all border border-border hover:border-primary/50 group"
                >
                  {/* AI Icon */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${ai.gradient} flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    {ai.verified && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
                        <CheckCircle2 className="w-3 h-3 text-white fill-blue-500" />
                      </div>
                    )}
                  </div>

                  {/* AI Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                        {ai.name}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ai.description}
                    </p>
                    
                    {/* Status Badge */}
                    <div className="mt-2 flex items-center gap-2">
                      {ai.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                          <Bot className="w-3 h-3" />
                          Available Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          <Sparkles className="w-3 h-3" />
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Info Footer */}
          <div className="mt-8 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium mb-1">About AI Assistants</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Our AI assistants are powered by advanced language models and are designed to help you with various tasks. They can answer questions, provide creative ideas, help with studies, and much more.
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-6 px-4">
            AI responses are generated automatically and may not always be accurate. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChats;
