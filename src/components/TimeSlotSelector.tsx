import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TimeSlotSelectorProps {
  companionId: string;
  selectedDate: string;
  selectedTime: string;
  duration: number;
  onTimeSelect: (time: string) => void;
}

interface TimeSlot {
  slot_type: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked: boolean;
  source: string;
}

const TimeSlotSelector = ({ 
  companionId, 
  selectedDate, 
  selectedTime, 
  duration, 
  onTimeSelect 
}: TimeSlotSelectorProps) => {
  const [isCompanionAvailable, setIsCompanionAvailable] = useState<boolean | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isDayUnavailable, setIsDayUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companionId && selectedDate) {
      fetchAvailabilityData();
    }
  }, [companionId, selectedDate]);

  const fetchAvailabilityData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 FETCHING AVAILABILITY DATA');
      console.log('Companion ID:', companionId);
      console.log('Selected Date:', selectedDate);
      
      // Check companion general availability
      const { data: companionData, error: companionError } = await supabase
        .from('companions')
        .select('is_available')
        .eq('id', companionId)
        .single();

      if (companionError) {
        console.error('❌ Error fetching companion:', companionError);
        setError(`Failed to fetch companion data: ${companionError.message}`);
        return;
      }

      const companionAvailable = companionData?.is_available ?? false;
      setIsCompanionAvailable(companionAvailable);
      console.log('✅ Companion general availability:', companionAvailable);

      if (!companionAvailable) {
        return;
      }

      // Use the updated database function to get time slots
      const formattedDate = new Date(selectedDate).toISOString().split('T')[0];
      console.log('📅 Formatted date for query:', formattedDate);
      
      const { data: slotsData, error: slotsError } = await supabase
        .rpc('get_companion_time_slots', {
          _companion_id: companionId,
          _date: formattedDate
        });

      if (slotsError) {
        console.error('❌ Error fetching time slots:', slotsError);
        setError(`Database error: ${slotsError.message}`);
        toast({
          title: "Database Error",
          description: `Failed to fetch time slots: ${slotsError.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('📊 Raw slots data from database:', slotsData);

      // If no slots returned, it means the day is unavailable
      if (!slotsData || slotsData.length === 0) {
        console.log('🚫 No slots returned - day is unavailable');
        setIsDayUnavailable(true);
        setTimeSlots([]);
      } else {
        console.log('✅ Slots found:', slotsData.length);
        console.log('🔎 DETAILED SLOT ANALYSIS:');
        slotsData.forEach((slot, index) => {
          console.log(`Slot ${index + 1}:`, {
            type: slot.slot_type,
            time: `${slot.start_time}-${slot.end_time}`,
            available: slot.is_available,
            booked: slot.is_booked,
            source: slot.source
          });
        });
        
        // Group by slot types for analysis
        const defaultSlots = slotsData.filter(s => s.slot_type === 'default');
        const specificSlots = slotsData.filter(s => s.slot_type === 'specific');
        const combinedSlots = slotsData.filter(s => s.slot_type === 'combined_default');
        
        console.log('📋 SLOT BREAKDOWN:');
        console.log(`- Default slots: ${defaultSlots.length}`);
        console.log(`- Specific slots: ${specificSlots.length}`);
        console.log(`- Combined default slots: ${combinedSlots.length}`);
        console.log(`- Total slots: ${slotsData.length}`);
        
        setIsDayUnavailable(false);
        setTimeSlots(slotsData);
      }

    } catch (error) {
      console.error('💥 UNEXPECTED ERROR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Unexpected error: ${errorMessage}`);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching availability",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableTimeSlots = () => {
    if (isDayUnavailable || timeSlots.length === 0) {
      return [];
    }

    const availableSlots: string[] = [];
    const durationMinutes = duration * 60;
    
    console.log('🎯 GENERATING AVAILABLE TIME SLOTS');
    console.log('Duration needed (minutes):', durationMinutes);
    
    // Filter for available AND not booked slots
    const availableNotBookedSlots = timeSlots.filter(slot => slot.is_available && !slot.is_booked);
    console.log('📝 Available & not booked slots:', availableNotBookedSlots.length);
    console.log('📝 Slot details:', availableNotBookedSlots.map(s => ({
      type: s.slot_type,
      time: `${s.start_time}-${s.end_time}`,
      source: s.source
    })));
    
    if (availableNotBookedSlots.length === 0) {
      console.log('❌ No available slots found');
      return [];
    }

    // Check if we have only specific slots (no default/combined slots)
    const hasDefaultOrCombined = availableNotBookedSlots.some(s => 
      s.slot_type === 'default' || s.slot_type === 'combined_default'
    );
    const hasSpecificOnly = availableNotBookedSlots.every(s => s.slot_type === 'specific');
    
    console.log('🔍 SLOT ANALYSIS:');
    console.log('- Has default/combined slots:', hasDefaultOrCombined);
    console.log('- Has specific slots only:', hasSpecificOnly);

    // If only specific slots, handle them individually
    if (hasSpecificOnly) {
      console.log('🎯 PROCESSING SPECIFIC-ONLY SLOTS');
      
      availableNotBookedSlots.forEach(slot => {
        const slotStart = timeToMinutes(slot.start_time);
        const slotEnd = timeToMinutes(slot.end_time);
        const slotDuration = slotEnd - slotStart;
        
        console.log(`📋 Processing specific slot ${slot.start_time}-${slot.end_time}:`);
        console.log(`   - Slot duration: ${slotDuration} minutes`);
        console.log(`   - Required duration: ${durationMinutes} minutes`);
        
        if (slotDuration >= durationMinutes) {
          const timeStr = slot.start_time;
          availableSlots.push(timeStr);
          console.log(`✅ Added specific slot: ${timeStr}`);
        } else {
          console.log(`❌ Slot too short: ${slotDuration} < ${durationMinutes} minutes`);
        }
      });
    } else {
      // Handle default/combined slots with consecutive grouping
      console.log('🎯 PROCESSING DEFAULT/COMBINED SLOTS');
      
      const consecutiveGroups: TimeSlot[][] = [];
      let currentGroup: TimeSlot[] = [availableNotBookedSlots[0]];
      
      for (let i = 1; i < availableNotBookedSlots.length; i++) {
        const currentSlot = availableNotBookedSlots[i];
        const previousSlot = currentGroup[currentGroup.length - 1];
        
        const currentStart = timeToMinutes(currentSlot.start_time);
        const previousEnd = timeToMinutes(previousSlot.end_time);
        
        if (currentStart === previousEnd) {
          currentGroup.push(currentSlot);
        } else {
          consecutiveGroups.push(currentGroup);
          currentGroup = [currentSlot];
        }
      }
      if (currentGroup.length > 0) {
        consecutiveGroups.push(currentGroup);
      }
      
      console.log(`📊 Found ${consecutiveGroups.length} consecutive groups`);
      
      consecutiveGroups.forEach((group, groupIndex) => {
        if (group.length === 0) return;
        
        const periodStart = timeToMinutes(group[0].start_time);
        const periodEnd = timeToMinutes(group[group.length - 1].end_time);
        const periodDuration = periodEnd - periodStart;
        
        console.log(`📋 Group ${groupIndex + 1}: ${group[0].start_time}-${group[group.length - 1].end_time} (${periodDuration} min, ${group.length} slots)`);
        
        if (periodDuration >= durationMinutes) {
          for (let minutes = periodStart; minutes <= periodEnd - durationMinutes; minutes += 30) {
            const timeStr = minutesToTime(minutes);
            availableSlots.push(timeStr);
            console.log(`✅ Added booking slot: ${timeStr}`);
          }
        } else {
          console.log(`❌ Group too short: ${periodDuration} < ${durationMinutes} minutes`);
        }
      });
    }

    const uniqueSlots = [...new Set(availableSlots)].sort();
    console.log('🎯 FINAL AVAILABLE SLOTS:', uniqueSlots);
    return uniqueSlots;
  };

  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const formatTimeToIndian = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatTimeRange = (startTime: string, duration: number) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
    const endTimeStr = end.toTimeString().slice(0, 5);
    
    const startFormatted = formatTimeToIndian(startTime);
    const endFormatted = formatTimeToIndian(endTimeStr);
    
    return `${startFormatted} - ${endFormatted}`;
  };

  if (!selectedDate) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Please select a date first</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading availability...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Error Loading Time Slots</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            onClick={fetchAvailabilityData}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isCompanionAvailable === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Currently Unavailable</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This companion is currently unavailable for bookings. Please check back later or contact them directly.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isDayUnavailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Day Unavailable</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This companion is not available on {new Date(selectedDate).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}. Please choose a different date.
          </p>
        </CardContent>
      </Card>
    );
  }

  const availableTimeSlots = generateAvailableTimeSlots();

  if (availableTimeSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-600">
            <Clock className="w-5 h-5" />
            <span>No Time Slots Available</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            No available time slots for {new Date(selectedDate).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })} that can accommodate a {duration}-hour booking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-green-600" />
          <span>Available Time Slots</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose your preferred time for a {duration}-hour booking on {new Date(selectedDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {availableTimeSlots.map(timeStr => (
            <Button
              key={timeStr}
              type="button"
              variant={selectedTime === timeStr ? "default" : "outline"}
              onClick={() => onTimeSelect(timeStr)}
              className={`p-3 h-auto flex flex-col items-center justify-center space-y-1 text-center min-h-[70px] transition-all ${
                selectedTime === timeStr 
                  ? "bg-pink-500 hover:bg-pink-600 text-white shadow-md" 
                  : "hover:bg-pink-50 hover:border-pink-300 hover:shadow-sm"
              }`}
            >
              <div className="font-medium text-sm leading-tight">{formatTimeRange(timeStr, duration)}</div>
              <div className="text-xs opacity-80">
                {duration} hour{duration > 1 ? 's' : ''}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeSlotSelector;
