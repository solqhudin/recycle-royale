-- Delete existing admin user and recreate with proper password
DELETE FROM auth.users WHERE email = 'admin001@recycleapp.com';

-- Create admin user with proper password hashing
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
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'afc2e6c6-dbe6-4cec-8d81-59bd8125ce0d',
  'admin001@recycleapp.com',
  '$2a$10$hPq1K5Fj8wJG1vGG8g8g8OzKzKzKzKzKzKzKzKzKzKzKzKzKzKzKz2',
  now(),
  now(),
  now(),
  '{"student_id": "ADMIN001", "name": "ADMIN001"}',
  '{"provider": "email", "providers": ["email"]}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = '$2a$10$hPq1K5Fj8wJG1vGG8g8g8OzKzKzKzKzKzKzKzKzKzKzKzKzKzKzKz2',
  email_confirmed_at = now(),
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data;

-- Update password to 'admin123' using the auth.crypt function
UPDATE auth.users 
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin001@recycleapp.com';

-- Make sure the user is confirmed
UPDATE auth.users 
SET email_confirmed_at = now(), 
    confirmation_token = '',
    email_change_confirm_status = 0
WHERE email = 'admin001@recycleapp.com';