import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User, Phone, Mail, Heart, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import TelegramContactPopup from '@/components/TelegramContactPopup';
import AvailableTimeSlots from '@/components/AvailableTimeSlots';
import TimeSlotSelector from '@/components/TimeSlotSelector';
import BookingCutoffWarning from '@/components/BookingCutoffWarning';
import { isBookingCutoffReached, getBookingCutoffMessage, getBusinessHoursDisplay, isValidBookingDuration } from '@/lib/timeUtils';

interface Companion {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  rate: number;
  availability: string[];
  location: string;
  telegram_username?: string;
}

const BookingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTelegramPopup, setShowTelegramPopup] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    date: '',
    time: '',
    duration: 2,
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchCompanion();
    }
  }, [id]);

  const fetchCompanion = async () => {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching companion:', error);
        toast({
          title: "Error",
          description: "Failed to fetch companion details",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setCompanion(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companion details",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if current time is past 5 PM cutoff for the selected date
    if (isBookingCutoffReached(formData.date)) {
      toast({
        title: "Booking Closed",
        description: getBookingCutoffMessage(formData.date),
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      console.log('NEW ACCOUNT DEBUG: User not authenticated');
      toast({
        title: "Error",
        description: "You must be logged in to make a booking",
        variant: "destructive"
      });
      return;
    }

    console.log('NEW ACCOUNT DEBUG: User authenticated:', user.id, user.email);

    if (!companion) {
      toast({
        title: "Error",
        description: "Companion information not available",
        variant: "destructive"
      });
      return;
    }

    // Validation only happens here during form submission
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || 
        !formData.date || !formData.time || !formData.location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Validate booking duration
    if (!isValidBookingDuration(formData.duration)) {
      toast({
        title: "Error",
        description: "Invalid booking duration. Please select between 1-12 hours.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Check for booking conflicts using the database function
      console.log('Checking booking conflict for:', {
        companion_id: companion.id,
        date: formData.date,
        start_time: formData.time,
        duration: formData.duration
      });

      const { data: conflictCheck, error: conflictError } = await supabase
        .rpc('check_booking_conflict', {
          _companion_id: companion.id,
          _date: formData.date,
          _start_time: formData.time,
          _duration: formData.duration
        });

      if (conflictError) {
        console.error('Error checking conflicts:', conflictError);
        toast({
          title: "Error",
          description: "Failed to check availability",
          variant: "destructive"
        });
        return;
      }

      console.log('Conflict check result:', conflictCheck);

      if (conflictCheck) {
        toast({
          title: "Time Slot Unavailable",
          description: "This time slot is already booked. Please choose a different time.",
          variant: "destructive"
        });
        return;
      }

      const bookingData = {
        user_id: user.id,
        companion_id: companion.id,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        location: formData.location,
        total_amount: companion.rate * formData.duration,
        notes: formData.notes,
        status: 'approved'
      };

      console.log('NEW ACCOUNT DEBUG: Creating booking with data:', bookingData);

      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();

      if (error) {
        console.error('NEW ACCOUNT DEBUG: Booking creation error:', error);
        toast({
          title: "Error",
          description: `Failed to create booking: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('NEW ACCOUNT DEBUG: Booking created successfully:', data);

      toast({
        title: "Success",
        description: "Booking request submitted successfully!"
      });

      // Show telegram popup if companion has telegram username
      if (companion.telegram_username) {
        console.log('NEW ACCOUNT DEBUG: Showing Telegram popup for:', companion.telegram_username);
        setShowTelegramPopup(true);
      } else {
        // Only navigate to my-bookings if no telegram popup is shown
        navigate('/my-bookings');
      }

    } catch (error) {
      console.error('NEW ACCOUNT DEBUG: Unexpected error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Companion not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                Book Appointment
              </h1>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="border-pink-200 text-pink-600 hover:bg-pink-50"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <BookingCutoffWarning selectedDate={formData.date} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Companion Info */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <img
                  src={companion?.image}
                  alt={companion?.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://images.unsplash.com/photo-1494790108755-2616b412f08c?q=80&w=200&h=200&fit=crop";
                  }}
                />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{companion?.name}</h2>
                <p className="text-gray-600 mb-2">{companion?.age} years • {companion?.location}</p>
                <p className="text-2xl font-bold text-pink-600 mb-4">₹{companion?.rate.toLocaleString('en-IN')}/hour</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                  <p className="text-gray-600">{companion?.bio}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Hours</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm">
                      {getBusinessHoursDisplay()}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Max 12 hours per booking
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Form */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900">Book Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName" className="text-gray-700">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="customerName"
                        type="text"
                        placeholder="Enter your name"
                        value={formData.customerName}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        className="pl-10 border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="customerPhone" className="text-gray-700">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="customerPhone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                        className="pl-10 border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customerEmail" className="text-gray-700">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="Enter email address"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      className="pl-10 border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date" className="text-gray-700">Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, date: e.target.value, time: '' }));
                        }}
                        className="pl-10 border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="duration" className="text-gray-700">Duration (hours)</Label>
                    <Select 
                      value={formData.duration.toString()} 
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, duration: parseInt(value), time: '' }));
                      }}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-pink-500 focus:ring-pink-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="3">3 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="8">8 hours</SelectItem>
                        <SelectItem value="10">10 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Time Slot Selection - No validation on selection */}
                {formData.date && (
                  <div className="space-y-4">
                    <TimeSlotSelector
                      companionId={companion?.id || ''}
                      selectedDate={formData.date}
                      selectedTime={formData.time}
                      duration={formData.duration}
                      onTimeSelect={(time) => {
                        console.log('Time selected:', time);
                        setFormData(prev => ({ ...prev, time }));
                      }}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="location" className="text-gray-700">Meeting Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="location"
                      type="text"
                      placeholder="Enter meeting location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="pl-10 border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-gray-700">Special Requests (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requests or notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                    rows={3}
                  />
                </div>

                <div className="p-4 bg-pink-50 rounded-lg">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span className="text-gray-700">Total Amount:</span>
                    <span className="text-pink-600">₹{companion ? (companion.rate * formData.duration).toLocaleString('en-IN') : '0'}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    ₹{companion?.rate.toLocaleString('en-IN')}/hour × {formData.duration} hours
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-3"
                  disabled={submitting || !formData.time}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Submit Booking Request'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Original Available Time Slots - Now for reference only */}
        <div className="mt-8">
          <AvailableTimeSlots 
            companionId={companion?.id || ''} 
            selectedDate={formData.date}
          />
        </div>

        {/* Telegram Contact Popup */}
        {showTelegramPopup && companion?.telegram_username && (
          <TelegramContactPopup
            isOpen={showTelegramPopup}
            companionName={companion.name}
            telegramUsername={companion.telegram_username}
            onClose={() => {
              setShowTelegramPopup(false);
              navigate('/my-bookings');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BookingForm;
