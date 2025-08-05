-- Add points column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN points integer DEFAULT 0 NOT NULL;

-- Update existing profiles to have 0 points initially
UPDATE public.profiles 
SET points = 0 
WHERE points IS NULL;