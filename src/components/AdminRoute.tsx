
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        // ปล่อยให้ ProtectedRoute จัดการกรณียังไม่ล็อกอิน
        return;
      }
      if (!isAdmin) {
        toast({
          title: "ไม่มีสิทธิ์เข้าถึง",
          description: "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น",
          variant: "destructive",
        });
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate, toast]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
