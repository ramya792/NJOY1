
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import { useEffect, useState } from "react";

interface ActiveCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  participant: {
    photoURL?: string;
    username?: string;
  };
  callType: 'audio' | 'video';
}

const ActiveCall: React.FC<ActiveCallProps> = ({
  localStream,
  remoteStream,
  onEndCall,
  participant,
  callType,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(callType === 'audio');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMute = () => {
    if (localStream) {
      const newMutedState = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === 'video') {
      const newCameraOffState = !isCameraOff;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newCameraOffState;
      });
      setIsCameraOff(newCameraOffState);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between text-white p-8">
      {/* Remote Video */}
      <div className="absolute inset-0 w-full h-full">
        {remoteStream && !isCameraOff ? (
          <video
            ref={(video) => {
              if (video) video.srcObject = remoteStream;
            }}
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <Avatar className="w-48 h-48 border-4 border-gray-600">
              <AvatarImage src={participant.photoURL} />
              <AvatarFallback>{participant.username?.[0]}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Local Video */}
      <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        {localStream && !isCameraOff ? (
           <video
           ref={(video) => {
             if (video) video.srcObject = localStream;
           }}
           autoPlay
           muted
           className="w-full h-full object-cover"
         />
        ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <VideoOff className="w-12 h-12 text-gray-400" />
            </div>
        )}
      </div>

      {/* Call Info */}
      <div className="relative z-10 flex flex-col items-center mt-8">
        <h1 className="text-3xl font-bold">{participant.username}</h1>
        <p className="text-lg">{formatDuration(callDuration)}</p>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center space-x-6 mb-8">
        <Button onClick={toggleMute} variant="ghost" className="rounded-full w-16 h-16 bg-white/20 hover:bg-white/30">
          {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </Button>
        {callType === 'video' && (
            <Button onClick={toggleCamera} variant="ghost" className="rounded-full w-16 h-16 bg-white/20 hover:bg-white/30">
                {isCameraOff ? <VideoOff className="w-8 h-8" /> : <Video className="w-8 h-8" />}
            </Button>
        )}
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

export default ActiveCall;
