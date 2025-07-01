import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, MapPin, User, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  companion_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
  companions: {
    name: string;
    image: string;
    telegram_username?: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      console.log('Fetching bookings for user:', user?.id);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          companions:companion_id(name, image, telegram_username)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        toast({
          title: "Error",
          description: "Failed to fetch bookings",
          variant: "destructive"
        });
      } else {
        console.log('Fetched user bookings:', data);
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimeToIndian = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Set up real-time subscription to listen for booking status updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time subscription for user bookings');
    
    const channel = supabase
      .channel('user-bookings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Booking status updated:', payload);
          // Refresh bookings when status changes
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-rose-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"></div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                My Bookings
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Appointments</h2>
          <p className="text-gray-600">View your confirmed appointments and booking history</p>
        </div>

        {bookings.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
              <p className="text-gray-600 mb-6">Start by browsing our companion profiles</p>
              <Link to="/">
                <Button className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
                  Browse Companions
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <Card key={booking.id} className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div className="flex items-start space-x-4">
                      <img
                        src={booking.companions?.image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100&h=100&fit=crop"}
                        alt={booking.companions?.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{booking.companions?.name}</h3>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600 mb-2">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-rose-500" />
                            {new Date(booking.date).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-rose-500" />
                            {formatTimeToIndian(booking.time)} ({booking.duration}h)
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-rose-500" />
                            {booking.location}
                          </div>
                        </div>

                        {booking.companions?.telegram_username && (
                          <div className="flex items-center text-sm text-blue-600 mt-2">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            <span>Telegram: @{booking.companions.telegram_username}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-rose-600 mb-1">
                        ₹{booking.total_amount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Booked on {new Date(booking.created_at).toLocaleDateString('en-IN')}
                      </p>
                      {booking.updated_at !== booking.created_at && (
                        <p className="text-xs text-gray-400">
                          Updated {new Date(booking.updated_at).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>

                  {booking.status === 'approved' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          <span className="font-medium">✓ Booking Confirmed!</span> Your appointment is scheduled. The companion will contact you shortly.
                        </p>
                      </div>
                    </div>
                  )}

                  {booking.status === 'completed' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">✓ Completed</span> Thank you for using our service!
                        </p>
                        <Button variant="outline" size="sm">
                          Leave Review
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
