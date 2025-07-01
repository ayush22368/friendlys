
-- Create profiles table to store user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Users can view and update own profile" 
  ON public.profiles 
  FOR ALL 
  USING (auth.uid() = id);

-- Create companions table
CREATE TABLE public.companions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  bio TEXT NOT NULL,
  image TEXT,
  rate INTEGER NOT NULL DEFAULT 4000,
  location TEXT NOT NULL,
  availability TEXT[] DEFAULT ARRAY['Morning', 'Afternoon', 'Evening'],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on companions
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;

-- Create policy for companions (publicly readable, admin only write)
CREATE POLICY "Anyone can view active companions" 
  ON public.companions 
  FOR SELECT 
  USING (status = 'active');

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  total_amount INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policy for bookings (users can view own bookings)
CREATE POLICY "Users can view own bookings" 
  ON public.bookings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings" 
  ON public.bookings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Insert initial companions data
INSERT INTO public.companions (name, age, bio, image, rate, location, availability, status) VALUES
('Sakura', 24, 'Elegant conversationalist with a passion for art and culture. Loves discussing literature and exploring the city.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&h=500&fit=crop', 4000, 'Mumbai', ARRAY['Morning', 'Evening'], 'active'),
('Priya', 26, 'Sophisticated companion who enjoys fine dining and meaningful conversations. Fluent in multiple languages.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=500&fit=crop', 4000, 'Delhi', ARRAY['Afternoon', 'Evening'], 'active'),
('Aria', 23, 'Creative soul with a love for music and dance. Perfect companion for cultural events and social gatherings.', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&h=500&fit=crop', 4000, 'Bangalore', ARRAY['Morning', 'Afternoon'], 'active'),
('Maya', 25, 'Intelligent and charming with expertise in business and technology. Great for professional events.', 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?q=80&w=400&h=500&fit=crop', 4000, 'Pune', ARRAY['Evening'], 'active');

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
