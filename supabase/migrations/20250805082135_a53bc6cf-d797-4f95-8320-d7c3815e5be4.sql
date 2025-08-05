-- Delete all existing users and recreate properly
DELETE FROM auth.users;

-- Create admin user using the Supabase auth.admin_create_user function or direct insert
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'afc2e6c6-dbe6-4cec-8d81-59bd8125ce0d'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin001@recycleapp.com',
  '$2a$10$6RlSqlJiLWTCrQqUCCpZFuyLWqTMHYhKTOyEGLFfkevTUx.9IQxS.',
  NOW(),
  NOW(),
  NOW(),
  '{"student_id": "ADMIN001", "name": "ADMIN001"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- Create a regular user for testing
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bbf2e6c6-dbe6-4cec-8d81-59bd8125ce0d'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  '406559030@student.chula.ac.th',
  '$2a$10$6RlSqlJiLWTCrQqUCCpZFuyLWqTMHYhKTOyEGLFfkevTUx.9IQxS.',
  NOW(),
  NOW(),
  NOW(),
  '{"student_id": "406559030", "name": "นักศึกษาทดสอบ"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- Create profiles for both users
INSERT INTO public.profiles (id, user_id, student_id, name, email, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'afc2e6c6-dbe6-4cec-8d81-59bd8125ce0d', 'ADMIN001', 'ADMIN001', 'admin001@recycleapp.com', NOW(), NOW()),
  (gen_random_uuid(), 'bbf2e6c6-dbe6-4cec-8d81-59bd8125ce0d', '406559030', 'นักศึกษาทดสอบ', '406559030@student.chula.ac.th', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  student_id = EXCLUDED.student_id,
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- Create user roles
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('afc2e6c6-dbe6-4cec-8d81-59bd8125ce0d', 'admin'),
  ('bbf2e6c6-dbe6-4cec-8d81-59bd8125ce0d', 'user')
ON CONFLICT (user_id, role) DO NOTHING;