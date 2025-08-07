import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (!roleLoading && isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, roleLoading, navigate]);

  // Conversion rate: 9 points = 1 Baht
  const pointsToMoney = (points: number) => Math.floor(points / 9);

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Dashboard</h1>
        
        <Navigation />

        <Card className="p-8 text-center">
          <div className="mb-6">
            <p className="text-lg text-foreground mb-2">
              User {profile.student_id}
            </p>
          </div>

          <div className="mb-8">
            <p className="text-lg text-foreground mb-2">สวัสดี</p>
            <p className="text-3xl font-bold text-primary mb-6">{profile.name}</p>
            <p className="text-lg text-muted-foreground">รหัสนักศึกษา: {profile.student_id}</p>
          </div>

          <div className="mb-6">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
              <p className="text-lg text-muted-foreground mb-2">คะแนนสะสม</p>
              <p className="text-4xl font-bold text-primary">{profile.points || 0} แต้ม</p>
              <p className="text-sm text-muted-foreground mt-2">
                เทียบเท่า {pointsToMoney(profile.points || 0)} บาท
              </p>
            </div>
          </div>

          <div className="text-center text-muted-foreground">
            <p className="text-sm">ติดต่อแอดมินเพื่อแลกคะแนนเป็นเงิน</p>
          </div>
        </Card>
      </div>
    </div>
  );
}