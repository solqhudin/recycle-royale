import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface BottleRate {
  id: string;
  bottles_per_unit: number;
  money_per_unit: number;
  is_active: boolean;
  created_at: string;
}

interface RecyclingStats {
  student_id: string;
  name: string;
  total_bottles: number;
  total_money: number;
  transaction_count: number;
  last_transaction: string | null;
}

export default function AdminDashboard() {
  const [currentRate, setCurrentRate] = useState<BottleRate | null>(null);
  const [newBottles, setNewBottles] = useState(40);
  const [newMoney, setNewMoney] = useState(5);
  const [stats, setStats] = useState<RecyclingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentRate();
    fetchRecyclingStats();
  }, []);

  const fetchCurrentRate = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('bottle_rates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching rate:', error);
        return;
      }

      if (data) {
        setCurrentRate(data);
        setNewBottles(data.bottles_per_unit);
        setNewMoney(data.money_per_unit);
      }
    } catch (error) {
      console.error('Error fetching rate:', error);
    }
  };

  const fetchRecyclingStats = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('recycling_history')
        .select(`
          user_id,
          bottles,
          money_received,
          date,
          profiles!inner(student_id, name)
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      // Group by user and calculate stats
      const userStats: { [key: string]: RecyclingStats } = {};
      
      data.forEach((record: any) => {
        const userId = record.user_id;
        const profile = record.profiles;
        
        if (!userStats[userId]) {
          userStats[userId] = {
            student_id: profile.student_id,
            name: profile.name,
            total_bottles: 0,
            total_money: 0,
            transaction_count: 0,
            last_transaction: null
          };
        }
        
        userStats[userId].total_bottles += record.bottles;
        userStats[userId].total_money += parseFloat(record.money_received);
        userStats[userId].transaction_count += 1;
        
        if (!userStats[userId].last_transaction || record.date > userStats[userId].last_transaction) {
          userStats[userId].last_transaction = record.date;
        }
      });

      setStats(Object.values(userStats));
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRate = async () => {
    try {
      setUpdating(true);

      // Deactivate current rate
      if (currentRate) {
        await (supabase as any)
          .from('bottle_rates')
          .update({ is_active: false })
          .eq('id', currentRate.id);
      }

      // Create new rate
      const { error } = await (supabase as any)
        .from('bottle_rates')
        .insert({
          bottles_per_unit: newBottles,
          money_per_unit: newMoney,
          is_active: true
        });

      if (error) {
        throw error;
      }

      toast({
        title: "อัพเดทราคาสำเร็จ",
        description: `ราคาใหม่: ${newBottles} ขวด = ${newMoney} บาท`,
      });

      await fetchCurrentRate();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Navigation />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">จัดการราคาขวดและดูสถิติการแลกเงิน</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Current Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle>ราคาปัจจุบัน</CardTitle>
              <CardDescription>อัตราแลกเปลี่ยนขวดเป็นเงินที่ใช้อยู่</CardDescription>
            </CardHeader>
            <CardContent>
              {currentRate ? (
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {currentRate.bottles_per_unit} ขวด = {currentRate.money_per_unit} บาท
                  </div>
                  <p className="text-sm text-muted-foreground">
                    อัพเดทล่าสุด: {formatDate(currentRate.created_at)}
                  </p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">ไม่พบข้อมูลราคา</p>
              )}
            </CardContent>
          </Card>

          {/* Update Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle>อัพเดทราคา</CardTitle>
              <CardDescription>เปลี่ยนอัตราแลกเปลี่ยนใหม่</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bottles">จำนวนขวด</Label>
                  <Input
                    id="bottles"
                    type="number"
                    value={newBottles}
                    onChange={(e) => setNewBottles(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="money">ราคา (บาท)</Label>
                  <Input
                    id="money"
                    type="number"
                    value={newMoney}
                    onChange={(e) => setNewMoney(parseFloat(e.target.value) || 0)}
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">อัพเดทราคา</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ยืนยันการอัพเดทราคา</DialogTitle>
                    <DialogDescription>
                      คุณต้องการเปลี่ยนราคาจาก {currentRate?.bottles_per_unit} ขวด = {currentRate?.money_per_unit} บาท 
                      เป็น {newBottles} ขวด = {newMoney} บาท ใช่หรือไม่?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      onClick={updateRate} 
                      disabled={updating}
                      className="w-full"
                    >
                      {updating ? 'กำลังอัพเดท...' : 'ยืนยัน'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Recycling Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>สถิติการแลกเงิน</CardTitle>
            <CardDescription>ข้อมูลการแลกเงินของผู้ใช้ทั้งหมด</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">กำลังโหลดข้อมูล...</p>
            ) : stats.length === 0 ? (
              <p className="text-center text-muted-foreground">ยังไม่มีข้อมูลการแลกเงิน</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">รหัสนักศึกษา</th>
                      <th className="text-left p-2">ชื่อ</th>
                      <th className="text-right p-2">ขวดรวม</th>
                      <th className="text-right p-2">เงินรวม (บาท)</th>
                      <th className="text-center p-2">จำนวนครั้ง</th>
                      <th className="text-center p-2">ครั้งล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((stat, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono">{stat.student_id}</td>
                        <td className="p-2">{stat.name}</td>
                        <td className="p-2 text-right font-semibold">{stat.total_bottles}</td>
                        <td className="p-2 text-right font-semibold">{stat.total_money.toFixed(2)}</td>
                        <td className="p-2 text-center">{stat.transaction_count}</td>
                        <td className="p-2 text-center">{formatDate(stat.last_transaction)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}