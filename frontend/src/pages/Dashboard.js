import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LogOut, User, Briefcase, ShieldCheck, Home } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import ProfileForm from '@/components/ProfileForm';
import JobsList from '@/components/JobsList';
import RentalListingForm from '@/components/RentalListingForm';
import MyRentals from '@/components/MyRentals';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Traduction des professions en français
const translateProfession = (profession) => {
  const translations = {
    'Logisticien': 'Logisticien',
    'Electromecanicien': 'Électromécanicien',
    'Mecanicien': 'Mécanicien',
    'Plombier': 'Plombier',
    'Macon': 'Maçon',
    'Menuisier': 'Menuisier',
    'AgentImmobilier': 'Agent Immobilier',
    'Soudeur': 'Soudeur',
    'Autres': 'Autres Métiers',
    // Legacy values
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Logistics': 'Logistique',
    'Other': 'Autres'
  };
  return translations[profession] || profession;
};

// Check if user is an Agent Immobilier
const isAgentImmobilier = (profession) => {
  return profession === 'AgentImmobilier';
};

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
      toast.error('Échec du chargement du profil');
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
      toast.success(`Statut mis à jour: ${newStatus ? 'En ligne' : 'Hors ligne'}`);
    } catch (error) {
      toast.error('Échec de la mise à jour du statut');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                data-testid="home-button"
                onClick={() => window.location.href = '/'}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Accueil
              </Button>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                ServisPro Guinée
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Label htmlFor="online-status" className="font-heading text-xs uppercase tracking-wide">
                  {user.online_status ? 'En ligne' : 'Hors ligne'}
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
                Déconnexion
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
            <Avatar className="h-[250px] w-[250px] ring-4 ring-primary/20">
              <AvatarImage 
                src={user.profile_picture ? `${BACKEND_URL}${user.profile_picture}` : undefined} 
                alt={`${user.first_name} ${user.last_name}`}
              />
              <AvatarFallback className="text-6xl font-heading bg-primary text-primary-foreground">
                {user.first_name[0]}{user.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-3xl font-heading font-bold text-foreground mb-1">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-lg text-muted-foreground mb-2">{translateProfession(user.profession)}</p>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium border" 
                     data-testid="status-badge"
                     className={user.online_status 
                       ? 'bg-green-100 text-green-700 border-green-200' 
                       : 'bg-slate-100 text-slate-600 border-slate-200'
                     }>
                  <div className={`h-2 w-2 rounded-full ${user.online_status ? 'bg-green-500' : 'bg-slate-400'}`} />
                  {user.online_status ? 'Disponible' : 'Indisponible'}
                </div>
                {user.id_verification_picture && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium border bg-blue-100 text-blue-700 border-blue-200"
                       data-testid="verified-badge">
                    <ShieldCheck className="h-4 w-4" />
                    ID Vérifié
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'outline'}
            data-testid="profile-tab-button"
            onClick={() => setActiveTab('profile')}
            className="gap-2 font-heading"
          >
            <User className="h-4 w-4" />
            Profil
          </Button>
          <Button
            variant={activeTab === 'jobs' ? 'default' : 'outline'}
            data-testid="jobs-tab-button"
            onClick={() => setActiveTab('jobs')}
            className="gap-2 font-heading"
          >
            <Briefcase className="h-4 w-4" />
            Demandes de Travail
          </Button>
          {isAgentImmobilier(user.profession) && (
            <>
              <Button
                variant={activeTab === 'rentals' ? 'default' : 'outline'}
                data-testid="rentals-tab-button"
                onClick={() => setActiveTab('rentals')}
                className="gap-2 font-heading"
              >
                <Home className="h-4 w-4" />
                Mes Locations
              </Button>
              <Button
                variant={activeTab === 'create-rental' ? 'default' : 'outline'}
                data-testid="create-rental-tab-button"
                onClick={() => setActiveTab('create-rental')}
                className="gap-2 font-heading"
              >
                <Home className="h-4 w-4" />
                + Ajouter Location
              </Button>
            </>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <ProfileForm user={user} setUser={setUser} onUpdate={fetchProfile} />
        )}
        {activeTab === 'jobs' && <JobsList />}
        {activeTab === 'rentals' && isAgentImmobilier(user.profession) && <MyRentals />}
        {activeTab === 'create-rental' && isAgentImmobilier(user.profession) && (
          <RentalListingForm onSuccess={() => {
            setActiveTab('rentals');
            toast.success('Annonce de location créée avec succès!');
          }} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;