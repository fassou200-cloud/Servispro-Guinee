import { useState, useEffect } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  LogOut, User, Briefcase, ShieldCheck, Home, MessageCircle, 
  Bell, Clock, CheckCircle, XCircle, MapPin, Calendar, CheckCheck,
  TrendingUp, AlertCircle, Star, Truck, Car, Tractor, Building, DollarSign, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import ProfileForm from '@/components/ProfileForm';
import RentalListingForm from '@/components/RentalListingForm';
import MyRentals from '@/components/MyRentals';
import RentalConversations from '@/components/RentalConversations';
import VehicleListingForm from '@/components/VehicleListingForm';
import MyVehicles from '@/components/MyVehicles';
import VehicleSaleForm from '@/components/VehicleSaleForm';
import MyVehicleSales from '@/components/MyVehicleSales';
import PropertySaleForm from '@/components/PropertySaleForm';
import MyPropertySales from '@/components/MyPropertySales';
import NotificationBell from '@/components/NotificationBell';
import ProviderFeesCard from '@/components/ProviderFeesCard';
import VisitRequestsList from '@/components/VisitRequestsList';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Traduction des professions en français
const translateProfession = (profession, customProfession = null) => {
  const translations = {
    'Electromecanicien': 'Électromécanicien',
    'Mecanicien': 'Mécanicien',
    'Plombier': 'Plombier',
    'Macon': 'Maçon',
    'Menuisier': 'Menuisier',
    'AgentImmobilier': 'Propriétaire immobilier',
    'Soudeur': 'Soudeur',
    'Autres': 'Autres Métiers',
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Other': 'Autres'
  };
  
  // If profession is "Autres" and customProfession is provided, use custom profession
  if (profession === 'Autres' && customProfession) {
    return customProfession;
  }
  
  return translations[profession] || profession;
};

// Traduction des statuts
const translateStatus = (status) => {
  const translations = {
    'Pending': 'En attente',
    'Accepted': 'Accepté',
    'Rejected': 'Refusé',
    'ProviderCompleted': 'En attente confirmation',
    'Completed': 'Terminé'
  };
  return translations[status] || status;
};

// Check if user is an Agent Immobilier
const isAgentImmobilier = (profession) => {
  return profession === 'AgentImmobilier';
};

// Check if user is a Vehicle Provider (deprecated - categories removed)
const isVehicleProvider = (profession) => {
  return false;
};

// Get vehicle type icon (deprecated - categories removed)
const getVehicleIcon = (profession) => {
  return Truck;
};

const Dashboard = ({ setIsAuthenticated }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ pending: 0, accepted: 0, completed: 0, total: 0 });

  useEffect(() => {
    fetchProfile();
    fetchJobs();
    // Poll for new jobs every 10 seconds
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
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

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/jobs/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const jobsData = response.data;
      setJobs(jobsData);
      
      // Calculate stats
      setStats({
        pending: jobsData.filter(j => j.status === 'Pending').length,
        accepted: jobsData.filter(j => j.status === 'Accepted').length,
        completed: jobsData.filter(j => j.status === 'Completed').length,
        total: jobsData.length
      });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
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

  const handleJobAction = async (jobId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/jobs/${jobId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Travail ${status === 'Accepted' ? 'accepté' : 'refusé'} avec succès`);
      fetchJobs();
    } catch (error) {
      toast.error(`Échec de l'opération`);
    }
  };

  const handleMarkComplete = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/jobs/${jobId}/provider-complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Travail marqué comme terminé !');
      fetchJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de l\'opération'));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-orange-100 text-orange-700 border-orange-200',
      Accepted: 'bg-blue-100 text-blue-700 border-blue-200',
      Rejected: 'bg-slate-100 text-slate-600 border-slate-200',
      ProviderCompleted: 'bg-purple-100 text-purple-700 border-purple-200',
      Completed: 'bg-green-100 text-green-700 border-green-200'
    };
    return styles[status] || styles.Pending;
  };

  const pendingJobs = jobs.filter(j => j.status === 'Pending');
  const activeJobs = jobs.filter(j => j.status === 'Accepted');
  const awaitingConfirmationJobs = jobs.filter(j => j.status === 'ProviderCompleted');
  const completedJobs = jobs.filter(j => j.status === 'Completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    );
  }

  // Agent Immobilier has different dashboard
  if (isAgentImmobilier(user.profession)) {
    return (
      <div className="min-h-screen bg-muted">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => window.location.href = '/'} className="gap-2">
                  <Home className="h-4 w-4" />
                  Accueil
                </Button>
                <h1 className="text-2xl font-heading font-bold text-foreground">
                  Espace Propriétaire immobilier
                </h1>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Label htmlFor="online-status" className="font-heading text-xs uppercase tracking-wide">
                    {user.online_status ? 'En ligne' : 'Hors ligne'}
                  </Label>
                  <Switch
                    id="online-status"
                    checked={user.online_status}
                    onCheckedChange={toggleOnlineStatus}
                  />
                </div>
                <NotificationBell userType="provider" />
                <Button variant="ghost" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {/* Service Fees Info */}
          <div className="mb-6">
            <ProviderFeesCard profession={user.profession} />
          </div>

          {/* Profile Summary */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarImage src={getImageUrl(user.profile_picture)} />
                <AvatarFallback className="text-2xl font-heading bg-primary text-primary-foreground">
                  {user.first_name[0]}{user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-muted-foreground">{translateProfession(user.profession)}</p>
              </div>
            </div>
          </Card>

          {/* Tabs for Agent Immobilier */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button variant={activeTab === 'profile' ? 'default' : 'outline'} onClick={() => setActiveTab('profile')} className="gap-2">
              <User className="h-4 w-4" /> Profil
            </Button>
            <Button variant={activeTab === 'rentals' ? 'default' : 'outline'} onClick={() => setActiveTab('rentals')} className="gap-2">
              <Home className="h-4 w-4" /> Locations
            </Button>
            <Button variant={activeTab === 'create-rental' ? 'default' : 'outline'} onClick={() => setActiveTab('create-rental')} className="gap-2">
              <Home className="h-4 w-4" /> + Location
            </Button>
            <Button variant={activeTab === 'visit-requests' ? 'default' : 'outline'} onClick={() => setActiveTab('visit-requests')} className="gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100">
              <Eye className="h-4 w-4 text-blue-600" /> Visites
            </Button>
            <Button variant={activeTab === 'sales' ? 'default' : 'outline'} onClick={() => setActiveTab('sales')} className="gap-2 bg-emerald-50 border-emerald-200 hover:bg-emerald-100">
              <DollarSign className="h-4 w-4 text-emerald-600" /> Ventes
            </Button>
            <Button variant={activeTab === 'create-sale' ? 'default' : 'outline'} onClick={() => setActiveTab('create-sale')} className="gap-2 bg-emerald-50 border-emerald-200 hover:bg-emerald-100">
              <Building className="h-4 w-4 text-emerald-600" /> + Vendre
            </Button>
            <Button variant={activeTab === 'messages' ? 'default' : 'outline'} onClick={() => setActiveTab('messages')} className="gap-2">
              <MessageCircle className="h-4 w-4" /> Messages
            </Button>
          </div>

          {activeTab === 'profile' && <ProfileForm user={user} setUser={setUser} onUpdate={fetchProfile} />}
          {activeTab === 'rentals' && <MyRentals />}
          {activeTab === 'create-rental' && <RentalListingForm onSuccess={() => setActiveTab('rentals')} />}
          {activeTab === 'visit-requests' && <VisitRequestsList userType="provider" />}
          {activeTab === 'sales' && <MyPropertySales />}
          {activeTab === 'create-sale' && <PropertySaleForm onSuccess={() => setActiveTab('sales')} />}
          {activeTab === 'messages' && <RentalConversations />}
        </div>
      </div>
    );
  }

  // Vehicle Provider Dashboard (Camionneur, Tracteur, Voiture)
  if (isVehicleProvider(user.profession)) {
    const VehicleIcon = getVehicleIcon(user.profession);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => window.location.href = '/'} className="gap-2">
                  <Home className="h-4 w-4" />
                  Accueil
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <VehicleIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-heading font-bold text-slate-900">
                      Espace {translateProfession(user.profession)}
                    </h1>
                    <p className="text-xs text-slate-500">Location de véhicules</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${user.online_status ? 'text-green-600' : 'text-slate-500'}`}>
                    {user.online_status ? '🟢 Disponible' : '⚫ Indisponible'}
                  </span>
                  <Switch
                    checked={user.online_status}
                    onCheckedChange={toggleOnlineStatus}
                  />
                </div>
                <Button variant="ghost" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          {/* Service Fees Info */}
          <div className="mb-6">
            <ProviderFeesCard profession={user.profession} />
          </div>

          {/* Profile Banner */}
          <Card className="p-6 mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-white/30">
                <AvatarImage src={getImageUrl(user.profile_picture)} />
                <AvatarFallback className="text-2xl font-bold bg-white/20">
                  {user.first_name[0]}{user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-heading font-bold">{user.first_name} {user.last_name}</h2>
                <p className="text-indigo-200 flex items-center gap-2">
                  <VehicleIcon className="h-4 w-4" />
                  {translateProfession(user.profession)}
                </p>
                {user.location && (
                  <p className="text-indigo-200 flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4" />
                    {user.location}
                  </p>
                )}
              </div>
              {user.id_verification_picture && (
                <div className="ml-auto">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    Vérifié
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              variant={activeTab === 'vehicles' ? 'default' : 'outline'}
              onClick={() => setActiveTab('vehicles')}
              className={`gap-2 ${activeTab === 'vehicles' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
            >
              <VehicleIcon className="h-4 w-4" />
              Mes Véhicules
            </Button>
            <Button
              variant={activeTab === 'create-vehicle' ? 'default' : 'outline'}
              onClick={() => setActiveTab('create-vehicle')}
              className={`gap-2 ${activeTab === 'create-vehicle' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
            >
              <TrendingUp className="h-4 w-4" />
              + Ajouter Véhicule
            </Button>
            {/* Vehicle Sales Tabs */}
            <Button
              variant={activeTab === 'sales' ? 'default' : 'outline'}
              onClick={() => setActiveTab('sales')}
              className={`gap-2 ${activeTab === 'sales' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
            >
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Mes Ventes
            </Button>
            <Button
              variant={activeTab === 'create-sale' ? 'default' : 'outline'}
              onClick={() => setActiveTab('create-sale')}
              className={`gap-2 ${activeTab === 'create-sale' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
            >
              <DollarSign className="h-4 w-4 text-emerald-600" />
              + Vendre
            </Button>
            <Button
              variant={activeTab === 'profile' ? 'default' : 'outline'}
              onClick={() => setActiveTab('profile')}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              Mon Profil
            </Button>
          </div>

          {/* Content */}
          {activeTab === 'vehicles' && <MyVehicles />}
          {activeTab === 'create-vehicle' && (
            <VehicleListingForm 
              onSuccess={() => setActiveTab('vehicles')} 
              userProfession={user.profession}
            />
          )}
          {activeTab === 'sales' && <MyVehicleSales />}
          {activeTab === 'create-sale' && (
            <VehicleSaleForm 
              onSuccess={() => setActiveTab('sales')} 
              userProfession={user.profession}
            />
          )}
          {activeTab === 'profile' && <ProfileForm user={user} setUser={setUser} onUpdate={fetchProfile} />}
        </div>
      </div>
    );
  }

  // Regular Service Provider Dashboard - WHITE THEME
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header - White Theme */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/'} 
                className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Accueil</span>
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-xl font-heading font-bold text-gray-900">
                Espace Prestataire
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Notification Badge */}
              {stats.pending > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-600 rounded-full border border-orange-200">
                  <Bell className="h-4 w-4" />
                  <span className="font-medium text-sm">{stats.pending} nouvelle{stats.pending > 1 ? 's' : ''}</span>
                </div>
              )}
              <NotificationBell userType="provider" />
              
              {/* Online Status Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                <div className={`h-2 w-2 rounded-full ${user.online_status ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={`text-sm font-medium ${user.online_status ? 'text-green-600' : 'text-gray-500'}`}>
                  {user.online_status ? 'En ligne' : 'Hors ligne'}
                </span>
                <Switch
                  id="online-status"
                  data-testid="online-status-toggle"
                  checked={user.online_status}
                  onCheckedChange={toggleOnlineStatus}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                className="gap-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section with Profile - White Theme */}
        <div className="relative mb-8">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="relative h-28 w-28 ring-4 ring-green-100 shadow-lg">
                  <AvatarImage src={getImageUrl(user.profile_picture)} />
                  <AvatarFallback className="text-3xl font-heading bg-gradient-to-br from-green-500 to-green-600 text-white">
                    {user.first_name[0]}{user.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                {user.online_status && (
                  <div className="absolute bottom-1 right-1 h-5 w-5 bg-green-500 rounded-full ring-4 ring-white" />
                )}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl font-heading font-bold text-gray-900 mb-2">
                  {user.first_name} {user.last_name}
                </h2>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full text-gray-700 text-sm">
                    <Briefcase className="h-4 w-4 text-green-600" />
                    {translateProfession(user.profession, user.custom_profession)}
                  </span>
                  {user.id_verification_picture && (
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-full text-blue-600 text-sm border border-blue-200">
                      <ShieldCheck className="h-4 w-4" />
                      Vérifié
                    </span>
                  )}
                </div>
                
                {/* Price Info */}
                {user.price && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl text-green-700 border border-green-200">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-lg font-bold">{new Intl.NumberFormat('fr-GN').format(user.price)} GNF</span>
                    <span className="text-sm text-green-600">/ service</span>
                  </div>
                )}
              </div>

              {/* Quick Stats - Desktop */}
              <div className="hidden lg:grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <div className="text-3xl font-bold text-orange-600 mb-1">{stats.pending}</div>
                  <div className="text-xs text-orange-500 uppercase tracking-wide">En attente</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{stats.accepted}</div>
                  <div className="text-xs text-blue-500 uppercase tracking-wide">En cours</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-100">
                  <div className="text-3xl font-bold text-green-600 mb-1">{stats.completed}</div>
                  <div className="text-xs text-green-500 uppercase tracking-wide">Terminés</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6 lg:hidden">
          <div className="bg-white rounded-2xl p-4 border border-orange-200 shadow-sm">
            <Clock className="h-6 w-6 text-orange-500 mb-2" />
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-xs text-orange-500">En attente</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm">
            <Briefcase className="h-6 w-6 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-blue-600">{stats.accepted}</div>
            <div className="text-xs text-blue-500">En cours</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-green-200 shadow-sm">
            <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-green-500">Terminés</div>
          </div>
        </div>

        {/* Offline Alert */}
        {!user.online_status && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-800">Mode hors ligne activé</p>
              <p className="text-sm text-amber-600">Les clients ne peuvent pas vous contacter. Passez en ligne pour recevoir des demandes.</p>
            </div>
            <Button 
              onClick={toggleOnlineStatus} 
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium"
            >
              Passer en ligne
            </Button>
          </div>
        )}

        {/* Navigation Tabs - White Theme */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className={`gap-2 rounded-xl whitespace-nowrap ${
              activeTab === 'overview' 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-200'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Vue d&apos;ensemble
            {stats.pending > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">{stats.pending}</span>
            )}
          </Button>
          <Button
            variant={activeTab === 'jobs' ? 'default' : 'outline'}
            onClick={() => setActiveTab('jobs')}
            className={`gap-2 rounded-xl whitespace-nowrap ${
              activeTab === 'jobs' 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-200'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Tous les Travaux ({jobs.length})
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'outline'}
            onClick={() => setActiveTab('profile')}
            className={`gap-2 rounded-xl whitespace-nowrap ${
              activeTab === 'profile' 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-200'
            }`}
          >
            <User className="h-4 w-4" />
            Mon Profil
          </Button>
        </div>

        {/* Tab Content - White Theme */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Pending Jobs Section */}
            {pendingJobs.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-bold text-gray-900">
                      Nouvelles Demandes
                    </h3>
                    <p className="text-sm text-orange-600">{pendingJobs.length} en attente de réponse</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  {pendingJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className="group relative bg-white rounded-2xl border-2 border-orange-200 p-6 hover:border-orange-300 transition-all hover:shadow-lg"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-amber-500 rounded-l-2xl" />
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-xl font-heading font-bold text-gray-900">
                              {job.service_type}
                            </h4>
                            <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium border border-orange-200">
                              Nouvelle
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{job.client_name}</span>
                          </div>
                          <p className="text-gray-600 mb-4 line-clamp-2">{job.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {job.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                            )}
                            {job.scheduled_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(job.scheduled_date).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => handleJobAction(job.id, 'Accepted')}
                            className="gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Accepter
                          </Button>
                          <Button
                            onClick={() => handleJobAction(job.id, 'Rejected')}
                            variant="outline"
                            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                          >
                            <XCircle className="h-4 w-4" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Jobs Section */}
            {activeJobs.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-bold text-gray-900">
                      Travaux en Cours
                    </h3>
                    <p className="text-sm text-blue-600">{activeJobs.length} travaux actifs</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  {activeJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className="group relative bg-white rounded-2xl border-2 border-blue-200 p-6 hover:border-blue-300 transition-all"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-500 rounded-l-2xl" />
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-xl font-heading font-bold text-gray-900">
                              {job.service_type}
                            </h4>
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium border border-blue-200">
                              En cours
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{job.client_name}</span>
                          </div>
                          <p className="text-gray-600 mb-4">{job.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {job.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleMarkComplete(job.id)}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                        >
                          <CheckCheck className="h-4 w-4" />
                          Terminer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Client Confirmation Section */}
            {awaitingConfirmationJobs.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-bold text-gray-900">
                      En Attente de Confirmation Client
                    </h3>
                    <p className="text-sm text-purple-600">{awaitingConfirmationJobs.length} travaux terminés</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  {awaitingConfirmationJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className="group relative bg-white rounded-2xl border-2 border-purple-200 p-6 hover:border-purple-300 transition-all"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500 rounded-l-2xl" />
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-xl font-heading font-bold text-gray-900">
                              {job.service_type}
                            </h4>
                            <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium border border-purple-200">
                              En attente de confirmation
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{job.client_name}</span>
                          </div>
                          <p className="text-gray-600 mb-4">{job.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {job.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200">
                            <Clock className="h-4 w-4 text-purple-500" />
                            <span className="text-purple-700 font-medium text-sm">
                              Le client doit confirmer
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {pendingJobs.length === 0 && activeJobs.length === 0 && awaitingConfirmationJobs.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
                  Aucune demande en cours
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {user.online_status 
                    ? "Vous n'avez pas de nouvelles demandes pour le moment. Restez en ligne pour recevoir des demandes de clients."
                    : "Passez en ligne pour commencer à recevoir des demandes de clients."
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h3 className="text-2xl font-heading font-bold text-gray-900 mb-4">
              Historique des Travaux ({jobs.length})
            </h3>
            {jobs.length === 0 ? (
              <Card className="p-8 text-center bg-white border-gray-200">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun travail dans l&apos;historique</p>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id} className="p-6 bg-white border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-heading font-bold text-gray-900">
                          {job.service_type}
                        </h4>
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium border ${getStatusBadge(job.status)}`}>
                          {translateStatus(job.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Client: {job.client_name}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">{job.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    {job.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                    )}
                    {job.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(job.scheduled_date).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                  {job.status === 'Pending' && (
                    <div className="flex gap-3">
                      <Button onClick={() => handleJobAction(job.id, 'Accepted')} className="gap-2 bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4" /> Accepter
                      </Button>
                      <Button onClick={() => handleJobAction(job.id, 'Rejected')} variant="outline" className="gap-2">
                        <XCircle className="h-4 w-4" /> Refuser
                      </Button>
                    </div>
                  )}
                  {job.status === 'Accepted' && (
                    <Button onClick={() => handleMarkComplete(job.id)} className="gap-2 bg-green-600 hover:bg-green-700">
                      <CheckCheck className="h-4 w-4" /> Marquer comme Terminé
                    </Button>
                  )}
                  {job.status === 'Completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-700 text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> Service complété et confirmé
                      </p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <ProfileForm user={user} setUser={setUser} onUpdate={fetchProfile} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
