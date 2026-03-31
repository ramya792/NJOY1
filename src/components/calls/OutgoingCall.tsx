
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, Phone, Video } from "lucide-react";

interface OutgoingCallProps {
  participant: {
    photoURL?: string;
    username?: string;
  };
  onEndCall: () => void;
  callType: 'audio' | 'video';
}

const OutgoingCall: React.FC<OutgoingCallProps> = ({ participant, onEndCall, callType }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center text-white">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="w-32 h-32 border-4 border-gray-600">
          <AvatarImage src={participant.photoURL} />
          <AvatarFallback>{participant.username?.[0]}</AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-bold">{participant.username}</h1>
        <p className="text-lg text-gray-400">Ringing...</p>
      </div>

      <div className="absolute bottom-16 flex items-center space-x-6">
        <div className="flex flex-col items-center space-y-2">
          {callType === 'video' ? <Video className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          <span className="text-xs">{callType === 'video' ? 'Video' : 'Audio'} Call</span>
        </div>
        <Button
          onClick={onEndCall}
          variant="destructive"
          className="rounded-full w-16 h-16 flex items-center justify-center"
        >
          <Phone className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );
};

export default OutgoingCall;
