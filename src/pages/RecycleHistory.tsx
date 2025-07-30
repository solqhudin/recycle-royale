import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface RecyclingEntry {
  id: string;
  date: string;
  bottles: number;
  money_received: number;
}

export default function RecycleHistory() {
  const { profile } = useAuth();
  const [searchDate, setSearchDate] = useState('');
  const [entries, setEntries] = useState<RecyclingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchRecyclingHistory();
    }
  }, [profile]);

  const fetchRecyclingHistory = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('recycling_history')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('date', { ascending: false });

      if (error) throw error;
      
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching recycling history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => 
    searchDate === '' || entry.date.includes(searchDate)
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, ' / ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Recycle History</h1>
        
        <Navigation />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="กรอกข้อมูลตามวันที่"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No recycling history found.</p>
            </Card>
          ) : (
            filteredEntries.map((entry) => (
              <Card key={entry.id} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">วันที่</p>
                    <p className="font-semibold">{formatDate(entry.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">จำนวนขวด</p>
                    <p className="font-semibold">{entry.bottles}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">เงินที่จะได้รับ</p>
                    <p className="font-semibold">{entry.money_received}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}