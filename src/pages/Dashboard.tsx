import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [redeemPoints, setRedeemPoints] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (!roleLoading && isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, roleLoading, navigate]);

  // Conversion rate: 9 points = 1 Baht
  const pointsToMoney = (points: number) => Math.floor(points / 9);
  const moneyAmount = pointsToMoney(parseInt(redeemPoints) || 0);

  const handleRedeemSubmit = async () => {
    if (!profile) return;
    
    const pointsToRedeem = parseInt(redeemPoints);
    
    if (pointsToRedeem > profile.total_points) {
      toast({
        title: "Error",
        description: "You don't have enough points to redeem.",
        variant: "destructive"
      });
      return;
    }

    if (pointsToRedeem < 9) {
      toast({
        title: "Error",
        description: "Minimum redemption is 9 points (1 Baht).",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const newTotalPoints = profile.total_points - pointsToRedeem;
      
      const { error } = await supabase
        .from('profiles')
        .update({ total_points: newTotalPoints })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Success",
        description: `Successfully redeemed ${pointsToRedeem} points for ${moneyAmount} Baht!`,
      });
      
      setIsModalOpen(false);
      setRedeemPoints('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
            <p className="text-lg text-foreground mb-2">Total Points</p>
            <p className="text-6xl font-bold text-primary mb-6">{profile.total_points}</p>
          </div>

          <div className="mb-6">
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-3 text-lg mr-4"
              onClick={() => window.location.href = '/recycle-submit'}
            >
              Submit Recycling
            </Button>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="px-8 py-3 text-lg"
                onClick={() => setRedeemPoints(profile.total_points.toString())}
              >
                แลกคะแนน
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Redeem Points</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="points">กรอกจำนวนคะแนนที่จะแลก</Label>
                  <Input
                    id="points"
                    type="number"
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value)}
                    max={profile.total_points}
                    min="0"
                  />
                </div>
                
                <div>
                  <Label>ได้เงิน</Label>
                  <p className="text-lg font-semibold">{moneyAmount} บาท</p>
                </div>

                <Button 
                  onClick={handleRedeemSubmit} 
                  className="w-full"
                  disabled={loading || !redeemPoints || parseInt(redeemPoints) < 9}
                >
                  {loading ? 'Processing...' : 'ยืนยันแลกคะแนน'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      </div>
    </div>
  );
}