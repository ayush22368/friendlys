
-- Add policy to allow reading companion unavailable days for booking purposes
CREATE POLICY "Anyone can read companion unavailable days for booking" 
  ON public.companion_unavailable_days 
  FOR SELECT 
  USING (true);
