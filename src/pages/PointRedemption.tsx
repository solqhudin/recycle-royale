import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { useActiveRate } from '@/hooks/useActiveRate';

interface Profile {
  user_id: string;
  student_id: string;
  name: string;
  points: number;
}

interface RedemptionHistory {
  id: string;
  user_id: string;
  points_redeemed: number;
  money_amount: number;
  redeemed_at: string;
  student_id: string;
  name: string;
}

export default function PointRedemption() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [history, setHistory] = useState<RedemptionHistory[]>([]);
  const { toast } = useToast();

  const { rate, loading: rateLoading, pointsToMoney } = useActiveRate();
  const minPoints = rate?.bottles_per_unit ?? 9;
  const moneyAmount = pointsToMoney(parseInt(pointsToRedeem) || 0);

  useEffect(() => {
    fetchProfiles();
    fetchRedemptionHistory();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, student_id, name, points')
        .order('student_id');

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRedemptionHistory = async () => {
    try {
      // Cast supabase to any to access a table not present in generated types yet
      const { data, error } = await (supabase as any)
        .from('point_redemptions')
        .select(`
          id,
          user_id,
          points_redeemed,
          money_amount,
          redeemed_at,
          profiles!inner(student_id, name)
        `)
        .order('redeemed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching redemption history:', error);
        return;
      }

      const formattedHistory = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        points_redeemed: item.points_redeemed,
        money_amount: item.money_amount,
        redeemed_at: item.redeemed_at,
        student_id: item.profiles.student_id,
        name: item.profiles.name
      }));

      setHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching redemption history:', error);
    }
  };

  const handleRedemption = async () => {
    if (!selectedProfile || !pointsToRedeem) return;

    const pointsToRedeemInt = parseInt(pointsToRedeem);
    
    if (pointsToRedeemInt < minPoints) {
      toast({
        title: "ข้อผิดพลาด",
        description: `แลกคะแนนขั้นต่ำ ${minPoints} แต้ม (${rate?.money_per_unit ?? 1} บาท)`,
        variant: "destructive"
      });
      return;
    }

    if (pointsToRedeemInt > selectedProfile.points) {
      toast({
        title: "ข้อผิดพลาด",
        description: "คะแนนไม่เพียงพอ",
        variant: "destructive"
      });
      return;
    }

    try {
      setRedeeming(true);

      // Use a typed bypass for the RPC function missing in generated types
      const { error: redeemError } = await (supabase as any).rpc('redeem_points', {
        p_user_id: selectedProfile!.user_id,
        p_points: parseInt(pointsToRedeem),
        p_money: moneyAmount
      });

      if (redeemError) {
        throw redeemError;
      }

      toast({
        title: "แลกคะแนนสำเร็จ",
        description: `แลกคะแนน ${pointsToRedeemInt} แต้ม เป็นเงิน ${moneyAmount} บาท สำหรับ ${selectedProfile.name}`,
      });

      // Refresh data
      await fetchProfiles();
      await fetchRedemptionHistory();
      
      // Reset form
      setSelectedProfile(null);
      setPointsToRedeem('');
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถแลกคะแนนได้",
        variant: "destructive"
      });
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Navigation />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">แลกคะแนนเป็นเงิน</h1>
          <p className="text-muted-foreground">จัดการการแลกคะแนนเป็นเงินสำหรับผู้ใช้</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Redemption Form */}
          <Card>
            <CardHeader>
              <CardTitle>แลกคะแนนเป็นเงิน</CardTitle>
              <CardDescription>เลือกผู้ใช้และจำนวนคะแนนที่ต้องการแลก</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>เลือกผู้ใช้</Label>
                <Select onValueChange={(value) => {
                  const profile = profiles.find(p => p.user_id === value);
                  setSelectedProfile(profile || null);
                  setPointsToRedeem('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ใช้" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.student_id} - {profile.name} ({profile.points} แต้ม)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProfile && (
                <>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">ข้อมูลผู้ใช้ที่เลือก</p>
                    <p className="font-semibold">{selectedProfile.name}</p>
                    <p className="text-sm">รหัสนักศึกษา: {selectedProfile.student_id}</p>
                    <p className="text-sm text-primary font-medium">คะแนนปัจจุบัน: {selectedProfile.points} แต้ม</p>
                  </div>

                  <div>
                    <Label htmlFor="points">จำนวนคะแนนที่จะแลก</Label>
                    <Input
                      id="points"
                      type="number"
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(e.target.value)}
                      max={selectedProfile.points}
                      min={minPoints}
                      placeholder={`ขั้นต่ำ ${minPoints} แต้ม`}
                    />
                  </div>

                  {pointsToRedeem && parseInt(pointsToRedeem) >= minPoints && (
                    <div className="bg-primary/10 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">จำนวนเงินที่จะได้รับ</p>
                      <p className="text-2xl font-bold text-primary">{moneyAmount} บาท</p>
                      <p className="text-xs text-muted-foreground">อัตราแลกเปลี่ยน: {minPoints} แต้ม = {rate?.money_per_unit ?? 1} บาท</p>
                    </div>
                  )}

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full"
                        disabled={!pointsToRedeem || parseInt(pointsToRedeem) < minPoints || parseInt(pointsToRedeem) > selectedProfile.points}
                      >
                        แลกคะแนน
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>ยืนยันการแลกคะแนน</DialogTitle>
                        <DialogDescription>
                          คุณต้องการแลกคะแนน {pointsToRedeem} แต้ม เป็นเงิน {moneyAmount} บาท 
                          สำหรับ {selectedProfile.name} ({selectedProfile.student_id}) ใช่หรือไม่?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button 
                          onClick={handleRedemption} 
                          disabled={redeeming}
                          className="w-full"
                        >
                          {redeeming ? 'กำลังดำเนินการ...' : 'ยืนยันการแลกคะแนน'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
          </Card>

          {/* Redemption History */}
          <Card>
            <CardHeader>
              <CardTitle>ประวัติการแลกคะแนน</CardTitle>
              <CardDescription>รายการการแลกคะแนนล่าสุด</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">ยังไม่มีประวัติการแลกคะแนน</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.student_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">{item.money_amount} บาท</p>
                          <p className="text-sm text-muted-foreground">{item.points_redeemed} แต้ม</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(item.redeemed_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
