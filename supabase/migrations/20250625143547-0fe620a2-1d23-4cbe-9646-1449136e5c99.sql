
-- Create a function for admin users to get all bookings (fixed syntax)
CREATE OR REPLACE FUNCTION get_all_bookings_admin()
RETURNS TABLE (
  id uuid,
  user_id text,
  companion_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  date date,
  "time" time,
  duration integer,
  location text,
  status text,
  total_amount integer,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  companions json
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    b.id,
    b.user_id,
    b.companion_id,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.date,
    b."time",
    b.duration,
    b.location,
    b.status,
    b.total_amount,
    b.notes,
    b.created_at,
    b.updated_at,
    json_build_object('name', c.name) as companions
  FROM bookings b
  LEFT JOIN companions c ON b.companion_id = c.id
  ORDER BY b.created_at DESC;
$$;

-- Grant execute permission to authenticated users (admin check will be in the app)
GRANT EXECUTE ON FUNCTION get_all_bookings_admin() TO authenticated;
