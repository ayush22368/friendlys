
-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;

-- Change user_id column back to uuid to work with Supabase auth
ALTER TABLE public.bookings ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add foreign key constraint back to auth.users
ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Recreate RLS policies for Supabase auth
CREATE POLICY "Users can view own bookings" 
  ON public.bookings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings" 
  ON public.bookings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" 
  ON public.bookings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" 
  ON public.bookings 
  FOR DELETE 
  USING (auth.uid() = user_id);
