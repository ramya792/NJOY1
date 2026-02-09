import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface ChangeUsernameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
}

const ChangeUsernameDialog: React.FC<ChangeUsernameDialogProps> = ({ 
  isOpen, 
  onClose, 
  currentUsername 
}) => {
  const { updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Username validation rules
  const validations = {
    minLength: newUsername.length >= 3,
    maxLength: newUsername.length <= 30,
    validChars: /^[a-zA-Z0-9._]+$/.test(newUsername),
    noConsecutiveDots: !/\.\./.test(newUsername),
    noStartEndDot: !/^\./.test(newUsername) && !/\.$/.test(newUsername),
    different: newUsername.toLowerCase() !== currentUsername.toLowerCase(),
  };

  const formatValid = validations.minLength && 
                      validations.maxLength && 
                      validations.validChars && 
                      validations.noConsecutiveDots && 
                      validations.noStartEndDot;

  // Check username availability with debounce
  useEffect(() => {
    if (!formatValid || !validations.different) {
      setIsAvailable(null);
      return;
    }

    const checkAvailability = async () => {
      setChecking(true);
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '==', newUsername)
        );
        const snapshot = await getDocs(usersQuery);
        setIsAvailable(snapshot.empty);
      } catch (error) {
        console.error('Error checking username:', error);
        setIsAvailable(null);
      } finally {
        setChecking(false);
      }
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [newUsername, formatValid, validations.different]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formatValid || !isAvailable) {
      toast({
        title: 'Invalid Username',
        description: 'Please choose a valid and available username.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({ username: newUsername });
      
      toast({
        title: 'Username Updated',
        description: `Your username is now @${newUsername}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Username change error:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not change username. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const ValidationItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? 'text-green-500' : 'text-muted-foreground'}`}>
      {valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {text}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Username</DialogTitle>
          <DialogDescription>
            Choose a unique username for your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                placeholder="username"
                className="pl-8"
                required
              />
              {checking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {!checking && isAvailable === true && validations.different && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {!checking && isAvailable === false && (
                <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {isAvailable === false && (
              <p className="text-xs text-destructive">This username is already taken.</p>
            )}
          </div>

          {/* Username Requirements */}
          <div className="grid grid-cols-1 gap-1 p-3 bg-secondary rounded-lg">
            <ValidationItem valid={validations.minLength} text="At least 3 characters" />
            <ValidationItem valid={validations.maxLength} text="Maximum 30 characters" />
            <ValidationItem valid={validations.validChars} text="Letters, numbers, dots, underscores only" />
            <ValidationItem valid={validations.noConsecutiveDots} text="No consecutive dots" />
            <ValidationItem valid={validations.noStartEndDot} text="Cannot start/end with dot" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formatValid || !isAvailable || !validations.different || loading} 
              className="flex-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Username'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeUsernameDialog;
