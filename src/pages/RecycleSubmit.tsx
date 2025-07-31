import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function RecycleSubmit() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bottles, setBottles] = useState('');
  const [loading, setLoading] = useState(false);

  // Conversion rate: 1 bottle = 1 point, 9 points = 1 Baht
  const pointsEarned = parseInt(bottles) || 0;
  const moneyEarned = Math.floor(pointsEarned / 9);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const bottleCount = parseInt(bottles);
    if (bottleCount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of bottles.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Add recycling history entry
      const { error: historyError } = await supabase
        .from('recycling_history')
        .insert({
          user_id: profile.user_id,
          bottles: bottleCount,
          money_received: moneyEarned
        });

      if (historyError) throw historyError;

      // Update user points
      const newTotalPoints = profile.total_points + pointsEarned;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ total_points: newTotalPoints })
        .eq('user_id', profile.user_id);

      if (profileError) throw profileError;

      await refreshProfile();
      
      toast({
        title: "Success",
        description: `Successfully submitted ${bottleCount} bottles! You earned ${pointsEarned} points.`,
      });
      
      navigate('/dashboard');
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
        <h1 className="text-3xl font-bold text-foreground mb-6">Submit Recycling</h1>
        
        <Navigation />

        <Card className="p-8 max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="bottles">จำนวนขวดที่รีไซเคิล</Label>
              <Input
                id="bottles"
                type="number"
                value={bottles}
                onChange={(e) => setBottles(e.target.value)}
                placeholder="กรอกจำนวนขวด"
                min="1"
                required
              />
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>คะแนนที่จะได้รับ:</span>
                  <span className="font-semibold">{pointsEarned}</span>
                </div>
                <div className="flex justify-between">
                  <span>เงินที่คิดได้:</span>
                  <span className="font-semibold">{moneyEarned} บาท</span>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || !bottles || parseInt(bottles) <= 0}
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยันการรีไซเคิล'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}