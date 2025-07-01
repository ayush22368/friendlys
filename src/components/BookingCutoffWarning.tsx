import { AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isBookingCutoffReached, getBookingCutoffMessage } from '@/lib/timeUtils';

interface BookingCutoffWarningProps {
  selectedDate?: string;
}

const BookingCutoffWarning = ({ selectedDate }: BookingCutoffWarningProps) => {
  // Only show warning if there's a selected date and it's affected by cutoff
  if (!selectedDate || !isBookingCutoffReached(selectedDate)) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center space-x-2">
        <Clock className="h-4 w-4" />
        <span>Booking Closed</span>
      </AlertTitle>
      <AlertDescription>
        {getBookingCutoffMessage(selectedDate)}
      </AlertDescription>
    </Alert>
  );
};

export default BookingCutoffWarning;
