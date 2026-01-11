import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  LogOut, User, Briefcase, ShieldCheck, Home, MessageCircle, 
  Bell, Clock, CheckCircle, XCircle, MapPin, Calendar, CheckCheck,
  TrendingUp, AlertCircle, Star, Truck, Car, Tractor
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import ProfileForm from '@/components/ProfileForm';
import RentalListingForm from '@/components/RentalListingForm';
import MyRentals from '@/components/MyRentals';
import RentalConversations from '@/components/RentalConversations';
import VehicleListingForm from '@/components/VehicleListingForm';
import MyVehicles from '@/components/MyVehicles';

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
    'Camionneur': 'Camionneur (Location)',
    'Tracteur': 'Tracteur (Location)',
    'Voiture': 'Voiture (Location)',
    'Autres': 'Autres Métiers',
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Logistics': 'Logistique',
    'Other': 'Autres'
  };
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

// Check if user is a Vehicle Provider (Camionneur, Tracteur, Voiture)
const isVehicleProvider = (profession) => {
  return ['Camionneur', 'Tracteur', 'Voiture'].includes(profession);
};

// Get vehicle type icon
const getVehicleIcon = (profession) => {
  const icons = {
    'Camionneur': Truck,
    'Tracteur': Tractor,
    'Voiture': Car
  };
  return icons[profession] || Truck;
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
      toast.error(error.response?.data?.detail || 'Échec de l\'opération');
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
  const activeJobs = jobs.filter(j => j.status === 'Accepted' || j.status === 'ProviderCompleted');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
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
                  Espace Agent Immobilier
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
                <Button variant="ghost" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {/* Profile Summary */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarImage src={user.profile_picture ? `${BACKEND_URL}${user.profile_picture}` : undefined} />
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
              <Home className="h-4 w-4" /> Mes Locations
            </Button>
            <Button variant={activeTab === 'create-rental' ? 'default' : 'outline'} onClick={() => setActiveTab('create-rental')} className="gap-2">
              <Home className="h-4 w-4" /> + Ajouter Location
            </Button>
            <Button variant={activeTab === 'messages' ? 'default' : 'outline'} onClick={() => setActiveTab('messages')} className="gap-2">
              <MessageCircle className="h-4 w-4" /> Messages
            </Button>
          </div>

          {activeTab === 'profile' && <ProfileForm user={user} setUser={setUser} onUpdate={fetchProfile} />}
          {activeTab === 'rentals' && <MyRentals />}
          {activeTab === 'create-rental' && <RentalListingForm onSuccess={() => setActiveTab('rentals')} />}
          {activeTab === 'messages' && <RentalConversations />}
        </div>
      </div>
    );
  }

  // Regular Service Provider Dashboard
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
                Tableau de Bord Prestataire
              </h1>
            </div>
            <div className="flex items-center gap-6">
              {/* Notification Badge for Pending Jobs */}
              {stats.pending > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full animate-pulse">
                  <Bell className="h-4 w-4" />
                  <span className="font-bold">{stats.pending} nouvelle{stats.pending > 1 ? 's' : ''} demande{stats.pending > 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Label htmlFor="online-status" className={`font-heading text-xs uppercase tracking-wide ${user.online_status ? 'text-green-600' : 'text-slate-500'}`}>
                  {user.online_status ? '🟢 En ligne' : '⚫ Hors ligne'}
                </Label>
                <Switch
                  id="online-status"
                  data-testid="online-status-toggle"
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
        {/* Welcome Banner with Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1 p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20 mb-4">
                <AvatarImage src={user.profile_picture ? `${BACKEND_URL}${user.profile_picture}` : undefined} />
                <AvatarFallback className="text-3xl font-heading bg-primary text-primary-foreground">
                  {user.first_name[0]}{user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-heading font-bold text-foreground">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">{translateProfession(user.profession)}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  user.online_status ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  <div className={`h-2 w-2 rounded-full ${user.online_status ? 'bg-green-500' : 'bg-slate-400'}`} />
                  {user.online_status ? 'Disponible' : 'Indisponible'}
                </span>
                {user.id_verification_picture && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    <ShieldCheck className="h-3 w-3" /> Vérifié
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">En Attente</p>
                <p className="text-4xl font-bold text-orange-700">{stats.pending}</p>
                <p className="text-xs text-orange-600">Nouvelles demandes</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-orange-200 flex items-center justify-center">
                <Clock className="h-7 w-7 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">En Cours</p>
                <p className="text-4xl font-bold text-blue-700">{stats.accepted}</p>
                <p className="text-xs text-blue-600">Travaux acceptés</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-blue-200 flex items-center justify-center">
                <Briefcase className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Terminés</p>
                <p className="text-4xl font-bold text-green-700">{stats.completed}</p>
                <p className="text-xs text-green-600">Travaux complétés</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-green-200 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Alert for Offline Status */}
        {!user.online_status && (
          <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Vous êtes actuellement hors ligne</p>
                <p className="text-sm text-amber-600">Les clients ne peuvent pas vous envoyer de demandes. Activez votre statut pour recevoir des travaux.</p>
              </div>
              <Button size="sm" onClick={toggleOnlineStatus} className="ml-auto bg-amber-600 hover:bg-amber-700">
                Passer en ligne
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Navigation Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className="gap-2 font-heading"
          >
            <TrendingUp className="h-4 w-4" />
            Vue d'ensemble
            {stats.pending > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">{stats.pending}</span>
            )}
          </Button>
          <Button
            variant={activeTab === 'jobs' ? 'default' : 'outline'}
            onClick={() => setActiveTab('jobs')}
            className="gap-2 font-heading"
          >
            <Briefcase className="h-4 w-4" />
            Tous les Travaux ({jobs.length})
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'outline'}
            onClick={() => setActiveTab('profile')}
            className="gap-2 font-heading"
          >
            <User className="h-4 w-4" />
            Mon Profil
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Pending Jobs Section - Highlighted */}
            {pendingJobs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-5 w-5 text-orange-600" />
                  <h3 className="text-xl font-heading font-bold text-foreground">
                    Nouvelles Demandes ({pendingJobs.length})
                  </h3>
                  <span className="text-sm text-orange-600 animate-pulse">• Action requise</span>
                </div>
                <div className="grid gap-4">
                  {pendingJobs.map((job) => (
                    <Card key={job.id} className="p-6 border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-heading font-bold text-foreground">
                              {job.service_type}
                            </h4>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(job.status)}`}>
                              <Clock className="h-3 w-3" />
                              {translateStatus(job.status)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">Client:</span> {job.client_name}
                          </p>
                          <p className="text-foreground mb-3">{job.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            onClick={() => handleJobAction(job.id, 'Accepted')}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Accepter
                          </Button>
                          <Button
                            onClick={() => handleJobAction(job.id, 'Rejected')}
                            variant="outline"
                            className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Active Jobs Section */}
            {activeJobs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-heading font-bold text-foreground">
                    Travaux en Cours ({activeJobs.length})
                  </h3>
                </div>
                <div className="grid gap-4">
                  {activeJobs.map((job) => (
                    <Card key={job.id} className="p-6 border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-heading font-bold text-foreground">
                              {job.service_type}
                            </h4>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(job.status)}`}>
                              {translateStatus(job.status)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">Client: {job.client_name}</p>
                          <p className="text-foreground mb-3">{job.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {job.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                            )}
                          </div>
                        </div>
                        {job.status === 'Accepted' && (
                          <Button
                            onClick={() => handleMarkComplete(job.id)}
                            className="gap-2 bg-green-600 hover:bg-green-700 ml-4"
                          >
                            <CheckCheck className="h-4 w-4" />
                            Marquer Terminé
                          </Button>
                        )}
                        {job.status === 'ProviderCompleted' && (
                          <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 ml-4">
                            <p className="text-purple-700 text-sm flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Attente confirmation client
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {pendingJobs.length === 0 && activeJobs.length === 0 && (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
                    Aucune demande en cours
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {user.online_status 
                      ? "Vous recevrez des notifications dès qu'un client vous enverra une demande de travail."
                      : "Activez votre statut en ligne pour commencer à recevoir des demandes de travail."}
                  </p>
                  {!user.online_status && (
                    <Button onClick={toggleOnlineStatus} className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Passer en ligne
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-4">
              Historique des Travaux ({jobs.length})
            </h3>
            {jobs.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun travail dans l'historique</p>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-heading font-bold text-foreground">
                          {job.service_type}
                        </h4>
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium border ${getStatusBadge(job.status)}`}>
                          {translateStatus(job.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Client: {job.client_name}</p>
                    </div>
                  </div>
                  <p className="text-foreground mb-4">{job.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
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
