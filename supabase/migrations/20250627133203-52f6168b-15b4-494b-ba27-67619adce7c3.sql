
-- Fix the check_booking_conflict function to allow bookings in both default and specific available slots
CREATE OR REPLACE FUNCTION public.check_booking_conflict(_companion_id uuid, _date date, _start_time time without time zone, _duration integer)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    booking_end_time time;
    has_specific_slots boolean := false;
    unavailable_day boolean := false;
BEGIN
    -- Calculate booking end time
    booking_end_time := (_start_time + (_duration || ' hours')::INTERVAL)::time;
    
    -- Check if day is marked as unavailable
    SELECT EXISTS(
        SELECT 1 FROM public.companion_unavailable_days 
        WHERE companion_id = _companion_id AND date = _date
    ) INTO unavailable_day;
    
    -- If day is unavailable, it's a conflict
    IF unavailable_day THEN
        RETURN true;
    END IF;
    
    -- Check for direct booking conflicts first
    IF EXISTS (
        SELECT 1
        FROM public.bookings
        WHERE companion_id = _companion_id
          AND date = _date
          AND status != 'cancelled'
          AND (
            (_start_time >= time AND _start_time < (time + (duration || ' hours')::INTERVAL)) OR
            (booking_end_time > time AND booking_end_time <= (time + (duration || ' hours')::INTERVAL)) OR
            (_start_time <= time AND booking_end_time >= (time + (duration || ' hours')::INTERVAL))
          )
    ) THEN
        RETURN true;
    END IF;
    
    -- Check if companion has specific availability for this date
    SELECT EXISTS(
        SELECT 1 FROM public.companion_availability 
        WHERE companion_id = _companion_id AND date = _date
    ) INTO has_specific_slots;
    
    -- If has specific slots, use the same logic as get_companion_time_slots
    IF has_specific_slots THEN
        -- Check if booking overlaps with any unavailable period
        IF EXISTS (
            SELECT 1
            FROM public.companion_availability ca
            WHERE ca.companion_id = _companion_id 
              AND ca.date = _date
              AND ca.is_available = false
              AND (
                (_start_time >= ca.start_time AND _start_time < ca.end_time) OR
                (booking_end_time > ca.start_time AND booking_end_time <= ca.end_time) OR
                (_start_time <= ca.start_time AND booking_end_time >= ca.end_time)
              )
        ) THEN
            RETURN true;
        END IF;
        
        -- Check if booking fits within specific available slots OR within default hours (but not unavailable periods)
        IF EXISTS (
            SELECT 1
            FROM public.companion_availability ca
            WHERE ca.companion_id = _companion_id 
              AND ca.date = _date
              AND ca.is_available = true
              AND ca.start_time <= _start_time
              AND ca.end_time >= booking_end_time
        ) THEN
            -- Booking fits in specific available slot
            RETURN false;
        END IF;
        
        -- Check if booking is within default hours (9 AM to 5 PM) and doesn't overlap with unavailable periods
        IF _start_time >= '09:00:00'::time AND booking_end_time <= '17:00:00'::time THEN
            -- It's within default hours, so it's allowed (since we already checked unavailable periods above)
            RETURN false;
        END IF;
        
        -- If we get here, booking doesn't fit anywhere
        RETURN true;
    END IF;
    
    -- No specific slots, so only check default hours
    IF _start_time < '09:00:00'::time OR booking_end_time > '17:00:00'::time THEN
        RETURN true;
    END IF;
    
    -- No conflict found
    RETURN false;
END;
$function$;
