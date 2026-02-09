import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { CallData, CallService } from '@/lib/callService';
import { Button } from '@/components/ui/button';

interface IncomingCallProps {
  call: CallData | null;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCall: React.FC<IncomingCallProps> = ({ call, onAccept, onReject }) => {
  const [isRinging, setIsRinging] = useState(true);

  useEffect(() => {
    if (!call) return;

    // Auto-reject after 30 seconds
    const timeout = setTimeout(() => {
      if (call.id) {
        CallService.markAsMissed(call.id);
      }
      onReject();
    }, 30000);

    // Ring animation
    const ringInterval = setInterval(() => {
      setIsRinging(prev => !prev);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(ringInterval);
    };
  }, [call, onReject]);

  if (!call) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
          className="w-full max-w-sm"
        >
          <div className="text-center">
            {/* Caller Info */}
            <motion.div
              animate={{ scale: isRinging ? 1.05 : 1 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-secondary mb-4 ring-4 ring-primary/50">
                {call.callerPhoto ? (
                  <img
                    src={call.callerPhoto}
                    alt={call.callerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-semibold text-muted-foreground">
                    {call.callerName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-white font-semibold text-2xl mb-2">{call.callerName}</h2>
              <p className="text-white/70 flex items-center justify-center gap-2">
                {call.type === 'video' ? (
                  <>
                    <Video className="w-4 h-4" />
                    Video Call
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Voice Call
                  </>
                )}
              </p>
            </motion.div>

            {/* Call Actions */}
            <div className="flex items-center justify-center gap-8 mt-12">
              <button
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors animate-pulse"
              >
                <Phone className="w-8 h-8 text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IncomingCall;
