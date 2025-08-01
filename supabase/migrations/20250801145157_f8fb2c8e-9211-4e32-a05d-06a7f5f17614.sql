-- Create a policy that allows reading email and student_id for login purposes
CREATE POLICY "Allow reading email for login" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Drop the old restrictive policy 
DROP POLICY "Users can view their own profile" ON public.profiles;

-- Create new policy for viewing full profile (only when authenticated)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);