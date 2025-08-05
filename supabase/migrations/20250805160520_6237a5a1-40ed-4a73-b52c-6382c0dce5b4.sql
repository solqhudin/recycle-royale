-- Create a security definer function to get user email by student_id
-- This bypasses RLS and allows anonymous users to find email for login
CREATE OR REPLACE FUNCTION public.get_user_email_by_student_id(_student_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT email
  FROM public.profiles
  WHERE student_id = _student_id
  LIMIT 1
$$;