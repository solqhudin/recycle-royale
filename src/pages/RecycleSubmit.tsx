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

  // Use default rate for display (will be calculated with actual rate on submit)
  const bottleCount = parseInt(bottles) || 0;
  const estimatedMoney = (bottleCount / 40) * 5; // 40 bottles = 5 baht (default rate)

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
      // Get current active rate first
      const { data: rateData, error: rateError } = await supabase
        .from('bottle_rates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rateError || !rateData) {
        throw new Error('ไม่พบข้อมูลอัตราแลกเปลี่ยน');
      }

      // Calculate money based on current rate
      const moneyReceived = (bottleCount / rateData.bottles_per_unit) * rateData.money_per_unit;

      // Add recycling history entry with calculated money
      const { error: historyError } = await supabase
        .from('recycling_history')
        .insert({
          user_id: profile.user_id,
          bottles: bottleCount,
          money_received: moneyReceived,
          rate_id: rateData.id
        });

      if (historyError) throw historyError;

      await refreshProfile();
      
      toast({
        title: "สำเร็จ",
        description: `ส่งขวดรีไซเคิล ${bottleCount} ขวดเรียบร้อยแล้ว! ได้เงิน ${moneyReceived.toFixed(2)} บาท`,
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
                  <span>จำนวนขวด:</span>
                  <span className="font-semibold">{bottleCount} ขวด</span>
                </div>
                <div className="flex justify-between">
                  <span>เงินที่จะได้ (ประมาณ):</span>
                  <span className="font-semibold">{estimatedMoney.toFixed(2)} บาท</span>
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