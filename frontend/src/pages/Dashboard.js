import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LogOut, User, Briefcase, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import ProfileForm from '@/components/ProfileForm';
import JobsList from '@/components/JobsList';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ setIsAuthenticated }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      toast.error('Failed to fetch profile');
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  const toggleOnlineStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = !user.online_status;
      await axios.put(
        `${API}/profile/me`,
        { online_status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser({ ...user, online_status: newStatus });
      toast.success(`Status updated to ${newStatus ? 'Online' : 'Offline'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              ServisPro
            </h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Label htmlFor="online-status" className="font-heading text-xs uppercase tracking-wide">
                  {user.online_status ? 'Online' : 'Offline'}
                </Label>
                <Switch
                  id="online-status"
                  data-testid="online-status-toggle"
                  checked={user.online_status}
                  onCheckedChange={toggleOnlineStatus}
                />
              </div>
              <Button
                variant="ghost"
                data-testid="logout-button"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Profile Header */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={user.profile_picture ? `${BACKEND_URL}${user.profile_picture}` : undefined} 
                alt={`${user.first_name} ${user.last_name}`}
              />
              <AvatarFallback className="text-2xl font-heading bg-primary text-primary-foreground">
                {user.first_name[0]}{user.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-3xl font-heading font-bold text-foreground mb-1">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-lg text-muted-foreground mb-2">{user.profession}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium border" 
                   data-testid="status-badge"
                   className={user.online_status 
                     ? 'bg-green-100 text-green-700 border-green-200' 
                     : 'bg-slate-100 text-slate-600 border-slate-200'
                   }>
                <div className={`h-2 w-2 rounded-full ${user.online_status ? 'bg-green-500' : 'bg-slate-400'}`} />
                {user.online_status ? 'Available' : 'Unavailable'}
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'outline'}
            data-testid="profile-tab-button"
            onClick={() => setActiveTab('profile')}
            className="gap-2 font-heading"
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant={activeTab === 'jobs' ? 'default' : 'outline'}
            data-testid="jobs-tab-button"
            onClick={() => setActiveTab('jobs')}
            className="gap-2 font-heading"
          >
            <Briefcase className="h-4 w-4" />
            Job Offers
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <ProfileForm user={user} setUser={setUser} onUpdate={fetchProfile} />
        )}
        {activeTab === 'jobs' && <JobsList />}
      </div>
    </div>
  );
};

export default Dashboard;