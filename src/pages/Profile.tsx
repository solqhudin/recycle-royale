import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEditClick = () => {
    if (profile) {
      setEditName(profile.name);
      setEditEmail(profile.email);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editName,
          email: editEmail
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      
      setIsEditModalOpen(false);
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
        <h1 className="text-3xl font-bold text-foreground mb-6">Profile</h1>
        
        <Navigation />

        <Card className="p-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
              <User size={48} className="text-muted-foreground" />
            </div>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleEditClick}>Edit Profile</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile} 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="w-full max-w-md space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">User</p>
                <p className="font-semibold text-lg">{profile.name}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-semibold text-lg">{profile.student_id}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="font-semibold text-lg">{profile.email}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Password</p>
                <p className="font-semibold text-lg">********</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}