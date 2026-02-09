import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Trash2, Archive, MessageCircleOff } from 'lucide-react';
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

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string;
  lastMessage: string;
  lastMessageTime: Date;
  unread: boolean;
}

interface MessageListItemProps {
  conversation: Conversation;
  onDelete?: (conversationId: string) => void;
}

const MessageListItem: React.FC<MessageListItemProps> = ({ conversation, onDelete }) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    onDelete?.(conversation.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex items-center gap-3 w-full p-4 hover:bg-secondary transition-colors group">
        <button
          onClick={() => navigate(`/messages/${conversation.id}`)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0">
            {conversation.participantPhoto ? (
              <img
                src={conversation.participantPhoto}
                alt={conversation.participantName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-muted-foreground">
                {conversation.participantName?.charAt(0).toUpperCase()}
              </div>
            )}
            {conversation.unread && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-background" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={`font-semibold text-sm ${conversation.unread ? '' : 'text-foreground'}`}>
                {conversation.participantName}
              </p>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(conversation.lastMessageTime, { addSuffix: false })}
              </span>
            </div>
            <p className={`text-sm truncate ${conversation.unread ? 'font-medium' : 'text-muted-foreground'}`}>
              {conversation.lastMessage}
            </p>
          </div>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-secondary/50 rounded-full transition-all">
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages with {conversation.participantName}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageListItem;
