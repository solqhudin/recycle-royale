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
  signIn: (loginId: string, password: string) => Promise<{ error: any }>;
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
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      }
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
      setLoading(true);
      
      // Check if student ID already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingProfile) {
        const error = { message: 'รหัสนักศึกษานี้ถูกใช้งานแล้ว' };
        toast({
          title: "ไม่สามารถสมัครสมาชิกได้",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

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
        let errorMessage = error.message;
        if (error.message.includes('User already registered')) {
          errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
        }
        
        toast({
          title: "สมัครสมาชิกไม่สำเร็จ",
          description: errorMessage,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "สมัครสมาชิกสำเร็จ",
        description: "สามารถเข้าสู่ระบบได้ทันที",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive"
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (loginId: string, password: string) => {
    try {
      setLoading(true);
      
      // Determine if this is admin login or student login
      const isAdmin = loginId.startsWith('ADMIN');
      
      // First, find the user's email by student ID or admin ID
      // Query without RLS restriction using service role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, user_id')
        .eq('student_id', loginId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile lookup error:', profileError);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถค้นหาข้อมูลผู้ใช้ได้",
          variant: "destructive"
        });
        return { error: profileError };
      }

      if (!profileData) {
        // Try to find email by checking auth.users table
        // Note: This is a fallback for users who might not have profiles created yet
        console.log('Profile not found for login ID:', loginId);
        
        const errorMessage = isAdmin 
          ? 'ไม่พบรหัส Admin นี้ในระบบ กรุณาตรวจสอบรหัสอีกครั้ง'
          : 'ไม่พบรหัสนักศึกษานี้ในระบบ กรุณาตรวจสอบรหัสนักศึกษาอีกครั้ง';
        
        const error = { message: errorMessage };
        toast({
          title: "ไม่พบข้อมูล",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      // Attempt to sign in with the found email
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password,
      });

      if (error) {
        let errorMessage = "รหัสผ่านไม่ถูกต้อง";
        
        // Handle specific error types
        if (error.message.includes('email') && error.message.includes('confirm')) {
          errorMessage = "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ";
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = "รหัสผ่านไม่ถูกต้อง";
        } else if (error.message.includes('too many requests')) {
          errorMessage = "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่";
        }
        
        toast({
          title: "เข้าสู่ระบบไม่สำเร็จ", 
          description: errorMessage,
          variant: "destructive"
        });
        return { error };
      }

      // Success - user will be automatically set via auth state change
      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "ยินดีต้อนรับเข้าสู่ระบบ!",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive"
      });
      return { error };
    } finally {
      setLoading(false);
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