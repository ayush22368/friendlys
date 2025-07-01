
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface TelegramContactPopupProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUsername: string;
  companionName: string;
}

const TelegramContactPopup = ({ isOpen, onClose, telegramUsername, companionName }: TelegramContactPopupProps) => {
  const handleTelegramChat = () => {
    const telegramUrl = `https://t.me/${telegramUsername}`;
    window.open(telegramUrl, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-green-600">
            🎉 Booking Confirmed!
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-gray-700 mb-2">
              Your appointment with <strong>{companionName}</strong> has been confirmed!
            </p>
            <p className="text-sm text-gray-600">
              Contact directly via Telegram for any updates or questions.
            </p>
          </div>
          
          {telegramUsername && (
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">@{telegramUsername}</span>
              </div>
              
              <Button
                onClick={handleTelegramChat}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat on Telegram
              </Button>
            </div>
          )}
          
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TelegramContactPopup;
