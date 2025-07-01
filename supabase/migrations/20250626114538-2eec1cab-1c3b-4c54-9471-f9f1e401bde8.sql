
-- Function to get available time slots for a companion on a specific date
CREATE OR REPLACE FUNCTION public.get_available_slots(_companion_id uuid, _date date)
RETURNS TABLE(
  id uuid,
  start_time time,
  end_time time,
  is_booked boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  WITH booked_slots AS (
    SELECT 
      b.time as start_time,
      (b.time + (b.duration || ' hours')::INTERVAL)::time as end_time
    FROM public.bookings b
    WHERE b.companion_id = _companion_id 
      AND b.date = _date 
      AND b.status != 'cancelled'
  )
  SELECT 
    ca.id,
    ca.start_time,
    ca.end_time,
    EXISTS(
      SELECT 1 FROM booked_slots bs
      WHERE (ca.start_time >= bs.start_time AND ca.start_time < bs.end_time) OR
            (ca.end_time > bs.start_time AND ca.end_time <= bs.end_time) OR
            (ca.start_time <= bs.start_time AND ca.end_time >= bs.end_time)
    ) as is_booked
  FROM public.companion_availability ca
  WHERE ca.companion_id = _companion_id 
    AND ca.date = _date 
    AND ca.is_available = true
  ORDER BY ca.start_time;
$function$
