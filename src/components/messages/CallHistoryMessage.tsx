
import { Phone, Video, PhoneMissed } from 'lucide-react';

interface CallHistoryMessageProps {
  message: {
    callType: 'audio' | 'video';
    status: 'ended' | 'missed' | 'declined';
    duration?: number;
    callerId: string;
  };
  currentUserId: string;
}

const CallHistoryMessage: React.FC<CallHistoryMessageProps> = ({ message, currentUserId }) => {
  const isOutgoing = message.callerId === currentUserId;
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getCallIcon = () => {
    if (message.status === 'missed' || message.status === 'declined') {
      return <PhoneMissed className="w-5 h-5 mr-2" />;
    }
    return message.callType === 'video' 
      ? <Video className="w-5 h-5 mr-2" /> 
      : <Phone className="w-5 h-5 mr-2" />;
  };

  const getCallText = () => {
    switch (message.status) {
      case 'ended':
        return `${isOutgoing ? 'Outgoing' : 'Incoming'} ${message.callType} call · ${formatDuration(message.duration || 0)}`;
      case 'missed':
        return isOutgoing ? 'Call not answered' : 'Missed call';
      case 'declined':
        return 'Call declined';
      default:
        return 'Call';
    }
  };

  return (
    <div className="flex items-center text-sm text-gray-500">
      {getCallIcon()}
      <span>{getCallText()}</span>
    </div>
  );
};

export default CallHistoryMessage;
