
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Booking {
  date: string;
  time: string;
  duration: number;
  status: string;
}

interface AvailableTimeSlotsProps {
  companionId: string;
  selectedDate?: string;
}

const AvailableTimeSlots = ({ companionId, selectedDate }: AvailableTimeSlotsProps) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailabilityAndBookings();
  }, [companionId, selectedDate]);

  const fetchAvailabilityAndBookings = async () => {
    try {
      setLoading(true);
      
      // Fetch availability slots
      let availabilityQuery = supabase
        .from('companion_availability')
        .select('*')
        .eq('companion_id', companionId)
        .eq('is_available', true);

      if (selectedDate) {
        availabilityQuery = availabilityQuery.eq('date', selectedDate);
      }

      const { data: availabilityData, error: availabilityError } = await availabilityQuery;

      if (availabilityError) {
        console.error('Error fetching availability:', availabilityError);
        return;
      }

      // Fetch existing bookings
      let bookingsQuery = supabase
        .from('bookings')
        .select('date, time, duration, status')
        .eq('companion_id', companionId)
        .in('status', ['pending', 'approved']);

      if (selectedDate) {
        bookingsQuery = bookingsQuery.eq('date', selectedDate);
      }

      const { data: bookingsData, error: bookingsError } = await bookingsQuery;

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
      }

      setTimeSlots(availabilityData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTimeSlotBooked = (slot: TimeSlot) => {
    return bookings.some(booking => {
      if (booking.date !== slot.date) return false;
      
      // Convert times to minutes for easier comparison
      const slotStart = timeToMinutes(slot.start_time);
      const slotEnd = timeToMinutes(slot.end_time);
      const bookingStart = timeToMinutes(booking.time);
      const bookingEnd = bookingStart + (booking.duration * 60);
      
      // Check if time slots overlap
      return (slotStart < bookingEnd && slotEnd > bookingStart);
    });
  };

  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const groupSlotsByDate = () => {
    const grouped = timeSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    // Sort each day's slots by start time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const groupedSlots = groupSlotsByDate();
  const dates = Object.keys(groupedSlots).sort();

  if (dates.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No availability slots set</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Available Time Slots</span>
        </CardTitle>
      </CardHeader>

      {dates.map(date => (
        <Card key={date}>
          <CardHeader className="pb-3">
            <h3 className="font-semibold text-lg">
              {new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {groupedSlots[date].map(slot => {
                const isBooked = isTimeSlotBooked(slot);
                return (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-lg border text-center ${
                      isBooked 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </div>
                    <Badge 
                      variant={isBooked ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {isBooked ? "Booked" : "Available"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AvailableTimeSlots;
