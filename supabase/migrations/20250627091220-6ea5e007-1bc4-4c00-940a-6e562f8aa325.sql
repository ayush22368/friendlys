
-- Update the get_companion_time_slots function to handle unavailable periods correctly
CREATE OR REPLACE FUNCTION public.get_companion_time_slots(_companion_id uuid, _date date)
RETURNS TABLE(slot_type text, start_time time without time zone, end_time time without time zone, is_available boolean, is_booked boolean, source text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    has_specific_slots boolean := false;
    unavailable_day boolean := false;
    has_available_slots boolean := false;
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
    
    -- Check if companion has any AVAILABLE slots for this date
    SELECT EXISTS(
        SELECT 1 FROM public.companion_availability 
        WHERE companion_id = _companion_id AND date = _date AND is_available = true
    ) INTO has_available_slots;
    
    -- If has specific slots AND has available slots, return those available slots
    IF has_specific_slots AND has_available_slots THEN
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
          AND ca.is_available = true
        ORDER BY ca.start_time;
    
    -- If has specific slots but NO available slots (all are unavailable/blocked periods)
    -- Return default slots MINUS the unavailable periods
    ELSIF has_specific_slots AND NOT has_available_slots THEN
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
        ),
        unavailable_periods AS (
            SELECT ca.start_time, ca.end_time
            FROM public.companion_availability ca
            WHERE ca.companion_id = _companion_id 
              AND ca.date = _date
              AND ca.is_available = false
        )
        SELECT 
            'hybrid'::text as slot_type,
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
            'hybrid'::text as source
        FROM time_slots ts
        WHERE NOT EXISTS (
            -- Exclude slots that overlap with unavailable periods
            SELECT 1 FROM unavailable_periods up
            WHERE (ts.slot_start_time >= up.start_time AND ts.slot_start_time < up.end_time) OR
                  (ts.slot_end_time > up.start_time AND ts.slot_end_time <= up.end_time) OR
                  (ts.slot_start_time <= up.start_time AND ts.slot_end_time >= up.end_time)
        )
        ORDER BY ts.slot_start_time;
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
$function$
