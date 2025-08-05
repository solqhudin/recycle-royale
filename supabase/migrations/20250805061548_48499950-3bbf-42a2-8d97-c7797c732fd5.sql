-- Create trigger function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, student_id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'student_id',
    NEW.raw_user_meta_data ->> 'name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger that fires when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create admin user in auth.users first, then the profile will be created automatically
-- We'll insert the admin user directly into auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data,
  is_super_admin,
  role
) VALUES (
  'afc2e6c6-dbe6-4cec-8d81-59bd8125ce0d',
  'admin001@recycleapp.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"student_id": "ADMIN001", "name": "ADMIN001"}',
  '{}',
  false,
  'authenticated'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Add admin role to the user
INSERT INTO public.user_roles (user_id, role)
VALUES ('afc2e6c6-dbe6-4cec-8d81-59bd8125ce0d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Make sure bottle rates exist
INSERT INTO public.bottle_rates (bottles_per_unit, money_per_unit, is_active)
VALUES (40, 5.00, true)
ON CONFLICT DO NOTHING;