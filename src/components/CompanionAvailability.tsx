
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes?: string;
}

const CompanionAvailability = () => {
  const { companionId } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({
    date: '',
    start_time: '',
    end_time: '',
    notes: ''
  });

  useEffect(() => {
    if (companionId) {
      fetchAvailability();
    }
  }, [companionId]);

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

    if (newSlot.start_time >= newSlot.end_time) {
      toast({
        title: "Error",
        description: "End time must be after start time",
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
          is_available: true
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
        description: "Availability slot added successfully"
      });
    } catch (error) {
      console.error('Error:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Add Availability Slot</span>
          </CardTitle>
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
            Add Availability Slot
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Availability Slots</CardTitle>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No availability slots added yet</p>
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
                      <span>{slot.start_time} - {slot.end_time}</span>
                    </div>
                    <Badge variant={slot.is_available ? "default" : "secondary"}>
                      {slot.is_available ? "Available" : "Booked"}
                    </Badge>
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

export default CompanionAvailability;
