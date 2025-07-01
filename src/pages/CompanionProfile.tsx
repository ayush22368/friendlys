
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Companion {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  images?: string[];
  rate: number;
  availability: string[];
  location: string;
}

const CompanionProfile = () => {
  const { id } = useParams();
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Companion fetch error:', error);
        toast({
          title: "Error",
          description: "Companion not found",
          variant: "destructive"
        });
      } else {
        setCompanion(data);
      }
    } catch (error) {
      console.error('Error fetching companion:', error);
      toast({
        title: "Error",
        description: "Failed to load companion profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize photos with empty array if companion is not loaded yet
  const photos = companion ? [companion.image, ...(companion.images ?? [])].filter(Boolean) as string[] : [];
  
  // Move all hooks to the top level before any conditional returns
  const goToNext = useCallback(() => {
    if (photos.length > 0) {
      setCurrentPhoto((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    }
  }, [photos.length]);

  const goToPrev = useCallback(() => {
    if (photos.length > 0) {
      setCurrentPhoto((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    }
  }, [photos.length]);

  // Keyboard navigation effect
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape') setIsFullscreen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, isFullscreen]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  // No companion found
  if (!companion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center">
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Companion Not Found</h2>
          <p className="text-gray-600 mb-6">The companion profile you're looking for doesn't exist.</p>
          <Link to="/">
            <Button className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
              Back to Home
            </Button>
          </Link>
        </Card>
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
                Back to Profiles
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"></div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                Frndly
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative group">
              <div 
                className="relative overflow-hidden rounded-2xl shadow-2xl cursor-zoom-in"
                onClick={() => photos.length > 0 && setIsFullscreen(true)}
              >
                <AnimatePresence mode="wait">
                  {photos.length > 0 ? (
                    <motion.img
                      key={currentPhoto}
                      src={photos[currentPhoto]}
                      alt={`${companion.name} - Photo ${currentPhoto + 1}`}
                      className="w-full h-[600px] object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  ) : (
                    <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400">No images available</span>
                    </div>
                  )}
                </AnimatePresence>

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrev();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur rounded-full p-2 shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-800" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNext();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white backdrop-blur rounded-full p-2 shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-800" />
                    </button>
                  </>
                )}

                {/* Photo Counter */}
                {photos.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                    {currentPhoto + 1} / {photos.length}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhoto(idx);
                      }}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        currentPhoto === idx ? 'border-pink-500' : 'border-transparent'
                      }`}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <img
                        src={photo}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="absolute top-4 right-4">
                <Badge className="bg-green-500 text-white">
                  Available Now
                </Badge>
              </div>
            </div>
          </div>

          {/* Fullscreen Gallery */}
          {isFullscreen && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300"
                aria-label="Close gallery"
              >
                <X className="w-8 h-8" />
              </button>
              
              <div className="relative w-full max-w-4xl">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`full-${currentPhoto}`}
                    src={photos[currentPhoto]}
                    alt={`${companion.name} - Photo ${currentPhoto + 1}`}
                    className="max-h-[80vh] w-auto mx-auto"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  />
                </AnimatePresence>

                {photos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrev();
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNext();
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {photos.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPhoto(idx);
                          }}
                          className={`w-3 h-3 rounded-full transition-all ${
                            currentPhoto === idx ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/70'
                          }`}
                          aria-label={`Go to photo ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{companion.name}</h1>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span>{companion.age} years</span>
                    <span>•</span>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {companion.location}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-rose-600">₹{companion.rate.toLocaleString('en-IN')}</p>
                  <p className="text-gray-500">per hour</p>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">About</h3>
                <p className="text-gray-600 leading-relaxed">{companion.bio}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-rose-500" />
                    Availability
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {companion.availability.map((time) => (
                      <Badge key={time} variant="secondary">
                        {time}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Link to={`/book/${companion.id}`}>
              <Button size="lg" className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white py-4 text-lg">
                Book Appointment
              </Button>
            </Link>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Note:</span> This is a professional companionship service. 
                All interactions are respectful, non-intimate, and focus on social activities like dining, 
                cultural events, or conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanionProfile;
