-- Add missing user role for the new user
INSERT INTO public.user_roles (user_id, role)
VALUES ('849c4c0a-01af-48be-8827-db971b89dca5', 'user'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;