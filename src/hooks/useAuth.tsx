import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  student_id: string;
  name: string;
  email: string;
  total_points: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (studentId: string, name: string, email: string, password: string) => Promise<{ error: any }>;
  signIn: (studentId: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to avoid potential deadlocks
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (studentId: string, name: string, email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            student_id: studentId,
            name: name
          }
        }
      });

      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sign Up Successful",
          description: "Please check your email to confirm your account.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signIn = async (studentId: string, password: string) => {
    try {
      console.log('Attempting to sign in with Student ID:', studentId);
      
      // First, find the user's email by student ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('student_id', studentId)
        .single();

      console.log('Profile lookup result:', { profileData, profileError });

      if (profileError || !profileData) {
        const error = { message: 'Invalid Student ID or Password' };
        console.log('Profile not found for Student ID:', studentId);
        toast({
          title: "Login Error",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      console.log('Found email for Student ID:', profileData.email);

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password,
      });

      console.log('Auth result:', { authData, error });

      if (error) {
        console.log('Auth error:', error);
        let errorMessage = "Invalid Student ID or Password";
        
        // Check if it's an email confirmation issue
        if (error.message.includes('email') && error.message.includes('confirm')) {
          errorMessage = "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ หรือติดต่อผู้ดูแลระบบ";
        }
        
        toast({
          title: "Login Error", 
          description: errorMessage,
          variant: "destructive"
        });
      }

      return { error };
    } catch (error: any) {
      console.log('Catch error:', error);
      toast({
        title: "Login Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error: any) {
      toast({
        title: "Logout Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}