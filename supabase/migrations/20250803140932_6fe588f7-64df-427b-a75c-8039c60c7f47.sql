-- Insert admin user for testing
-- Note: You'll need to manually create this user account in Supabase Auth
-- Email: admin@recycleapp.com, Password: admin123456
-- Then run this to add the profile

-- Insert admin profile (you can change the email as needed)
INSERT INTO public.profiles (user_id, student_id, name, email, total_points)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ADMIN001',
  'System Administrator',
  'admin@recycleapp.com',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE student_id = 'ADMIN001'
);

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid 
  AND role = 'admin'::app_role
);