-- Fix all database issues

-- 1. First drop the existing enum and recreate it properly
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Recreate user_roles table with proper structure
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Recreate bottle_rates table
DROP TABLE IF EXISTS public.bottle_rates CASCADE;
CREATE TABLE public.bottle_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bottles_per_unit INTEGER NOT NULL,
    money_per_unit DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Make sure profiles table exists with proper foreign key
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    student_id TEXT UNIQUE,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Recreate recycling_history with proper foreign key relationship
DROP TABLE IF EXISTS public.recycling_history CASCADE;
CREATE TABLE public.recycling_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bottles INTEGER NOT NULL,
    money_received DECIMAL(10,2) NOT NULL,
    rate_id UUID REFERENCES public.bottle_rates(id),
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycling_history ENABLE ROW LEVEL SECURITY;

-- 7. Create the security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 8. Create function to get active rate
CREATE OR REPLACE FUNCTION public.get_active_rate()
RETURNS TABLE(id UUID, bottles_per_unit INTEGER, money_per_unit DECIMAL)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT bottle_rates.id, bottle_rates.bottles_per_unit, bottle_rates.money_per_unit
  FROM public.bottle_rates
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- 9. Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles" ON public.user_roles
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. Create RLS policies for bottle_rates
CREATE POLICY "Everyone can view active rates" ON public.bottle_rates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all rates" ON public.bottle_rates
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert rates" ON public.bottle_rates
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rates" ON public.bottle_rates
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 11. Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 12. Create RLS policies for recycling_history
CREATE POLICY "Users can view their own history" ON public.recycling_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history" ON public.recycling_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all history" ON public.recycling_history
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 13. Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bottle_rates_updated_at
    BEFORE UPDATE ON public.bottle_rates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recycling_history_updated_at
    BEFORE UPDATE ON public.recycling_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Create handle_new_user function and trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. Insert default bottle rate
INSERT INTO public.bottle_rates (bottles_per_unit, money_per_unit, is_active)
VALUES (40, 5.00, true)
ON CONFLICT DO NOTHING;