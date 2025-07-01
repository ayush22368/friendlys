import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Calendar, MapPin, Clock, Plus, Edit, Check, X, LogOut, Upload, Heart, UserPlus, Key, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  status: string;
  telegram_username?: string;
  has_account?: boolean;
  account_email?: string;
}

interface Booking {
  id: string;
  user_id: string;
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
  companions: any; // Changed from { name: string } to any to handle Json type
}

const AdminDashboard = () => {
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("bookings");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [editingCompanion, setEditingCompanion] = useState<Companion | null>(null);
  const [selectedCompanionForAccount, setSelectedCompanionForAccount] = useState<Companion | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null);
  const [newCompanion, setNewCompanion] = useState({
    name: '',
    age: '',
    bio: '',
    rate: 4000,
    location: '',
    image: '',
    telegram_username: ''
  });

  // Check if user is admin on component mount
  useEffect(() => {
    if (!isAdmin) {
      console.log('User is not admin, redirecting...');
      navigate('/');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    await Promise.all([fetchCompanions(), fetchBookings()]);
    setLoading(false);
  };

  const fetchCompanions = async () => {
    try {
      const { data, error } = await supabase
        .from('companions')
        .select('*');

      if (error) {
        console.error('Error fetching companions:', error);
        toast({
          title: "Error",
          description: "Failed to fetch companions",
          variant: "destructive"
        });
      } else {
        // Check which companions have accounts
        const companionsWithAccountStatus = await Promise.all(
          (data || []).map(async (companion) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('companion_id', companion.id)
              .eq('role', 'companion')
              .maybeSingle();
            
            let accountEmail = '';
            if (roleData) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', roleData.user_id)
                .maybeSingle();
              accountEmail = profileData?.email || '';
            }
            
            return {
              ...companion,
              has_account: !!roleData,
              account_email: accountEmail
            };
          })
        );
        
        setCompanions(companionsWithAccountStatus);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companions",
        variant: "destructive"
      });
    }
  };

  const fetchBookings = async () => {
    try {
      console.log('Admin fetching ALL bookings...');
      
      // Use the service role to bypass RLS and fetch all bookings
      const { data, error } = await supabase
        .rpc('get_all_bookings_admin');

      if (error) {
        console.error('Error fetching admin bookings with RPC:', error);
        
        // Fallback: try direct query (will be limited by RLS but better than nothing)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('bookings')
          .select(`
            *,
            companions:companion_id(name)
          `)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          toast({
            title: "Error",
            description: `Failed to fetch bookings: ${fallbackError.message}`,
            variant: "destructive"
          });
        } else {
          console.log('Using fallback data:', fallbackData);
          setBookings(fallbackData || []);
        }
      } else {
        console.log('Successfully fetched all bookings for admin:', data);
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive"
      });
    }
  };

  // Set up real-time subscription to listen for new bookings
  useEffect(() => {
    if (!isAdmin) return;
    
    console.log('Setting up real-time subscription for admin bookings');
    
    const channel = supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Booking change detected in admin:', payload);
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up admin real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateCompanionAccount = async () => {
    if (!selectedCompanionForAccount) return;
    
    if (!accountEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      const password = accountPassword || generatePassword();
      
      console.log('Creating companion account:', accountEmail);
      
      // Create a temporary supabase client that won't affect current session
      const { createClient } = await import('@supabase/supabase-js');
      const tempSupabase = createClient(
        "https://jgojfznjgcqqqsbttoyq.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnb2pmem5qZ2NxcXFzYnR0b3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NjYwOTgsImV4cCI6MjA2NjE0MjA5OH0.vAsd-VKvgNTe41v-vekexiSLIrY2TBUDS0DV7nANFz8",
        {
          auth: {
            persistSession: false, // This prevents auto-login
            autoRefreshToken: false
          }
        }
      );

      // Create the user account without affecting current session
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: accountEmail,
        password: password,
        options: {
          data: {
            full_name: selectedCompanionForAccount.name,
            companion_id: selectedCompanionForAccount.id
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast({
          title: "Error",
          description: `Failed to create account: ${authError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!authData.user) {
        toast({
          title: "Error",
          description: "Failed to create user account",
          variant: "destructive"
        });
        return;
      }

      console.log('User created successfully:', authData.user.id);

      // Now use the original supabase client (with admin session) to create profile and role
      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: accountEmail,
          full_name: selectedCompanionForAccount.name
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        // Continue even if profile creation fails - it might be created by trigger
      }

      // Create user role entry - this should work now since we're using admin session
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'companion',
          companion_id: selectedCompanionForAccount.id
        });

      if (roleError) {
        console.error('Role error:', roleError);
        toast({
          title: "Error",
          description: `Failed to assign companion role: ${roleError.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Companion account created successfully');
      
      // Set generated credentials for display
      setGeneratedCredentials({
        email: accountEmail,
        password: password
      });
      
      // Refresh companions list
      await fetchCompanions();
      
      toast({
        title: "Success",
        description: `Account created for ${selectedCompanionForAccount.name}. You can now share the credentials.`
      });

    } catch (error) {
      console.error('Error creating companion account:', error);
      toast({
        title: "Error",
        description: "Failed to create companion account",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const openAccountDialog = (companion: Companion) => {
    setSelectedCompanionForAccount(companion);
    setAccountEmail(`${companion.name.toLowerCase().replace(/\s+/g, '.')}@frndly.app`);
    setAccountPassword('');
    setGeneratedCredentials(null);
    setIsAccountDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Credentials copied to clipboard"
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Convert FileList to array and take only first 4 files
      const newFiles = Array.from(files).slice(0, 4);
      setGalleryFiles(prevFiles => [...prevFiles, ...newFiles].slice(0, 4)); // Keep only latest 4 files
      
      // Log the files for debugging
      console.log('Selected files:', newFiles);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `companion-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('companion-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('companion-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const uploadGalleryImages = async (files: File[]): Promise<string[]> => {
    const galleryUrls: string[] = [];
    console.log('Starting gallery upload for', files.length, 'files');

    // First, check if we can list the bucket (for debugging)
    try {
      const { data: bucketList, error: listError } = await supabase.storage
        .from('companion-gallery')
        .list();
      
      if (listError) {
        console.error('Error listing bucket:', listError);
      } else {
        console.log('Bucket listing successful. Contents:', bucketList);
      }
    } catch (listError) {
      console.error('Exception when listing bucket:', listError);
    }

    for (const file of files) {
      try {
        console.log('Processing file:', file.name, 'Size:', file.size, 'bytes');
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        
        console.log('Uploading file:', fileName);
        
        // Try direct upload without any folder structure
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('companion-gallery')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'image/jpeg'
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          
          // Try with a different bucket name as a test
          try {
            console.log('Trying with public bucket...');
            const { data: publicUpload, error: publicError } = await supabase.storage
              .from('public')
              .upload(`gallery/${fileName}`, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'image/jpeg'
              });
              
            if (publicError) {
              console.error('Public bucket upload failed:', publicError);
              throw publicError;
            }
            
            const { data: publicUrlData } = supabase.storage
              .from('public')
              .getPublicUrl(`gallery/${fileName}`);
              
            if (publicUrlData?.publicUrl) {
              console.log('Uploaded to public bucket:', publicUrlData.publicUrl);
              galleryUrls.push(publicUrlData.publicUrl);
            }
          } catch (publicError) {
            console.error('Error uploading to public bucket:', publicError);
            continue;
          }
        } else {
          console.log('Upload successful:', uploadData);
          
          const { data: publicUrlData } = supabase.storage
            .from('companion-gallery')
            .getPublicUrl(fileName);
            
          if (publicUrlData?.publicUrl) {
            console.log('Generated public URL:', publicUrlData.publicUrl);
            galleryUrls.push(publicUrlData.publicUrl);
          }
        }
      } catch (error) {
        console.error('Error in gallery upload loop:', error);
        continue;
      }
    }

    console.log('Gallery upload completed. URLs:', galleryUrls);
    return galleryUrls;
  };

  const handleAddCompanion = async () => {
    if (!newCompanion.name || !newCompanion.age || !newCompanion.bio || !newCompanion.location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      console.log('Adding new companion:', newCompanion);
      
      let imageUrl = "https://images.unsplash.com/photo-1494790108755-2616b412f08c?q=80&w=200&h=200&fit=crop";
      
      // Upload image if file is selected
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (imageError) {
          console.log('Image upload failed, using default:', imageError);
          // Continue with default image if upload fails
        }
      }

      let galleryUrls: string[] = [];
      if (galleryFiles.length > 0) {
        try {
          console.log('Starting gallery upload for', galleryFiles.length, 'files');
          galleryUrls = await uploadGalleryImages(galleryFiles);
          console.log('Gallery images uploaded successfully:', galleryUrls);
        } catch (galleryError) {
          console.error('Gallery images upload failed:', galleryError);
          toast({
            title: "Warning",
            description: "Gallery images could not be uploaded. The rest of the companion details were saved.",
            variant: "default"
          });
          // Continue without gallery images if upload fails
        }
      }

      const companionData = {
        name: newCompanion.name,
        age: parseInt(newCompanion.age),
        bio: newCompanion.bio,
        image: imageUrl,
        rate: newCompanion.rate,
        location: newCompanion.location,
        availability: ["Morning", "Afternoon", "Evening"],
        status: "active",
        telegram_username: newCompanion.telegram_username,
        images: galleryUrls
      };

      const { data, error } = await supabase
        .from('companions')
        .insert(companionData)
        .select();

      if (error) {
        console.error('Companion insert error:', error);
        toast({
          title: "Error",
          description: `Failed to add companion: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Companion added successfully:', data);
      
      // Refresh companions list to show the new companion with image
      await fetchCompanions();
      
      // Reset form
      setNewCompanion({
        name: '',
        age: '',
        bio: '',
        rate: 4000,
        location: '',
        image: '',
        telegram_username: ''
      });
      setImageFile(null);
      setImagePreview('');
      setGalleryFiles([]);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Companion added successfully"
      });
    } catch (error) {
      console.error('Error adding companion:', error);
      toast({
        title: "Error",
        description: "Failed to add companion",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEditCompanion = (companion: Companion) => {
    setEditingCompanion(companion);
    setNewCompanion({
      name: companion.name,
      age: companion.age.toString(),
      bio: companion.bio,
      rate: companion.rate,
      location: companion.location,
      image: companion.image,
      telegram_username: companion.telegram_username || ''
    });
    setImagePreview(companion.image);
    setIsAddDialogOpen(true);
  };

  const handleUpdateCompanion = async () => {
    if (!editingCompanion) return;

    if (!newCompanion.name || !newCompanion.age || !newCompanion.bio || !newCompanion.location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      let imageUrl = editingCompanion.image;
      
      // Upload new image if file is selected
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
          console.log('New image uploaded successfully:', imageUrl);
        } catch (imageError) {
          console.log('Image upload failed, keeping existing:', imageError);
          // Keep existing image if upload fails
        }
      }

      let galleryUrls: string[] = editingCompanion.images || [];
      if (galleryFiles.length > 0) {
        try {
          console.log('Starting gallery upload for update:', galleryFiles.length, 'files');
          galleryUrls = await uploadGalleryImages(galleryFiles);
          console.log('Gallery images uploaded successfully:', galleryUrls);
        } catch (galleryError) {
          console.error('Gallery images upload failed:', galleryError);
          toast({
            title: "Warning",
            description: "New gallery images could not be uploaded. The existing gallery remains unchanged.",
            variant: "default"
          });
          // Keep existing gallery URLs if upload fails
        }
      }

      const companionData = {
        name: newCompanion.name,
        age: parseInt(newCompanion.age),
        bio: newCompanion.bio,
        image: imageUrl,
        rate: newCompanion.rate,
        location: newCompanion.location,
        availability: ["Morning", "Afternoon", "Evening"],
        status: "active",
        telegram_username: newCompanion.telegram_username,
        images: galleryUrls
      };

      const { error } = await supabase
        .from('companions')
        .update(companionData)
        .eq('id', editingCompanion.id);

      if (error) {
        console.error('Companion update error:', error);
        toast({
          title: "Error",
          description: `Failed to update companion: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Companion updated successfully');
      
      await fetchCompanions();
      
      // Reset form
      setNewCompanion({
        name: '',
        age: '',
        bio: '',
        rate: 4000,
        location: '',
        image: '',
        telegram_username: ''
      });
      setImageFile(null);
      setImagePreview('');
      setGalleryFiles([]);
      setEditingCompanion(null);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Companion updated successfully"
      });
    } catch (error) {
      console.error('Error updating companion:', error);
      toast({
        title: "Error",
        description: "Failed to update companion",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCompanion = async (companionId: string) => {
    if (!confirm('Are you sure you want to delete this companion?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companions')
        .delete()
        .eq('id', companionId);

      if (error) {
        console.error('Companion delete error:', error);
        toast({
          title: "Error",
          description: `Failed to delete companion: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Companion deleted successfully');
      
      await fetchCompanions();
      
      toast({
        title: "Success",
        description: "Companion deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting companion:', error);
      toast({
        title: "Error",
        description: "Failed to delete companion",
        variant: "destructive"
      });
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (bookingFilter === 'all') return true;
    return booking.status === bookingFilter;
  });

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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

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
                Frndly Admin
              </h1>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="border-pink-200 text-pink-600 hover:bg-pink-50">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Companions</p>
                  <p className="text-2xl font-bold text-gray-900">{companions.length}</p>
                </div>
                <User className="w-8 h-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">With Accounts</p>
                  <p className="text-2xl font-bold text-green-600">
                    {companions.filter(c => c.has_account).length}
                  </p>
                </div>
                <UserPlus className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {bookings.length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-pink-600">
                    ₹{bookings.reduce((sum, booking) => sum + booking.total_amount, 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold">₹</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="companions">Companions</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Booking Records (All Users)</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={bookingFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBookingFilter('all')}
                  className={bookingFilter === 'all' ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'border-pink-200 text-pink-600 hover:bg-pink-50'}
                >
                  All
                </Button>
                <Button
                  variant={bookingFilter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBookingFilter('approved')}
                  className={bookingFilter === 'approved' ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'border-pink-200 text-pink-600 hover:bg-pink-50'}
                >
                  Booked
                </Button>
                <Button
                  variant={bookingFilter === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBookingFilter('completed')}
                  className={bookingFilter === 'completed' ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'border-pink-200 text-pink-600 hover:bg-pink-50'}
                >
                  Completed
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredBookings.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">No bookings found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredBookings.map((booking) => (
                  <Card key={booking.id} className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {booking.customer_name} → {booking.companions?.name || 'Unknown Companion'}
                            </h3>
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-pink-500" />
                              {new Date(booking.date).toLocaleDateString('en-IN')}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-pink-500" />
                              {booking.time} ({booking.duration}h)
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-pink-500" />
                              {booking.location}
                            </div>
                            <div className="flex items-center">
                              <span className="font-semibold text-pink-600">
                                ₹{booking.total_amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600">
                            <p><strong>Customer:</strong> {booking.customer_email} | {booking.customer_phone}</p>
                            {booking.notes && <p><strong>Notes:</strong> {booking.notes}</p>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Companions Tab */}
          <TabsContent value="companions" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Companion Profiles</h2>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                  setEditingCompanion(null);
                  setNewCompanion({
                    name: '',
                    age: '',
                    bio: '',
                    rate: 4000,
                    location: '',
                    image: '',
                    telegram_username: ''
                  });
                  setImageFile(null);
                  setImagePreview('');
                  setGalleryFiles([]);
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Companion
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingCompanion ? 'Edit Companion' : 'Add New Companion'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input 
                          id="name" 
                          placeholder="Enter name" 
                          value={newCompanion.name}
                          onChange={(e) => setNewCompanion(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="age">Age *</Label>
                        <Input 
                          id="age" 
                          type="number" 
                          placeholder="Enter age" 
                          value={newCompanion.age}
                          onChange={(e) => setNewCompanion(prev => ({ ...prev, age: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="telegram">Telegram Username</Label>
                      <Input 
                        id="telegram" 
                        placeholder="Enter telegram username (without @)" 
                        value={newCompanion.telegram_username}
                        onChange={(e) => setNewCompanion(prev => ({ ...prev, telegram_username: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="image">Profile Image</Label>
                      <div className="space-y-4">
                        <Input 
                          id="image" 
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="cursor-pointer"
                        />
                        {imagePreview && (
                          <div className="flex justify-center">
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="w-20 h-20 rounded-full object-cover border-2 border-pink-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
  <Label htmlFor="gallery">Gallery Images (up to 4)</Label>
  <div className="flex items-center gap-2">
    <div className="relative">
      <Label 
        htmlFor="gallery" 
        className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
      >
        Select Images
      </Label>
      <Input
        id="gallery"
        type="file"
        accept="image/*"
        multiple
        onChange={handleGalleryUpload}
        className="hidden"
      />
    </div>
    
    {galleryFiles.length > 0 && (
      <button 
        type="button"
        onClick={() => setGalleryFiles([])}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Clear All
      </button>
    )}
  </div>
  
  {galleryFiles.length > 0 && (
    <div className="mt-2 space-y-2">
      <div className="text-sm text-gray-500">
        {galleryFiles.length} file{galleryFiles.length !== 1 ? 's' : ''} selected
      </div>
      <div className="grid grid-cols-2 gap-2">
        {galleryFiles.map((file, index) => (
          <div key={index} className="relative group">
            <img 
              src={URL.createObjectURL(file)} 
              alt={`Preview ${index + 1}`}
              className="w-full h-20 object-cover rounded border border-gray-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryFiles(prev => prev.filter((_, i) => i !== index));
                }}
                className="text-white hover:text-red-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-600 truncate mt-1">
              {file.name.length > 20 ? `${file.name.substring(0, 15)}...${file.name.split('.').pop()}` : file.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
                    <div>
                      <Label htmlFor="bio">Bio *</Label>
                      <Textarea 
                        id="bio" 
                        placeholder="Enter bio" 
                        rows={3} 
                        value={newCompanion.bio}
                        onChange={(e) => setNewCompanion(prev => ({ ...prev, bio: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rate">Hourly Rate (₹)</Label>
                        <Input 
                          id="rate" 
                          type="number" 
                          value={newCompanion.rate}
                          onChange={(e) => setNewCompanion(prev => ({ ...prev, rate: parseInt(e.target.value) || 4000 }))}
                        />
                      </div>
                      <div>
                        
                        <Label htmlFor="location">Location *</Label>
                        <Input 
                          id="location" 
                          placeholder="Enter location" 
                          value={newCompanion.location}
                          onChange={(e) => setNewCompanion(prev => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600" 
                      onClick={editingCompanion ? handleUpdateCompanion : handleAddCompanion}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingCompanion ? 'Updating...' : 'Adding Companion...'}
                        </>
                      ) : (
                        editingCompanion ? 'Update Companion' : 'Add Companion'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companions.map((companion) => (
                <Card key={companion.id} className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <img
                        src={companion.image}
                        alt={companion.name}
                        className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.unsplash.com/photo-1494790108755-2616b412f08c?q=80&w=200&h=200&fit=crop";
                        }}
                      />
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{companion.name}</h3>
                      <p className="text-gray-600">{companion.age} years • {companion.location}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 text-center">{companion.bio}</p>
                      
                      <div className="flex justify-center">
                        <Badge className="bg-green-100 text-green-800">
                          ₹{companion.rate.toLocaleString('en-IN')}/hour
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1 justify-center">
                        {companion.availability.map((time) => (
                          <Badge key={time} variant="secondary" className="text-xs">
                            {time}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50"
                          onClick={() => handleEditCompanion(companion)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteCompanion(companion.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* New Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Companion Account Management</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companions.map((companion) => (
                <Card key={companion.id} className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <img
                        src={companion.image}
                        alt={companion.name}
                        className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.unsplash.com/photo-1494790108755-2616b412f08c?q=80&w=200&h=200&fit=crop";
                        }}
                      />
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{companion.name}</h3>
                      <p className="text-sm text-gray-600">{companion.location}</p>
                    </div>

                    <div className="space-y-3">
                      {companion.has_account ? (
                        <div className="text-center">
                          <Badge className="bg-green-100 text-green-800 mb-2">
                            <Check className="w-3 h-3 mr-1" />
                            Account Active
                          </Badge>
                          <p className="text-xs text-gray-600">{companion.account_email}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Badge className="bg-gray-100 text-gray-800 mb-2">
                            <X className="w-3 h-3 mr-1" />
                            No Account
                          </Badge>
                          <Button 
                            size="sm" 
                            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                            onClick={() => openAccountDialog(companion)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Create Account
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Account Creation Dialog */}
        <Dialog open={isAccountDialogOpen} onOpenChange={(open) => {
          setIsAccountDialogOpen(open);
          if (!open) {
            setSelectedCompanionForAccount(null);
            setAccountEmail('');
            setAccountPassword('');
            setGeneratedCredentials(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Account for {selectedCompanionForAccount?.name}</DialogTitle>
            </DialogHeader>
            
            {generatedCredentials ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Account Created Successfully!</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">Email:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{generatedCredentials.email}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(generatedCredentials.email)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">Password:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{generatedCredentials.password}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(generatedCredentials.password)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-3" 
                    onClick={() => copyToClipboard(`Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Both Credentials
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Share these credentials with {selectedCompanionForAccount?.name} so they can log in to their companion dashboard.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="account-email">Email Address *</Label>
                  <Input 
                    id="account-email" 
                    type="email" 
                    placeholder="Enter email address" 
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="account-password">Password (leave empty to auto-generate)</Label>
                  <Input 
                    id="account-password" 
                    type="password" 
                    placeholder="Auto-generated if empty" 
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600" 
                  onClick={handleCreateCompanionAccount}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;
