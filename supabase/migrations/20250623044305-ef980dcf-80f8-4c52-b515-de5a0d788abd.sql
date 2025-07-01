
-- Update RLS policies for companions table to allow admin operations
-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active companions" ON public.companions;

-- Create new policies that allow both public viewing and admin management
CREATE POLICY "Anyone can view active companions" 
  ON public.companions 
  FOR SELECT 
  USING (status = 'active');

-- Allow authenticated users to insert companions (we'll handle admin check in the app)
CREATE POLICY "Authenticated users can create companions" 
  ON public.companions 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update companions
CREATE POLICY "Authenticated users can update companions" 
  ON public.companions 
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Allow authenticated users to delete companions
CREATE POLICY "Authenticated users can delete companions" 
  ON public.companions 
  FOR DELETE 
  TO authenticated
  USING (true);
