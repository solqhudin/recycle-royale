import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Student Recycling Program
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Recycle and earn points for a better environment
        </p>
        <Button size="lg" className="text-lg px-8 py-3" onClick={() => navigate('/login')}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
