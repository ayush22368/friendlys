
-- Fix the get_companion_time_slots function to only return available slots
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
          AND ca.is_available = true  -- ONLY return available slots
        ORDER BY ca.start_time;
    ELSE
        -- Return default time slots (9 AM to 5 PM in 30-minute intervals)
        RETURN QUERY
        WITH RECURSIVE default_slots AS (
            SELECT 
                '09:00:00'::time as slot_start,
                '09:30:00'::time as slot_end
            UNION ALL
            SELECT 
                (slot_start + interval '30 minutes')::time,
                (slot_end + interval '30 minutes')::time
            FROM default_slots
            WHERE slot_start < '16:30:00'::time
        )
        SELECT 
            'default'::text as slot_type,
            ds.slot_start as start_time,
            ds.slot_end as end_time,
            true as is_available,
            EXISTS(
                SELECT 1 FROM public.bookings b
                WHERE b.companion_id = _companion_id 
                  AND b.date = _date 
                  AND b.status != 'cancelled'
                  AND (
                    (ds.slot_start >= b.time AND ds.slot_start < (b.time + (b.duration || ' hours')::INTERVAL)) OR
                    (ds.slot_end > b.time AND ds.slot_end <= (b.time + (b.duration || ' hours')::INTERVAL)) OR
                    (ds.slot_start <= b.time AND ds.slot_end >= (b.time + (b.duration || ' hours')::INTERVAL))
                  )
            ) as is_booked,
            'default'::text as source
        FROM default_slots ds
        ORDER BY ds.slot_start;
    END IF;
END;
$function$;
