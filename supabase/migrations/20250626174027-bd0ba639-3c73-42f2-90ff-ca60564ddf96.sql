
-- Check if the policy exists and add it if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companion_unavailable_days' 
        AND policyname = 'Anyone can read companion unavailable days for booking'
    ) THEN
        -- Add policy to allow reading companion unavailable days for booking purposes
        CREATE POLICY "Anyone can read companion unavailable days for booking" 
          ON public.companion_unavailable_days 
          FOR SELECT 
          USING (true);
    END IF;
END $$;
