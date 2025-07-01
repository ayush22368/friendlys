import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, DollarSign, Users, LogOut, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CompanionAvailabilityManager from '@/components/CompanionAvailabilityManager';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  status: string;
  total_amount: number;
  notes?: string;
  created_at: string;
}

const CompanionDashboard = () => {
  const { user, companionId, signOut } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    if (companionId) {
      fetchBookings();
      fetchAvailabilityStatus();
    }
  }, [companionId]);

  const fetchBookings = async () => {
    if (!companionId) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('companion_id', companionId)
        .order('date', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch bookings",
          variant: "destructive"
        });
      } else {
        setBookings(data || []);
        
        // Calculate total earnings - 50% of approved/confirmed bookings
        const earnings = (data || [])
          .filter(booking => booking.status === 'approved' || booking.status === 'confirmed')
          .reduce((total, booking) => total + (booking.total_amount / 2), 0);
        setTotalEarnings(earnings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailabilityStatus = async () => {
    if (!companionId) return;

    try {
      const { data, error } = await supabase
        .from('companions')
        .select('is_available')
        .eq('id', companionId)
        .single();

      if (!error && data) {
        setIsAvailable(data.is_available ?? true);
      }
    } catch (error) {
      console.error('Error fetching availability status:', error);
    }
  };

  const toggleAvailability = async (available: boolean) => {
    if (!companionId) return;

    try {
      const { error } = await supabase
        .from('companions')
        .update({ is_available: available })
        .eq('id', companionId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update availability status",
          variant: "destructive"
        });
      } else {
        setIsAvailable(available);
        toast({
          title: "Success",
          description: `You are now ${available ? 'available' : 'unavailable'} for bookings`
        });
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast({
      title: "Signed out",
      description: "You've been successfully signed out"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeToIndian = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                Companion Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome, {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-pink-200 text-pink-600 hover:bg-pink-50">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Companion Dashboard</h2>
          <p className="text-gray-600">Manage your bookings and availability</p>
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="availability">Manage Availability</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            {/* Availability Toggle */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Availability Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Switch
                    id="availability"
                    checked={isAvailable}
                    onCheckedChange={toggleAvailability}
                  />
                  <Label htmlFor="availability" className="text-lg">
                    {isAvailable ? 'Available for bookings' : 'Unavailable for bookings'}
                  </Label>
                  <Badge className={isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookings.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{Math.round(totalEarnings).toLocaleString('en-IN')}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Bookings</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {bookings.filter(b => b.status === 'approved' || b.status === 'confirmed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bookings List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No bookings found. Your bookings will appear here once customers book appointments with you.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{booking.customer_name}</h3>
                            <p className="text-sm text-gray-600">{booking.customer_email}</p>
                            <p className="text-sm text-gray-600">{booking.customer_phone}</p>
                          </div>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Date:</span>
                            <p>{new Date(booking.date).toLocaleDateString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="font-medium">Time:</span>
                            <p>{formatTimeToIndian(booking.time)} ({booking.duration}h)</p>
                          </div>
                          <div>
                            <span className="font-medium">Location:</span>
                            <p>{booking.location}</p>
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span>
                            <p>₹{booking.total_amount.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        {booking.notes && (
                          <div className="mt-2 pt-2 border-t">
                            <span className="font-medium text-sm">Notes:</span>
                            <p className="text-sm text-gray-600">{booking.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability">
            <CompanionAvailabilityManager />
          </TabsContent>

          <TabsContent value="profile">
            {/* Profile Content */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CompanionDashboard;
