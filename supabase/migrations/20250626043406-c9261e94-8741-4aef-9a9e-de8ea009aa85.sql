
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'companion', 'user');

-- Create user_roles table to link auth users to their roles and companion profiles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  companion_id UUID REFERENCES public.companions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role, companion_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_roles (users can view their own roles)
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create availability slots table for companions
CREATE TABLE public.companion_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  companion_id UUID NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(companion_id, date, start_time, end_time)
);

-- Enable RLS on companion_availability
ALTER TABLE public.companion_availability ENABLE ROW LEVEL SECURITY;

-- Create policy for companion_availability (companions can manage their own availability)
CREATE POLICY "Companions can manage their own availability" 
  ON public.companion_availability 
  FOR ALL 
  USING (
    companion_id IN (
      SELECT companion_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'companion'
    )
  );

-- Create policy for users to view availability
CREATE POLICY "Users can view companion availability" 
  ON public.companion_availability 
  FOR SELECT 
  USING (is_available = true);

-- Add availability status to companions table
ALTER TABLE public.companions ADD COLUMN is_available BOOLEAN DEFAULT true;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create security definer function to get user's companion_id
CREATE OR REPLACE FUNCTION public.get_user_companion_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT companion_id
  FROM public.user_roles
  WHERE user_id = _user_id AND role = 'companion'
  LIMIT 1;
$$;

-- Update bookings policies to work with new role system
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;

-- New policies for bookings
CREATE POLICY "Users can view own bookings" 
  ON public.bookings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Companions can view their bookings" 
  ON public.bookings 
  FOR SELECT 
  USING (
    companion_id = public.get_user_companion_id(auth.uid())
  );

CREATE POLICY "Users can create bookings" 
  ON public.bookings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  _companion_id UUID,
  _date DATE,
  _start_time TIME,
  _duration INTEGER
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE companion_id = _companion_id
      AND date = _date
      AND status != 'cancelled'
      AND (
        -- Check if requested time overlaps with existing booking
        (_start_time >= time AND _start_time < (time + (duration || ' hours')::INTERVAL)) OR
        ((_start_time + (_duration || ' hours')::INTERVAL) > time AND (_start_time + (_duration || ' hours')::INTERVAL) <= (time + (duration || ' hours')::INTERVAL)) OR
        (_start_time <= time AND (_start_time + (_duration || ' hours')::INTERVAL) >= (time + (duration || ' hours')::INTERVAL))
      )
  );
$$;
