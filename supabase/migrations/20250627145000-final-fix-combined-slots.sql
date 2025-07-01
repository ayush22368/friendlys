
-- Final fix for get_companion_time_slots function to properly show BOTH default and specific slots
CREATE OR REPLACE FUNCTION public.get_companion_time_slots(_companion_id uuid, _date date)
RETURNS TABLE(slot_type text, start_time time without time zone, end_time time without time zone, is_available boolean, is_booked boolean, source text)
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
    
    -- Check if companion has ANY specific availability slots for this date
    SELECT EXISTS(
        SELECT 1 FROM public.companion_availability 
        WHERE companion_id = _companion_id AND date = _date
    ) INTO has_specific_slots;
    
    -- If NO specific slots at all, return ONLY default slots
    IF NOT has_specific_slots THEN
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
        
    -- If HAS specific slots, return COMBINED results
    ELSE
        RETURN QUERY
        WITH RECURSIVE default_slots AS (
            SELECT 
                '09:00:00'::time as slot_start_time,
                '09:30:00'::time as slot_end_time
            UNION ALL
            SELECT 
                (slot_start_time + interval '30 minutes')::time,
                (slot_end_time + interval '30 minutes')::time
            FROM default_slots
            WHERE slot_start_time < '16:30:00'::time
        ),
        -- Get unavailable periods to exclude from default slots
        unavailable_periods AS (
            SELECT ca.start_time, ca.end_time
            FROM public.companion_availability ca
            WHERE ca.companion_id = _companion_id 
              AND ca.date = _date
              AND ca.is_available = false
        ),
        -- Filter out default slots that overlap with unavailable periods
        available_default_slots AS (
            SELECT 
                'default'::text as slot_type,
                ds.slot_start_time as start_time,
                ds.slot_end_time as end_time,
                true as is_available,
                EXISTS(
                    SELECT 1 FROM public.bookings b
                    WHERE b.companion_id = _companion_id 
                      AND b.date = _date 
                      AND b.status != 'cancelled'
                      AND (
                        (ds.slot_start_time >= b.time AND ds.slot_start_time < (b.time + (b.duration || ' hours')::INTERVAL)) OR
                        (ds.slot_end_time > b.time AND ds.slot_end_time <= (b.time + (b.duration || ' hours')::INTERVAL)) OR
                        (ds.slot_start_time <= b.time AND ds.slot_end_time >= (b.time + (b.duration || ' hours')::INTERVAL))
                      )
                ) as is_booked,
                'default'::text as source
            FROM default_slots ds
            WHERE NOT EXISTS (
                SELECT 1 FROM unavailable_periods up
                WHERE (ds.slot_start_time >= up.start_time AND ds.slot_start_time < up.end_time) OR
                      (ds.slot_end_time > up.start_time AND ds.slot_end_time <= up.end_time) OR
                      (ds.slot_start_time <= up.start_time AND ds.slot_end_time >= up.end_time)
            )
        ),
        -- Get specific available slots
        specific_available_slots AS (
            SELECT 
                'specific'::text as slot_type,
                ca.start_time,
                ca.end_time,
                true as is_available, -- Force to true since we're only selecting available ones
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
                'specific'::text as source
            FROM public.companion_availability ca
            WHERE ca.companion_id = _companion_id 
              AND ca.date = _date
              AND ca.is_available = true
        )
        -- UNION ALL to combine both default (filtered) and specific available slots
        SELECT * FROM available_default_slots
        UNION ALL
        SELECT * FROM specific_available_slots
        ORDER BY start_time;
    END IF;
END;
$function$;
