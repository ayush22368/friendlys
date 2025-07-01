
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, User, Heart, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Companion {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  rate: number;
  availability: string[];
  location: string;
  is_available: boolean;
}

const Index = () => {
  const { user, isAdmin, isCompanion, signOut } = useAuth();
  const navigate = useNavigate();
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanions();
  }, []);

  // Redirect based on user role
  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        navigate('/admin');
        return;
      }
      if (isCompanion) {
        navigate('/companion-dashboard');
        return;
      }
    }
  }, [user, isAdmin, isCompanion, loading, navigate]);

  const fetchCompanions = async () => {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('status', 'active')
        .eq('is_available', true);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch companions",
          variant: "destructive"
        });
      } else {
        setCompanions(data || []);
      }
    } catch (error) {
      console.error('Error fetching companions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  // Don't render if user will be redirected
  if (isAdmin || isCompanion) {
    return null;
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
                Frndly
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome, {user?.user_metadata?.full_name || user?.email}
              </span>
              <Link to="/my-bookings">
                <Button variant="outline" size="sm" className="border-pink-200 text-pink-600 hover:bg-pink-50">
                  My Bookings
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-pink-200 text-pink-600 hover:bg-pink-50">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-6">
            Premium Social
            <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent"> Companionship</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Experience meaningful connections with our carefully selected companions. 
            Professional, respectful, and engaging social experiences tailored for you.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Verified Profiles</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Flexible Timing</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Location Based</span>
            </div>
          </div>
        </div>
      </section>

      {/* Companions Grid */}
      <section className="py-8 sm:py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-12">
            Meet Our Companions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {companions.map((companion) => (
              <Card key={companion.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden bg-white/90 backdrop-blur-sm">
                <div className="relative overflow-hidden">
                  <img
                    src={companion.image}
                    alt={companion.name}
                    className="w-full h-64 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/90 text-gray-800 backdrop-blur-sm">
                      Available
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg sm:text-xl font-semibold text-gray-900">{companion.name}</h4>
                      <p className="text-gray-500 text-sm">{companion.age} years • {companion.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base sm:text-lg font-bold text-pink-600">₹{companion.rate.toLocaleString('en-IN')}</p>
                      <p className="text-xs sm:text-sm text-gray-500">per hour</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {companion.bio}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {companion.availability.map((time) => (
                      <Badge key={time} variant="secondary" className="text-xs">
                        {time}
                      </Badge>
                    ))}
                  </div>
                  <Link to={`/companion/${companion.id}`}>
                    <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 transition-all duration-200">
                      View Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
              <Heart className="w-3 h-3 text-white fill-white" />
            </div>
            <h3 className="text-xl font-bold">Frndly</h3>
          </div>
          <p className="text-gray-400 mb-4">Premium social companionship service</p>
          <p className="text-sm text-gray-500">
            This platform provides professional, non-intimate companionship services.
            All interactions are respectful and within legal boundaries.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
