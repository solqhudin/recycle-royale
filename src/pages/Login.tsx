import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn(loginId, password);
    
    if (result.success) {
      // Redirect admin to admin dashboard, regular users to dashboard
      navigate(result.isAdmin ? '/admin' : '/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">เข้าสู่ระบบ</h1>
          <p className="text-foreground text-lg">กรุณากรอกรหัสนักศึกษา หรือรหัส Admin และรหัสผ่าน</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="รหัสนักศึกษา หรือรหัส Admin (เช่น ADMIN001)"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              className="w-full"
            />
          </div>
          
          <div>
            <Input
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        <div className="my-6">
          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex justify-center">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full" asChild>
          <Link to="/signup">สมัครสมาชิก</Link>
        </Button>
      </Card>
    </div>
  );
}