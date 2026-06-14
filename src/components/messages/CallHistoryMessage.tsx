
import { Phone, Video, PhoneMissed } from 'lucide-react';

interface CallHistoryMessageProps {
  message: {
    callType?: 'audio' | 'video';
    type?: 'audio' | 'video';
    status?: 'ended' | 'missed' | 'declined';
    duration?: number;
    callerId: string;
  };
  currentUserId: string;
}

const CallHistoryMessage: React.FC<CallHistoryMessageProps> = ({ message, currentUserId }) => {
  const isOutgoing = message.callerId === currentUserId;
  const actualCallType = message.callType || message.type || 'audio';
  const status = message.status || 'ended';
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getCallIcon = () => {
    if (status === 'missed' || status === 'declined') {
      return <PhoneMissed className="w-5 h-5 mr-2" />;
    }
    return actualCallType === 'video' 
      ? <Video className="w-5 h-5 mr-2" /> 
      : <Phone className="w-5 h-5 mr-2" />;
  };

  const getCallText = () => {
    switch (status) {
      case 'ended':
        return `${isOutgoing ? 'Outgoing' : 'Incoming'} ${actualCallType} call${message.duration ? ` · ${formatDuration(message.duration)}` : ''}`;
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
