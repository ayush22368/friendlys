
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- Create a security definer function to check if user is admin
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
$$;

-- Create new admin policy using the security definer function
CREATE POLICY "Admins can manage all user roles" 
  ON public.user_roles 
  FOR ALL 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Update profiles policies to use the same function
DROP POLICY IF EXISTS "Admins can create any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can create any profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.is_admin(auth.uid()) OR auth.uid() = id);
