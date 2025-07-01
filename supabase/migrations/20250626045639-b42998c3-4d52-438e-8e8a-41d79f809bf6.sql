
-- First, let's create an admin user directly in the auth system
-- You'll need to run this SQL in your Supabase SQL Editor

-- Insert admin user (replace with your preferred email/password)
-- This creates a user with email 'admin@frndly.app' and password 'admin123'
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@frndly.app',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Get the user ID for the admin user we just created
-- Then insert admin role for this user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@frndly.app';

-- Let's also create a companion user for testing
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'companion@frndly.app',
  crypt('companion123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Companion User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create a companion profile and link it to the companion user
INSERT INTO public.companions (name, age, bio, location, rate, image)
VALUES (
  'Test Companion',
  25,
  'A friendly companion for testing purposes.',
  'Mumbai',
  5000,
  'https://images.unsplash.com/photo-1494790108755-2616b412f08c?q=80&w=200&h=200&fit=crop'
);

-- Link the companion user to the companion profile
INSERT INTO public.user_roles (user_id, role, companion_id)
SELECT u.id, 'companion'::app_role, c.id
FROM auth.users u, public.companions c
WHERE u.email = 'companion@frndly.app'
AND c.name = 'Test Companion';
