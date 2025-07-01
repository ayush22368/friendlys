import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Plus, Trash2, CalendarX } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BUSINESS_HOURS, formatTimeToIndian } from '@/lib/timeUtils';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes?: string;
}

interface UnavailableDay {
  id: string;
  date: string;
  reason?: string;
}

const CompanionAvailabilityManager = () => {
  const { companionId, user } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<UnavailableDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({
    date: '',
    start_time: '',
    end_time: '',
    notes: ''
  });
  const [newUnavailableDay, setNewUnavailableDay] = useState({
    date: '',
    reason: ''
  });


  useEffect(() => {
    console.log('🔍 AUTH STATE CHECK:', {
      user: user?.id,
      companionId: companionId,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });
    
    if (companionId) {
      fetchAvailability();
      fetchUnavailableDays();
    }
  }, [companionId, user]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('companion_availability')
        .select('*')
        .eq('companion_id', companionId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching availability:', error);
        toast({
          title: "Error",
          description: "Failed to fetch availability slots",
          variant: "destructive"
        });
        return;
      }

      setSlots(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchUnavailableDays = async () => {
    try {
      console.log('🔍 FETCHING UNAVAILABLE DAYS FOR COMPANION:', companionId);
      console.log('🔍 USER ID:', user?.id);
      console.log('🔍 AUTH TOKEN EXISTS:', !!supabase.auth.getSession());
      
      const { data, error } = await supabase
        .from('companion_unavailable_days')
        .select('*')
        .eq('companion_id', companionId)
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ Error fetching unavailable days:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        return;
      }

      console.log('✅ FETCHED UNAVAILABLE DAYS:', data);
      setUnavailableDays(data || []);
    } catch (error) {
      console.error('💥 Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAvailabilitySlot = async () => {
    if (!newSlot.date || !newSlot.start_time || !newSlot.end_time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    if (newSlot.start_time >= newSlot.end_time || newSlot.start_time < BUSINESS_HOURS.START || newSlot.end_time > BUSINESS_HOURS.END) {
      toast({
        title: "Error",
        description: `End time must be after start time and within business hours (8 AM to 8 PM)`,
        variant: "destructive"
      });
      return;
    }

    // Check if the day is marked as unavailable
    const isDayUnavailable = unavailableDays.some(day => day.date === newSlot.date);
    if (isDayUnavailable) {
      toast({
        title: "Error",
        description: "Cannot add availability slot for a day marked as unavailable",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companion_availability')
        .insert({
          companion_id: companionId,
          date: newSlot.date,
          start_time: newSlot.start_time,
          end_time: newSlot.end_time,
          notes: newSlot.notes || null,
          is_available: false // Set as unavailable by default as requested
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding availability:', error);
        toast({
          title: "Error",
          description: "Failed to add availability slot",
          variant: "destructive"
        });
        return;
      }

      setSlots([...slots, data]);
      setNewSlot({ date: '', start_time: '', end_time: '', notes: '' });
      toast({
        title: "Success",
        description: "Time slot added (unavailable by default - toggle to make available)"
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const addUnavailableDay = async () => {
    console.log('🚀 STARTING ADD UNAVAILABLE DAY PROCESS');
    console.log('📋 Current auth state:', {
      userId: user?.id,
      companionId: companionId,
      userEmail: user?.email,
      selectedDate: newUnavailableDay.date,
      reason: newUnavailableDay.reason
    });

    if (!newUnavailableDay.date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive"
      });
      return;
    }

    if (!companionId) {
      console.error('❌ NO COMPANION ID FOUND');
      toast({
        title: "Error",
        description: "Companion ID not found",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) {
      console.error('❌ NO USER ID FOUND');
      toast({
        title: "Error", 
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    // Check if day already exists
    const dayExists = unavailableDays.some(day => day.date === newUnavailableDay.date);
    if (dayExists) {
      toast({
        title: "Error",
        description: "This day is already marked as unavailable",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📝 PREPARING TO INSERT UNAVAILABLE DAY:', {
        companion_id: companionId,
        date: newUnavailableDay.date,
        reason: newUnavailableDay.reason,
        user_id: user.id
      });

      // Test the current session first
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 CURRENT SESSION:', {
        hasSession: !!sessionData.session,
        userId: sessionData.session?.user?.id,
        sessionError: sessionError
      });

      // Test user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('👥 USER ROLES:', {
        roles: rolesData,
        rolesError: rolesError
      });

      const { data, error } = await supabase
        .from('companion_unavailable_days')
        .insert({
          companion_id: companionId,
          date: newUnavailableDay.date,
          reason: newUnavailableDay.reason || null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ SUPABASE INSERT ERROR:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        
        toast({
          title: "Error",
          description: `Failed to mark day as unavailable: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('✅ SUCCESSFULLY ADDED UNAVAILABLE DAY:', data);

      setUnavailableDays([...unavailableDays, data]);
      
      // Remove any existing availability slots for this day
      const slotsToRemove = slots.filter(slot => slot.date === newUnavailableDay.date);
      if (slotsToRemove.length > 0) {
        for (const slot of slotsToRemove) {
          await supabase
            .from('companion_availability')
            .delete()
            .eq('id', slot.id);
        }
        setSlots(slots.filter(slot => slot.date !== newUnavailableDay.date));
      }

      setNewUnavailableDay({ date: '', reason: '' });
      toast({
        title: "Success",
        description: "Day marked as unavailable successfully!"
      });

      // Refresh the unavailable days list to make sure it's up to date
      await fetchUnavailableDays();

    } catch (error) {
      console.error('💥 UNEXPECTED ERROR:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('companion_availability')
        .delete()
        .eq('id', slotId);

      if (error) {
        console.error('Error deleting slot:', error);
        toast({
          title: "Error",
          description: "Failed to delete availability slot",
          variant: "destructive"
        });
        return;
      }

      setSlots(slots.filter(slot => slot.id !== slotId));
      toast({
        title: "Success",
        description: "Availability slot deleted"
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteUnavailableDay = async (dayId: string) => {
    try {
      const { error } = await supabase
        .from('companion_unavailable_days')
        .delete()
        .eq('id', dayId);

      if (error) {
        console.error('Error deleting unavailable day:', error);
        toast({
          title: "Error",
          description: "Failed to remove unavailable day",
          variant: "destructive"
        });
        return;
      }

      setUnavailableDays(unavailableDays.filter(day => day.id !== dayId));
      toast({
        title: "Success",
        description: "Day is now available again"
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleSlotAvailability = async (slotId: string, currentAvailability: boolean) => {
    try {
      const { error } = await supabase
        .from('companion_availability')
        .update({ is_available: !currentAvailability })
        .eq('id', slotId);

      if (error) {
        console.error('Error updating slot availability:', error);
        toast({
          title: "Error",
          description: "Failed to update slot availability",
          variant: "destructive"
        });
        return;
      }

      setSlots(slots.map(slot => 
        slot.id === slotId 
          ? { ...slot, is_available: !currentAvailability }
          : slot
      ));

      toast({
        title: "Success",
        description: `Slot marked as ${!currentAvailability ? 'available' : 'unavailable'}`
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mark Whole Day Unavailable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarX className="w-5 h-5" />
            <span>Mark Day as Unavailable</span>
          </CardTitle>
          <div className="text-xs text-gray-500">
            Debug: User ID: {user?.id}, Companion ID: {companionId}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unavailable_date">Date</Label>
              <Input
                id="unavailable_date"
                type="date"
                value={newUnavailableDay.date}
                onChange={(e) => setNewUnavailableDay({ ...newUnavailableDay, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                type="text"
                placeholder="Personal leave, holiday, etc."
                value={newUnavailableDay.reason}
                onChange={(e) => setNewUnavailableDay({ ...newUnavailableDay, reason: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={addUnavailableDay} variant="destructive" className="w-full">
            <CalendarX className="w-4 h-4 mr-2" />
            Mark Day as Unavailable
          </Button>
        </CardContent>
      </Card>

      {/* Add Specific Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Add Specific Time Slot</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            New slots are marked as unavailable by default. Toggle them to make available.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newSlot.date}
                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Any special notes..."
              value={newSlot.notes}
              onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
            />
          </div>
          <Button onClick={addAvailabilitySlot} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Time Slot (Unavailable by Default)
          </Button>
        </CardContent>
      </Card>

      {/* Unavailable Days */}
      {unavailableDays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unavailable Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unavailableDays.map((day) => (
                <div key={day.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <CalendarX className="w-4 h-4 text-red-500" />
                      <span className="font-medium">
                        {new Date(day.date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    {day.reason && (
                      <span className="text-sm text-gray-600">({day.reason})</span>
                    )}
                    <Badge variant="destructive">Unavailable</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteUnavailableDay(day.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Your Time Slots</CardTitle>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No time slots added yet</p>
          ) : (
            <div className="space-y-3">
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-pink-500" />
                      <span className="font-medium">
                        {new Date(slot.date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-pink-500" />
                      <span>{formatTimeToIndian(slot.start_time)} - {formatTimeToIndian(slot.end_time)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={slot.is_available}
                        onCheckedChange={() => toggleSlotAvailability(slot.id, slot.is_available)}
                      />
                      <Badge variant={slot.is_available ? "default" : "secondary"}>
                        {slot.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSlot(slot.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanionAvailabilityManager;
