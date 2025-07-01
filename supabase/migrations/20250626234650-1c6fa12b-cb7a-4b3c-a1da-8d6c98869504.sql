

-- First, let's check and fix the companion_availability table structure and add some debugging
-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companion_availability_companion_date 
ON public.companion_availability (companion_id, date);

CREATE INDEX IF NOT EXISTS idx_companion_unavailable_days_companion_date 
ON public.companion_unavailable_days (companion_id, date);

-- Add RLS policies for companion_availability table if missing
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.companion_availability ENABLE ROW LEVEL SECURITY;
    
    -- Add policy to allow anyone to read availability for booking purposes
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companion_availability' 
        AND policyname = 'Anyone can read companion availability for booking'
    ) THEN
        CREATE POLICY "Anyone can read companion availability for booking" 
          ON public.companion_availability 
          FOR SELECT 
          USING (true);
    END IF;
    
    -- Add policy for companions to manage their own availability
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companion_availability' 
        AND policyname = 'Companions can manage their availability'
    ) THEN
        CREATE POLICY "Companions can manage their availability" 
          ON public.companion_availability 
          FOR ALL 
          USING (companion_id IN (
            SELECT companion_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'companion'
          ));
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error setting up companion_availability policies: %', SQLERRM;
END $$;

-- Ensure bookings table has proper RLS policies for reading
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
    
    -- Add policy to allow reading bookings for availability checking
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname = 'Anyone can read bookings for availability checking'
    ) THEN
        CREATE POLICY "Anyone can read bookings for availability checking" 
          ON public.bookings 
          FOR SELECT 
          USING (true);
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error setting up bookings policies: %', SQLERRM;
END $$;

-- Create a better function to get available time slots with proper debugging
CREATE OR REPLACE FUNCTION public.get_companion_time_slots(_companion_id uuid, _date date)
RETURNS TABLE(
  slot_type text,
  start_time time,
  end_time time,
  is_available boolean,
  is_booked boolean,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    has_specific_slots boolean := false;
    unavailable_day boolean := false;
BEGIN
    -- Check if day is marked as unavailable
    SELECT EXISTS(
        SELECT 1 FROM public.companion_unavailable_days 
        WHERE companion_id = _companion_id AND date = _date
    ) INTO unavailable_day;
    
    -- If day is unavailable, return empty result
    IF unavailable_day THEN
        RETURN;
    END IF;
    
    -- Check if companion has specific availability slots for this date
    SELECT EXISTS(
        SELECT 1 FROM public.companion_availability 
        WHERE companion_id = _companion_id AND date = _date
    ) INTO has_specific_slots;
    
    -- If has specific slots, return those
    IF has_specific_slots THEN
        RETURN QUERY
        SELECT 
            'specific'::text as slot_type,
            ca.start_time,
            ca.end_time,
            ca.is_available,
            EXISTS(
                SELECT 1 FROM public.bookings b
                WHERE b.companion_id = _companion_id 
                  AND b.date = _date 
                  AND b.status != 'cancelled'
                  AND (
                    (ca.start_time >= b.time AND ca.start_time < (b.time + (b.duration || ' hours')::INTERVAL)) OR
                    (ca.end_time > b.time AND ca.end_time <= (b.time + (b.duration || ' hours')::INTERVAL)) OR
                    (ca.start_time <= b.time AND ca.end_time >= (b.time + (b.duration || ' hours')::INTERVAL))
                  )
            ) as is_booked,
            'database'::text as source
        FROM public.companion_availability ca
        WHERE ca.companion_id = _companion_id 
          AND ca.date = _date
        ORDER BY ca.start_time;
    ELSE
        -- Return default time slots (9 AM to 5 PM in 30-minute intervals)
        RETURN QUERY
        WITH RECURSIVE time_slots AS (
            SELECT 
                '09:00:00'::time as slot_start_time,
                '09:30:00'::time as slot_end_time
            UNION ALL
            SELECT 
                (slot_start_time + interval '30 minutes')::time,
                (slot_end_time + interval '30 minutes')::time
            FROM time_slots
            WHERE slot_start_time < '16:30:00'::time
        )
        SELECT 
            'default'::text as slot_type,
            ts.slot_start_time as start_time,
            ts.slot_end_time as end_time,
            true as is_available,
            EXISTS(
                SELECT 1 FROM public.bookings b
                WHERE b.companion_id = _companion_id 
                  AND b.date = _date 
                  AND b.status != 'cancelled'
                  AND (
                    (ts.slot_start_time >= b.time AND ts.slot_start_time < (b.time + (b.duration || ' hours')::INTERVAL)) OR
                    (ts.slot_end_time > b.time AND ts.slot_end_time <= (b.time + (b.duration || ' hours')::INTERVAL)) OR
                    (ts.slot_start_time <= b.time AND ts.slot_end_time >= (b.time + (b.duration || ' hours')::INTERVAL))
                  )
            ) as is_booked,
            'default'::text as source
        FROM time_slots ts
        ORDER BY ts.slot_start_time;
    END IF;
END;
$function$;

