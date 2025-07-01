
-- First, drop existing RLS policies that depend on user_id column
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;

-- Drop the foreign key constraint that references auth.users
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

-- Change user_id column from uuid to text to support Clerk user IDs
ALTER TABLE public.bookings ALTER COLUMN user_id TYPE text;

-- Recreate RLS policies with text-based user_id comparison
CREATE POLICY "Users can view own bookings" 
  ON public.bookings 
  FOR SELECT 
  USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create own bookings" 
  ON public.bookings 
  FOR INSERT 
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own bookings" 
  ON public.bookings 
  FOR UPDATE 
  USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete own bookings" 
  ON public.bookings 
  FOR DELETE 
  USING (user_id = auth.jwt() ->> 'sub');
