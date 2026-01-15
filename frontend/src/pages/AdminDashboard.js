import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Shield, LogOut, Users, Briefcase, CheckCircle, XCircle, 
  Clock, Eye, Home, Building, UserCheck, UserX, AlertCircle, Trash2, UserCircle,
  MapPin, Calendar, Moon, DollarSign, Star, MessageCircle, FileText, ExternalLink,
  Loader2, RefreshCw, Settings, Percent, TrendingUp, Save
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Traduction des professions
const translateProfession = (profession) => {
  const translations = {
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Logistics': 'Logistique',
    'AgentImmobilier': 'Agent Immobilier',
    'Logisticien': 'Logisticien',
    'Electromecanicien': 'Électromécanicien',
    'Mecanicien': 'Mécanicien',
    'Macon': 'Maçon',
    'Menuisier': 'Menuisier',
    'Soudeur': 'Soudeur',
    'Autres': 'Autres',
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
    'ProviderCompleted': 'Terminé (en attente client)',
    'Completed': 'Terminé',
    'pending': 'En attente',
    'approved': 'Approuvé',
    'rejected': 'Rejeté'
  };
  return translations[status] || status;
};

const AdminDashboard = ({ setIsAdminAuthenticated }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('providers');
  const [providers, setProviders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [agentsImmobilier, setAgentsImmobilier] = useState([]);
  const [propertySales, setPropertySales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [rentalFilter, setRentalFilter] = useState('all'); // all, long_term, short_term
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null, name: '' });
  
  // Track which tabs have been loaded (for lazy loading)
  const [loadedTabs, setLoadedTabs] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  
  // Settings state - Commissions par domaine en pourcentage
  const [settings, setSettings] = useState({
    commission_prestation: 10,        // Prestation de services (%)
    commission_location_courte: 10,   // Location courte durée (%)
    commission_location_longue: 5,    // Location longue durée (%)
    commission_vente: 3,              // Vente immobilière (%)
    commission_location_vehicule: 10, // Location véhicule (%)
    devise: 'GNF'
  });
  const [commissionRevenue, setCommissionRevenue] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Currency options
  const deviseOptions = [
    { value: 'GNF', label: 'Franc Guinéen (GNF)', symbol: 'GNF' },
    { value: 'USD', label: 'Dollar US (USD)', symbol: '$' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { value: 'XOF', label: 'Franc CFA (XOF)', symbol: 'XOF' }
  ];

  // Initial load - only stats (fast)
  useEffect(() => {
    loadInitialData();
  }, []);

  // Lazy load data when tab changes
  useEffect(() => {
    if (!loadedTabs[activeTab]) {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    try {
      // Load only stats initially (very fast)
      const statsRes = await axios.get(`${API}/admin/stats`);
      setStats(statsRes.data);
      
      // Pre-load the first tab (providers) in background
      loadTabData('providers');
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    if (loadedTabs[tab]) return; // Already loaded
    
    setTabLoading(true);
    try {
      switch (tab) {
        case 'providers':
          const providersRes = await axios.get(`${API}/admin/providers`);
          setProviders(providersRes.data);
          break;
        case 'customers':
          const customersRes = await axios.get(`${API}/admin/customers`);
          setCustomers(customersRes.data);
          break;
        case 'jobs':
          const jobsRes = await axios.get(`${API}/admin/jobs`);
          setJobs(jobsRes.data);
          break;
        case 'rentals':
          const rentalsRes = await axios.get(`${API}/admin/rentals`);
          setRentals(rentalsRes.data);
          break;
        case 'agents':
          const agentsRes = await axios.get(`${API}/admin/agents-immobilier`);
          setAgentsImmobilier(agentsRes.data);
          break;
        case 'sales':
          const salesRes = await axios.get(`${API}/property-sales?available_only=false`).catch(() => ({ data: [] }));
          setPropertySales(salesRes.data);
          break;
        case 'companies':
          const companiesRes = await axios.get(`${API}/admin/companies`).catch(() => ({ data: [] }));
          setCompanies(companiesRes.data);
          break;
        case 'settings':
          const [settingsRes, revenueRes] = await Promise.all([
            axios.get(`${API}/admin/settings`),
            axios.get(`${API}/admin/commission-revenue`)
          ]);
          setSettings(settingsRes.data);
          setCommissionRevenue(revenueRes.data);
          break;
        default:
          break;
      }
      setLoadedTabs(prev => ({ ...prev, [tab]: true }));
    } catch (error) {
      console.error(`Error loading ${tab} data:`, error);
      toast.error(`Erreur lors du chargement des ${tab}`);
    } finally {
      setTabLoading(false);
    }
  };

  // Refresh specific tab data
  const refreshTabData = (tab) => {
    setLoadedTabs(prev => ({ ...prev, [tab]: false }));
    loadTabData(tab);
  };

  // Legacy fetchData for actions that need full refresh
  const fetchData = async () => {
    // Refresh current tab
    refreshTabData(activeTab);
    // Also refresh stats
    try {
      const statsRes = await axios.get(`${API}/admin/stats`);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await axios.put(`${API}/admin/settings`, {
        commission_prestation: parseFloat(settings.commission_prestation) || 10,
        commission_location_courte: parseFloat(settings.commission_location_courte) || 10,
        commission_location_longue: parseFloat(settings.commission_location_longue) || 5,
        commission_vente: parseFloat(settings.commission_vente) || 3,
        commission_location_vehicule: parseFloat(settings.commission_location_vehicule) || 10,
        devise: settings.devise || 'GNF'
      });
      toast.success('Paramètres enregistrés avec succès !');
      // Refresh commission revenue with new rates
      const revenueRes = await axios.get(`${API}/admin/commission-revenue`);
      setCommissionRevenue(revenueRes.data);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setIsAdminAuthenticated(false);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const handleApproveProvider = async (providerId) => {
    try {
      await axios.put(`${API}/admin/providers/${providerId}/approve`);
      toast.success('Prestataire approuvé !');
      refreshTabData('providers');
      setSelectedProvider(null);
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleRejectProvider = async (providerId) => {
    try {
      await axios.put(`${API}/admin/providers/${providerId}/reject`);
      toast.success('Prestataire rejeté');
      refreshTabData('providers');
      setSelectedProvider(null);
    } catch (error) {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleDeleteProvider = async (providerId) => {
    try {
      await axios.delete(`${API}/admin/providers/${providerId}`);
      toast.success('Prestataire supprimé avec succès');
      refreshTabData('providers');
      refreshTabData('agents');
      setSelectedProvider(null);
      setSelectedAgent(null);
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await axios.delete(`${API}/admin/customers/${customerId}`);
      toast.success('Client supprimé avec succès');
      refreshTabData('customers');
      setSelectedCustomer(null);
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteRental = async (rentalId) => {
    try {
      await axios.delete(`${API}/admin/rentals/${rentalId}`);
      toast.success('Location supprimée avec succès');
      refreshTabData('rentals');
      setSelectedRental(null);
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Company management functions
  const handleApproveCompany = async (companyId) => {
    try {
      await axios.put(`${API}/admin/companies/${companyId}/approve`);
      toast.success('Entreprise approuvée avec succès');
      refreshTabData('companies');
      if (selectedCompany?.id === companyId) {
        setSelectedCompany({ ...selectedCompany, verification_status: 'approved' });
      }
    } catch (error) {
      toast.error('Erreur lors de approbation');
    }
  };

  const handleRejectCompany = async (companyId) => {
    try {
      await axios.put(`${API}/admin/companies/${companyId}/reject`);
      toast.success('Entreprise rejetée');
      refreshTabData('companies');
      if (selectedCompany?.id === companyId) {
        setSelectedCompany({ ...selectedCompany, verification_status: 'rejected' });
      }
    } catch (error) {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleDeleteCompany = async (companyId) => {
    try {
      await axios.delete(`${API}/admin/companies/${companyId}`);
      toast.success('Entreprise supprimée avec succès');
      refreshTabData('companies');
      setSelectedCompany(null);
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Rental approval functions
  const handleApproveRental = async (rentalId) => {
    try {
      await axios.put(`${API}/admin/rentals/${rentalId}/approve`);
      toast.success('Annonce approuvée avec succès !');
      refreshTabData('rentals');
      if (selectedRental?.id === rentalId) {
        setSelectedRental({ ...selectedRental, approval_status: 'approved' });
      }
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleRejectRental = async (rentalId) => {
    try {
      await axios.put(`${API}/admin/rentals/${rentalId}/reject`);
      toast.success('Annonce rejetée');
      refreshTabData('rentals');
      if (selectedRental?.id === rentalId) {
        setSelectedRental({ ...selectedRental, approval_status: 'rejected' });
      }
    } catch (error) {
      toast.error('Erreur lors du rejet');
    }
  };

  const confirmDelete = (type, id, name) => {
    setDeleteConfirm({ show: true, type, id, name });
  };

  const executeDelete = () => {
    if (deleteConfirm.type === 'provider') {
      handleDeleteProvider(deleteConfirm.id);
    } else if (deleteConfirm.type === 'customer') {
      handleDeleteCustomer(deleteConfirm.id);
    } else if (deleteConfirm.type === 'rental') {
      handleDeleteRental(deleteConfirm.id);
    } else if (deleteConfirm.type === 'company') {
      handleDeleteCompany(deleteConfirm.id);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'pending': 'bg-orange-100 text-orange-700 border-orange-200',
      'approved': 'bg-green-100 text-green-700 border-green-200',
      'rejected': 'bg-red-100 text-red-700 border-red-200',
      'Pending': 'bg-orange-100 text-orange-700 border-orange-200',
      'Accepted': 'bg-blue-100 text-blue-700 border-blue-200',
      'Rejected': 'bg-slate-100 text-slate-600 border-slate-200',
      'ProviderCompleted': 'bg-purple-100 text-purple-700 border-purple-200',
      'Completed': 'bg-green-100 text-green-700 border-green-200'
    };
    return styles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const filteredRentals = rentals.filter(r => {
    if (rentalFilter === 'all') return true;
    return r.rental_type === rentalFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-lg text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={require('../image/logo.png')} 
                alt="ServisPro Logo" 
                className="h-12 w-12 rounded-lg object-contain"
              />
              <div>
                <h1 className="text-xl font-heading font-bold text-white">
                  Administration ServisPro
                </h1>
                <p className="text-sm text-slate-400">Panneau de gestion</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="gap-2 text-slate-300 hover:text-white"
              >
                <Home className="h-4 w-4" />
                Site
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="gap-2 text-slate-300 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600/20">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_providers || 0}</p>
                  <p className="text-xs text-slate-400">Prestataires</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-600/20">
                  <Clock className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.pending_providers || 0}</p>
                  <p className="text-xs text-slate-400">En attente</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-600/20">
                  <Briefcase className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_jobs || 0}</p>
                  <p className="text-xs text-slate-400">Demandes</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600/20">
                  <Home className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_rentals || 0}</p>
                  <p className="text-xs text-slate-400">Locations</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-600/20">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_sales || 0}</p>
                  <p className="text-xs text-slate-400">Ventes</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-600/20">
                  <Building className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_companies || 0}</p>
                  <p className="text-xs text-slate-400">Entreprises</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === 'providers' ? 'default' : 'outline'}
            onClick={() => setActiveTab('providers')}
            className={activeTab === 'providers' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-600 text-slate-300'}
          >
            <Users className="h-4 w-4 mr-2" />
            Prestataires ({providers.length})
          </Button>
          <Button
            variant={activeTab === 'customers' ? 'default' : 'outline'}
            onClick={() => setActiveTab('customers')}
            className={activeTab === 'customers' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-600 text-slate-300'}
          >
            <UserCircle className="h-4 w-4 mr-2" />
            Clients ({customers.length})
          </Button>
          <Button
            variant={activeTab === 'jobs' ? 'default' : 'outline'}
            onClick={() => setActiveTab('jobs')}
            className={activeTab === 'jobs' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-600 text-slate-300'}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Demandes de Service ({jobs.length})
          </Button>
          <Button
            variant={activeTab === 'rentals' ? 'default' : 'outline'}
            onClick={() => setActiveTab('rentals')}
            className={activeTab === 'rentals' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-300'}
          >
            <Building className="h-4 w-4 mr-2" />
            Locations ({rentals.length})
          </Button>
          <Button
            variant={activeTab === 'agents' ? 'default' : 'outline'}
            onClick={() => setActiveTab('agents')}
            className={activeTab === 'agents' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-600 text-slate-300'}
          >
            <Home className="h-4 w-4 mr-2" />
            Agents Immobilier ({agentsImmobilier.length})
          </Button>
          <Button
            variant={activeTab === 'sales' ? 'default' : 'outline'}
            onClick={() => setActiveTab('sales')}
            className={activeTab === 'sales' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-600 text-slate-300'}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Ventes ({propertySales.length})
          </Button>
          <Button
            variant={activeTab === 'companies' ? 'default' : 'outline'}
            onClick={() => setActiveTab('companies')}
            className={activeTab === 'companies' ? 'bg-teal-600 hover:bg-teal-700' : 'border-slate-600 text-slate-300'}
          >
            <Building className="h-4 w-4 mr-2" />
            Entreprises ({companies.length})
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('settings')}
            className={activeTab === 'settings' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-300'}
          >
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 bg-slate-800 border-slate-700 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center mb-4">
                  <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Confirmer la suppression</h3>
                <p className="text-slate-400 mb-6">
                  Êtes-vous sûr de vouloir supprimer <strong className="text-white">{deleteConfirm.name}</strong> ? Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm({ show: false, type: null, id: null, name: '' })}
                    className="flex-1 border-slate-600 text-slate-300"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={executeDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Providers List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-bold text-white">
                  Liste des Prestataires
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshTabData('providers')}
                  disabled={tabLoading}
                  className="text-slate-400 hover:text-white"
                >
                  <RefreshCw className={`h-4 w-4 ${tabLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {tabLoading && !loadedTabs['providers'] ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
                  <p className="text-slate-400">Chargement des prestataires...</p>
                </Card>
              ) : providers.length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <p className="text-slate-400">Aucun prestataire inscrit</p>
                </Card>
              ) : (
                providers.map((provider) => (
                  <Card 
                    key={provider.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedProvider?.id === provider.id ? 'border-amber-500' : 'hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedProvider(provider)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={provider.profile_picture ? `${BACKEND_URL}${provider.profile_picture}` : undefined} 
                        />
                        <AvatarFallback className="bg-slate-700 text-white">
                          {provider.first_name[0]}{provider.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">
                          {provider.first_name} {provider.last_name}
                        </h3>
                        <p className="text-sm text-slate-400">{translateProfession(provider.profession)}</p>
                        <p className="text-xs text-slate-500">{provider.phone_number}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(provider.verification_status || 'pending')}`}>
                        {translateStatus(provider.verification_status || 'pending')}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Provider Detail */}
            <div>
              <h2 className="text-lg font-heading font-bold text-white mb-4">
                Détails du Prestataire
              </h2>
              {selectedProvider ? (
                <Card className="p-6 bg-slate-800 border-slate-700">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={selectedProvider.profile_picture ? `${BACKEND_URL}${selectedProvider.profile_picture}` : undefined} 
                      />
                      <AvatarFallback className="bg-slate-700 text-white text-2xl">
                        {selectedProvider.first_name[0]}{selectedProvider.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {selectedProvider.first_name} {selectedProvider.last_name}
                      </h3>
                      <p className="text-slate-400">{translateProfession(selectedProvider.profession)}</p>
                      <p className="text-sm text-slate-500">{selectedProvider.phone_number}</p>
                    </div>
                  </div>

                  {/* About Me */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">À Propos</h4>
                    <p className="text-slate-400 bg-slate-700/50 p-3 rounded-lg">
                      {selectedProvider.about_me || 'Aucune description fournie'}
                    </p>
                  </div>

                  {/* ID Verification */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Pièce d'Identité</h4>
                    {selectedProvider.id_verification_picture ? (
                      <img 
                        src={`${BACKEND_URL}${selectedProvider.id_verification_picture}`}
                        alt="Pièce d'identité"
                        className="w-full max-w-md rounded-lg border border-slate-600"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-orange-400 bg-orange-900/20 p-3 rounded-lg">
                        <AlertCircle className="h-5 w-5" />
                        <span>Aucune pièce d'identité fournie</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {(selectedProvider.verification_status === 'pending' || !selectedProvider.verification_status) && (
                    <div className="flex gap-3 pt-4 border-t border-slate-700">
                      <Button
                        onClick={() => handleApproveProvider(selectedProvider.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        Approuver
                      </Button>
                      <Button
                        onClick={() => handleRejectProvider(selectedProvider.id)}
                        variant="outline"
                        className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                      >
                        <UserX className="h-4 w-4" />
                        Rejeter
                      </Button>
                    </div>
                  )}

                  {selectedProvider.verification_status === 'approved' && (
                    <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                      <CheckCircle className="h-5 w-5" />
                      <span>Ce prestataire a été approuvé</span>
                    </div>
                  )}

                  {selectedProvider.verification_status === 'rejected' && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                      <XCircle className="h-5 w-5" />
                      <span>Ce prestataire a été rejeté</span>
                    </div>
                  )}

                  {/* Delete Button */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => confirmDelete('provider', selectedProvider.id, `${selectedProvider.first_name} ${selectedProvider.last_name}`)}
                      variant="outline"
                      className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer ce prestataire
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Eye className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Sélectionnez un prestataire pour voir ses détails</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-heading font-bold text-white mb-4">Liste des Clients</h2>
              {customers.length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <p className="text-slate-400">Aucun client inscrit</p>
                </Card>
              ) : (
                customers.map((customer) => (
                  <Card 
                    key={customer.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id ? 'border-amber-500' : 'hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-slate-700 text-white">
                          {customer.first_name[0]}{customer.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{customer.first_name} {customer.last_name}</h3>
                        <p className="text-sm text-slate-400">{customer.phone_number}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-white mb-4">Détails du Client</h2>
              {selectedCustomer ? (
                <Card className="p-6 bg-slate-800 border-slate-700">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-slate-700 text-white text-2xl">
                        {selectedCustomer.first_name[0]}{selectedCustomer.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</h3>
                      <p className="text-slate-400">{selectedCustomer.phone_number}</p>
                    </div>
                  </div>
                  <div className="mb-6 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-400">Date d'inscription</span>
                      <span className="text-white font-medium">{new Date(selectedCustomer.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => confirmDelete('customer', selectedCustomer.id, `${selectedCustomer.first_name} ${selectedCustomer.last_name}`)}
                    variant="outline"
                    className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer ce client
                  </Button>
                </Card>
              ) : (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Eye className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Sélectionnez un client pour voir ses détails</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-lg font-heading font-bold text-white mb-4">Toutes les Demandes de Service</h2>
            {jobs.length === 0 ? (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <p className="text-slate-400">Aucune demande de service</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="p-4 bg-slate-800 border-slate-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white">{job.service_type}</h3>
                        <p className="text-sm text-slate-400">Client: {job.client_name}</p>
                        {job.provider_name && <p className="text-sm text-slate-500">Prestataire: {job.provider_name}</p>}
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-medium border ${getStatusBadge(job.status)}`}>
                        {translateStatus(job.status)}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{job.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>📍 {job.location}</span>
                      {job.scheduled_date && <span>📅 {new Date(job.scheduled_date).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rentals Tab */}
        {activeTab === 'rentals' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-bold text-white">Annonces de Location</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={rentalFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setRentalFilter('all')}
                    className={rentalFilter === 'all' ? 'bg-purple-600' : 'border-slate-600 text-slate-300'}
                  >
                    Toutes ({rentals.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={rentalFilter === 'long_term' ? 'default' : 'outline'}
                    onClick={() => setRentalFilter('long_term')}
                    className={rentalFilter === 'long_term' ? 'bg-blue-600' : 'border-slate-600 text-slate-300'}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Longue ({rentals.filter(r => r.rental_type === 'long_term' || !r.rental_type).length})
                  </Button>
                  <Button
                    size="sm"
                    variant={rentalFilter === 'short_term' ? 'default' : 'outline'}
                    onClick={() => setRentalFilter('short_term')}
                    className={rentalFilter === 'short_term' ? 'bg-purple-600' : 'border-slate-600 text-slate-300'}
                  >
                    <Moon className="h-3 w-3 mr-1" />
                    Courte ({rentals.filter(r => r.rental_type === 'short_term').length})
                  </Button>
                </div>
              </div>
              
              {filteredRentals.length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <p className="text-slate-400">Aucune annonce de location</p>
                </Card>
              ) : (
                filteredRentals.map((rental) => (
                  <Card 
                    key={rental.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedRental?.id === rental.id ? 'border-purple-500' : 'hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedRental(rental)}
                  >
                    <div className="flex gap-4">
                      {rental.photos && rental.photos.length > 0 ? (
                        <img 
                          src={`${BACKEND_URL}${rental.photos[0]}`}
                          alt={rental.title}
                          className="w-24 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                          <Building className="h-8 w-8 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-white truncate">{rental.title}</h3>
                          <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                            rental.rental_type === 'short_term' 
                              ? 'bg-purple-600/20 text-purple-400' 
                              : 'bg-blue-600/20 text-blue-400'
                          }`}>
                            {rental.rental_type === 'short_term' ? 'Courte' : 'Longue'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{rental.provider_name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          {rental.location}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-green-400 font-bold text-sm">
                            {rental.rental_type === 'short_term' && rental.price_per_night
                              ? `${Number(rental.price_per_night).toLocaleString('fr-FR')} GNF/nuit`
                              : `${Number(rental.rental_price).toLocaleString('fr-FR')} GNF/mois`
                            }
                          </span>
                          {/* Approval Status Badge */}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(rental.approval_status || 'pending')}`}>
                            {translateStatus(rental.approval_status || 'pending')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Rental Detail */}
            <div>
              <h2 className="text-lg font-heading font-bold text-white mb-4">Détails de la Location</h2>
              {selectedRental ? (
                <Card className="p-6 bg-slate-800 border-slate-700">
                  {selectedRental.photos && selectedRental.photos.length > 0 && (
                    <img 
                      src={`${BACKEND_URL}${selectedRental.photos[0]}`}
                      alt={selectedRental.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedRental.title}</h3>
                      <p className="text-slate-400">{selectedRental.property_type === 'Apartment' ? 'Appartement' : 'Maison'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">
                        {selectedRental.rental_type === 'short_term' && selectedRental.price_per_night
                          ? `${Number(selectedRental.price_per_night).toLocaleString('fr-FR')} GNF`
                          : `${Number(selectedRental.rental_price).toLocaleString('fr-FR')} GNF`
                        }
                      </p>
                      <p className="text-sm text-slate-400">
                        {selectedRental.rental_type === 'short_term' ? 'par nuit' : 'par mois'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedRental.location}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="h-4 w-4 text-slate-400" />
                      {selectedRental.provider_name} ({selectedRental.provider_phone})
                    </div>
                    {selectedRental.rental_type === 'short_term' && (
                      <>
                        {selectedRental.max_guests && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Users className="h-4 w-4 text-slate-400" />
                            Max {selectedRental.max_guests} invités
                          </div>
                        )}
                        {selectedRental.min_nights > 1 && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Moon className="h-4 w-4 text-slate-400" />
                            Min {selectedRental.min_nights} nuits
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-3 py-1 rounded text-sm ${
                      selectedRental.rental_type === 'short_term' 
                        ? 'bg-purple-600/20 text-purple-400' 
                        : 'bg-blue-600/20 text-blue-400'
                    }`}>
                      {selectedRental.rental_type === 'short_term' ? 'Courte Durée' : 'Longue Durée'}
                    </span>
                    {selectedRental.is_available !== false ? (
                      <span className="px-3 py-1 rounded text-sm bg-green-600/20 text-green-400">Disponible</span>
                    ) : (
                      <span className="px-3 py-1 rounded text-sm bg-red-600/20 text-red-400">Indisponible</span>
                    )}
                    {/* Approval Status Badge */}
                    <span className={`px-3 py-1 rounded text-sm font-medium border ${getStatusBadge(selectedRental.approval_status || 'pending')}`}>
                      {translateStatus(selectedRental.approval_status || 'pending')}
                    </span>
                  </div>

                  {/* Amenities */}
                  {selectedRental.amenities && selectedRental.amenities.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Équipements</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRental.amenities.map(a => (
                          <span key={a} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Description</h4>
                    <p className="text-slate-400 text-sm">{selectedRental.description}</p>
                  </div>

                  <div className="text-xs text-slate-500 mb-4">
                    Créée le {new Date(selectedRental.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  {/* Documents Section for Admin */}
                  <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents Légaux
                    </h4>
                    <div className="space-y-2">
                      {selectedRental.titre_foncier ? (
                        <a
                          href={`${BACKEND_URL}${selectedRental.titre_foncier}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Titre Foncier
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Titre Foncier - Non fourni
                        </div>
                      )}
                      
                      {selectedRental.seller_id_document ? (
                        <a
                          href={`${BACKEND_URL}${selectedRental.seller_id_document}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Pièce d'Identité Propriétaire
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Pièce d'Identité - Non fournie
                        </div>
                      )}
                      
                      {selectedRental.registration_ministere ? (
                        <a
                          href={`${BACKEND_URL}${selectedRental.registration_ministere}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Enregistrement Ministère
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Enregistrement Ministère - Non fourni
                        </div>
                      )}
                      
                      {selectedRental.documents_additionnels && selectedRental.documents_additionnels.length > 0 && (
                        <div className="pt-2 border-t border-slate-600">
                          <span className="text-xs text-slate-400 mb-2 block">Documents Additionnels</span>
                          {selectedRental.documents_additionnels.map((doc, idx) => (
                            <a
                              key={idx}
                              href={`${BACKEND_URL}${doc}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors mt-1"
                            >
                              <span className="flex items-center gap-2 text-sm text-slate-300">
                                <FileText className="h-4 w-4 text-blue-400" />
                                Document {idx + 1}
                              </span>
                              <Eye className="h-4 w-4 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approval Actions */}
                  {(selectedRental.approval_status === 'pending' || !selectedRental.approval_status) && (
                    <div className="flex gap-3 pt-4 border-t border-slate-700 mb-4">
                      <Button
                        onClick={() => handleApproveRental(selectedRental.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                        data-testid="approve-rental-btn"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approuver
                      </Button>
                      <Button
                        onClick={() => handleRejectRental(selectedRental.id)}
                        variant="outline"
                        className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                        data-testid="reject-rental-btn"
                      >
                        <XCircle className="h-4 w-4" />
                        Rejeter
                      </Button>
                    </div>
                  )}

                  {/* Show rejection reason if rejected */}
                  {selectedRental.approval_status === 'rejected' && selectedRental.rejection_reason && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                      <p className="text-sm text-red-400 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span><strong>Raison du rejet:</strong> {selectedRental.rejection_reason}</span>
                      </p>
                    </div>
                  )}

                  {/* Show approval info if approved */}
                  {selectedRental.approval_status === 'approved' && selectedRental.approved_at && (
                    <div className="mb-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                      <p className="text-sm text-green-400 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Approuvée le {new Date(selectedRental.approved_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={() => confirmDelete('rental', selectedRental.id, selectedRental.title)}
                    variant="outline"
                    className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer cette location
                  </Button>
                </Card>
              ) : (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Building className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Sélectionnez une location pour voir ses détails</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Agents Immobilier Tab */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-heading font-bold text-white mb-4">Agents Immobiliers</h2>
              {agentsImmobilier.length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <p className="text-slate-400">Aucun agent immobilier inscrit</p>
                </Card>
              ) : (
                agentsImmobilier.map((agent) => (
                  <Card 
                    key={agent.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedAgent?.id === agent.id ? 'border-amber-500' : 'hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={agent.profile_picture ? `${BACKEND_URL}${agent.profile_picture}` : undefined} 
                        />
                        <AvatarFallback className="bg-amber-600 text-white">
                          {agent.first_name[0]}{agent.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{agent.first_name} {agent.last_name}</h3>
                        <p className="text-sm text-slate-400">{agent.phone_number}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-purple-400">
                            <Building className="h-3 w-3 inline mr-1" />
                            {agent.rental_count || 0} annonce(s)
                          </span>
                          {agent.online_status && (
                            <span className="text-xs text-green-400">● En ligne</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(agent.verification_status || 'pending')}`}>
                        {translateStatus(agent.verification_status || 'pending')}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Agent Detail */}
            <div>
              <h2 className="text-lg font-heading font-bold text-white mb-4">Détails de l'Agent</h2>
              {selectedAgent ? (
                <Card className="p-6 bg-slate-800 border-slate-700">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={selectedAgent.profile_picture ? `${BACKEND_URL}${selectedAgent.profile_picture}` : undefined} 
                      />
                      <AvatarFallback className="bg-amber-600 text-white text-2xl">
                        {selectedAgent.first_name[0]}{selectedAgent.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedAgent.first_name} {selectedAgent.last_name}</h3>
                      <p className="text-amber-400">Agent Immobilier</p>
                      <p className="text-sm text-slate-400">{selectedAgent.phone_number}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                      <Building className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">{selectedAgent.rental_count || 0}</p>
                      <p className="text-xs text-slate-400">Annonces</p>
                    </div>
                    <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                      <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${selectedAgent.online_status ? 'text-green-400' : 'text-slate-500'}`} />
                      <p className="text-lg font-bold text-white">{selectedAgent.online_status ? 'En ligne' : 'Hors ligne'}</p>
                      <p className="text-xs text-slate-400">Statut</p>
                    </div>
                  </div>

                  {/* About */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">À Propos</h4>
                    <p className="text-slate-400 bg-slate-700/50 p-3 rounded-lg">
                      {selectedAgent.about_me || 'Aucune description fournie'}
                    </p>
                  </div>

                  {/* ID Verification */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Pièce d'Identité</h4>
                    {selectedAgent.id_verification_picture ? (
                      <img 
                        src={`${BACKEND_URL}${selectedAgent.id_verification_picture}`}
                        alt="Pièce d'identité"
                        className="w-full max-w-md rounded-lg border border-slate-600"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-orange-400 bg-orange-900/20 p-3 rounded-lg">
                        <AlertCircle className="h-5 w-5" />
                        <span>Aucune pièce d'identité fournie</span>
                      </div>
                    )}
                  </div>

                  {/* Listing info */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Inscrit le</h4>
                    <p className="text-slate-400">{new Date(selectedAgent.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>

                  {/* Actions */}
                  {(selectedAgent.verification_status === 'pending' || !selectedAgent.verification_status) && (
                    <div className="flex gap-3 pt-4 border-t border-slate-700 mb-4">
                      <Button
                        onClick={() => handleApproveProvider(selectedAgent.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        Approuver
                      </Button>
                      <Button
                        onClick={() => handleRejectProvider(selectedAgent.id)}
                        variant="outline"
                        className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                      >
                        <UserX className="h-4 w-4" />
                        Rejeter
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={() => confirmDelete('provider', selectedAgent.id, `${selectedAgent.first_name} ${selectedAgent.last_name}`)}
                    variant="outline"
                    className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer cet agent
                  </Button>
                </Card>
              ) : (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Home className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Sélectionnez un agent pour voir ses détails</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Property Sales Tab */}
        {activeTab === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-heading font-bold text-white mb-4">
                Propriétés à Vendre ({propertySales.length})
              </h2>
              {propertySales.length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <p className="text-slate-400">Aucune propriété à vendre</p>
                </Card>
              ) : (
                propertySales.map((sale) => (
                  <Card 
                    key={sale.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedSale?.id === sale.id ? 'border-emerald-500' : 'hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedSale(sale)}
                  >
                    <div className="flex gap-4">
                      {sale.photos && sale.photos.length > 0 ? (
                        <img 
                          src={`${BACKEND_URL}${sale.photos[0]}`}
                          alt={sale.title}
                          className="w-24 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                          <Home className="h-8 w-8 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-white truncate">{sale.title}</h3>
                          <span className="flex-shrink-0 px-2 py-1 rounded text-xs font-medium bg-emerald-600/20 text-emerald-400">
                            {sale.property_type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{sale.agent_name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          {sale.location}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-emerald-400 font-bold text-sm">
                            {Number(sale.sale_price).toLocaleString('fr-FR')} GNF
                          </span>
                          {sale.is_available ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-600/20 text-green-400">À Vendre</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-600/20 text-red-400">Vendu</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Sale Detail */}
            <div>
              <h2 className="text-lg font-heading font-bold text-white mb-4">Détails de la Vente</h2>
              {selectedSale ? (
                <Card className="p-6 bg-slate-800 border-slate-700">
                  {selectedSale.photos && selectedSale.photos.length > 0 && (
                    <div className="mb-4">
                      <img 
                        src={`${BACKEND_URL}${selectedSale.photos[0]}`}
                        alt={selectedSale.title}
                        className="w-full h-48 object-cover rounded-lg mb-2"
                      />
                      {selectedSale.photos.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {selectedSale.photos.slice(1).map((photo, idx) => (
                            <img 
                              key={idx}
                              src={`${BACKEND_URL}${photo}`}
                              alt={`Photo ${idx + 2}`}
                              className="w-16 h-16 object-cover rounded flex-shrink-0"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedSale.title}</h3>
                      <p className="text-emerald-400">{selectedSale.property_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-400">
                        {Number(selectedSale.sale_price).toLocaleString('fr-FR')} GNF
                      </p>
                      {selectedSale.is_negotiable && (
                        <span className="text-xs text-amber-400">Négociable</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedSale.location}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="h-4 w-4 text-slate-400" />
                      {selectedSale.agent_name} ({selectedSale.agent_phone})
                    </div>
                    {selectedSale.surface_area && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Home className="h-4 w-4 text-slate-400" />
                        Surface: {selectedSale.surface_area}
                      </div>
                    )}
                    {selectedSale.num_rooms && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Building className="h-4 w-4 text-slate-400" />
                        {selectedSale.num_rooms} pièce(s) • {selectedSale.num_bathrooms || 0} SDB
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedSale.is_available ? (
                      <span className="px-3 py-1 rounded text-sm bg-green-600/20 text-green-400">À Vendre</span>
                    ) : (
                      <span className="px-3 py-1 rounded text-sm bg-red-600/20 text-red-400">Vendu</span>
                    )}
                    {selectedSale.has_garage && <span className="px-3 py-1 rounded text-sm bg-slate-700 text-slate-300">Garage</span>}
                    {selectedSale.has_garden && <span className="px-3 py-1 rounded text-sm bg-slate-700 text-slate-300">Jardin</span>}
                    {selectedSale.has_pool && <span className="px-3 py-1 rounded text-sm bg-slate-700 text-slate-300">Piscine</span>}
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Description</h4>
                    <p className="text-slate-400 text-sm">{selectedSale.description}</p>
                  </div>

                  {/* Documents Section for Admin */}
                  <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents Légaux
                    </h4>
                    <div className="space-y-2">
                      {selectedSale.titre_foncier ? (
                        <a
                          href={`${BACKEND_URL}${selectedSale.titre_foncier}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Titre Foncier
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Titre Foncier - Non fourni
                        </div>
                      )}
                      
                      {selectedSale.seller_id_document ? (
                        <a
                          href={`${BACKEND_URL}${selectedSale.seller_id_document}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Pièce d'Identité Vendeur
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Pièce d'Identité - Non fournie
                        </div>
                      )}
                      
                      {selectedSale.registration_ministere ? (
                        <a
                          href={`${BACKEND_URL}${selectedSale.registration_ministere}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Enregistrement Ministère
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Enregistrement Ministère - Non fourni
                        </div>
                      )}
                      
                      {selectedSale.documents_additionnels && selectedSale.documents_additionnels.length > 0 && (
                        <div className="pt-2 border-t border-slate-600">
                          <span className="text-xs text-slate-400 mb-2 block">Documents Additionnels</span>
                          {selectedSale.documents_additionnels.map((doc, idx) => (
                            <a
                              key={idx}
                              href={`${BACKEND_URL}${doc}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors mt-1"
                            >
                              <span className="flex items-center gap-2 text-sm text-slate-300">
                                <FileText className="h-4 w-4 text-blue-400" />
                                Document {idx + 1}
                              </span>
                              <Eye className="h-4 w-4 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 mb-4">
                    Créée le {new Date(selectedSale.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </Card>
              ) : (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Home className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Sélectionnez une propriété pour voir ses détails</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-heading font-bold text-white mb-4">
                Entreprises ({companies.length})
              </h2>
              {companies.length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <p className="text-slate-400">Aucune entreprise inscrite</p>
                </Card>
              ) : (
                companies.map((company) => (
                  <Card 
                    key={company.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedCompany?.id === company.id ? 'border-teal-500' : 'hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <div className="flex gap-4">
                      {company.logo ? (
                        <img 
                          src={`${BACKEND_URL}${company.logo}`}
                          alt={company.company_name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                          <Building className="h-8 w-8 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-white truncate">{company.company_name}</h3>
                          <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(company.verification_status)}`}>
                            {translateStatus(company.verification_status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{company.sector}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          {company.city}, {company.region}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-slate-400">
                            RCCM: {company.rccm_number}
                          </span>
                          {company.online_status && (
                            <span className="text-green-400">● En ligne</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Company Detail */}
            <div>
              <h2 className="text-lg font-heading font-bold text-white mb-4">Détails de l Entreprise</h2>
              {selectedCompany ? (
                <Card className="p-6 bg-slate-800 border-slate-700">
                  {/* Header with Logo */}
                  <div className="flex items-center gap-4 mb-6">
                    {selectedCompany.logo ? (
                      <img 
                        src={`${BACKEND_URL}${selectedCompany.logo}`}
                        alt={selectedCompany.company_name}
                        className="w-20 h-20 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center">
                        <Building className="h-10 w-10 text-slate-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedCompany.company_name}</h3>
                      <p className="text-teal-400">{selectedCompany.sector}</p>
                      <span className={`inline-flex mt-1 px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(selectedCompany.verification_status)}`}>
                        {translateStatus(selectedCompany.verification_status)}
                      </span>
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedCompany.address}, {selectedCompany.city}, {selectedCompany.region}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <UserCircle className="h-4 w-4 text-slate-400" />
                      {selectedCompany.phone_number}
                    </div>
                    {selectedCompany.email && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <MessageCircle className="h-4 w-4 text-slate-400" />
                        {selectedCompany.email}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-400">RCCM</p>
                        <p className="text-white font-mono">{selectedCompany.rccm_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">NIF</p>
                        <p className="text-white font-mono">{selectedCompany.nif_number || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Person */}
                  <div className="mb-6 p-4 bg-slate-700/30 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Personne de Contact</h4>
                    <p className="text-white">{selectedCompany.contact_person_name}</p>
                    <p className="text-slate-400">{selectedCompany.contact_person_phone}</p>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Description</h4>
                    <p className="text-slate-400 text-sm">{selectedCompany.description}</p>
                  </div>

                  {/* Documents Section */}
                  <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents de l Entreprise
                    </h4>
                    <div className="space-y-2">
                      {selectedCompany.licence_exploitation ? (
                        <a
                          href={`${BACKEND_URL}${selectedCompany.licence_exploitation}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Licence d Exploitation
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Licence d Exploitation - Non fournie
                        </div>
                      )}

                      {selectedCompany.rccm_document ? (
                        <a
                          href={`${BACKEND_URL}${selectedCompany.rccm_document}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Document RCCM
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Document RCCM - Non fourni
                        </div>
                      )}

                      {selectedCompany.nif_document ? (
                        <a
                          href={`${BACKEND_URL}${selectedCompany.nif_document}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Document NIF
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Document NIF - Non fourni
                        </div>
                      )}

                      {selectedCompany.attestation_fiscale ? (
                        <a
                          href={`${BACKEND_URL}${selectedCompany.attestation_fiscale}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Attestation Fiscale
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Attestation Fiscale - Non fournie
                        </div>
                      )}

                      {selectedCompany.documents_additionnels && selectedCompany.documents_additionnels.length > 0 && (
                        <div className="pt-2 border-t border-slate-600">
                          <span className="text-xs text-slate-400 mb-2 block">Documents Additionnels</span>
                          {selectedCompany.documents_additionnels.map((doc, idx) => (
                            <a
                              key={idx}
                              href={`${BACKEND_URL}${doc}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors mt-1"
                            >
                              <span className="flex items-center gap-2 text-sm text-slate-300">
                                <FileText className="h-4 w-4 text-blue-400" />
                                Document {idx + 1}
                              </span>
                              <Eye className="h-4 w-4 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 mb-4">
                    Inscrite le {new Date(selectedCompany.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  {/* Actions */}
                  {selectedCompany.verification_status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-700 mb-4">
                      <Button
                        onClick={() => handleApproveCompany(selectedCompany.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        Approuver
                      </Button>
                      <Button
                        onClick={() => handleRejectCompany(selectedCompany.id)}
                        variant="outline"
                        className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                      >
                        <UserX className="h-4 w-4" />
                        Rejeter
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={() => confirmDelete('company', selectedCompany.id, selectedCompany.company_name)}
                    variant="outline"
                    className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer cette entreprise
                  </Button>
                </Card>
              ) : (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Building className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Sélectionnez une entreprise pour voir ses détails</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {tabLoading && !loadedTabs['settings'] ? (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-2" />
                <p className="text-slate-400">Chargement des paramètres...</p>
              </Card>
            ) : (
              <>
                {/* Commission Revenue Card */}
                <Card className="p-6 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-purple-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-purple-400" />
                      Revenus de Commission
                    </h2>
                    <span className="text-sm text-purple-300 bg-purple-800/50 px-3 py-1 rounded-full">
                      {commissionRevenue?.period || '30 derniers jours'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <p className="text-sm text-slate-400 mb-1">Transactions</p>
                      <p className="text-2xl font-bold text-white">
                        {commissionRevenue?.total_transactions || 0}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <p className="text-sm text-slate-400 mb-1">Ventes</p>
                      <p className="text-2xl font-bold text-white">
                        {commissionRevenue?.total_sales || 0}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <p className="text-sm text-slate-400 mb-1">Locations</p>
                      <p className="text-2xl font-bold text-white">
                        {commissionRevenue?.total_rentals || 0}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <p className="text-sm text-slate-400 mb-1">Volume Total</p>
                      <p className="text-xl font-bold text-white">
                        {((commissionRevenue?.total_volume_payments || 0) + (commissionRevenue?.total_volume_sales || 0)).toLocaleString('fr-FR')} <span className="text-xs text-slate-400">{commissionRevenue?.devise || settings.devise}</span>
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-lg">
                      <p className="text-sm text-purple-200 mb-1">Total Commission</p>
                      <p className="text-2xl font-bold text-white">
                        {(commissionRevenue?.total_commission || 0).toLocaleString('fr-FR')} <span className="text-sm text-purple-200">{commissionRevenue?.devise || settings.devise}</span>
                      </p>
                    </div>
                  </div>

                  {/* Commission Breakdown by Domain */}
                  <div className="mt-4 pt-4 border-t border-purple-700/50">
                    <p className="text-sm text-slate-400 mb-3">Répartition des commissions par domaine:</p>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                      <div className="bg-slate-800/30 p-3 rounded-lg">
                        <span className="text-orange-400 font-semibold block">Prestation</span>
                        <span className="text-white font-bold">{(commissionRevenue?.commission_breakdown?.prestation || 0).toLocaleString('fr-FR')} {commissionRevenue?.devise || settings.devise}</span>
                        <span className="text-slate-500 text-xs block">({commissionRevenue?.transaction_counts?.prestation || 0} trans.)</span>
                      </div>
                      <div className="bg-slate-800/30 p-3 rounded-lg">
                        <span className="text-cyan-400 font-semibold block">Loc. Courte</span>
                        <span className="text-white font-bold">{(commissionRevenue?.commission_breakdown?.location_courte || 0).toLocaleString('fr-FR')} {commissionRevenue?.devise || settings.devise}</span>
                        <span className="text-slate-500 text-xs block">({commissionRevenue?.transaction_counts?.location_courte || 0} trans.)</span>
                      </div>
                      <div className="bg-slate-800/30 p-3 rounded-lg">
                        <span className="text-green-400 font-semibold block">Loc. Longue</span>
                        <span className="text-white font-bold">{(commissionRevenue?.commission_breakdown?.location_longue || 0).toLocaleString('fr-FR')} {commissionRevenue?.devise || settings.devise}</span>
                        <span className="text-slate-500 text-xs block">({commissionRevenue?.transaction_counts?.location_longue || 0} trans.)</span>
                      </div>
                      <div className="bg-slate-800/30 p-3 rounded-lg">
                        <span className="text-amber-400 font-semibold block">Vente</span>
                        <span className="text-white font-bold">{(commissionRevenue?.commission_breakdown?.vente || 0).toLocaleString('fr-FR')} {commissionRevenue?.devise || settings.devise}</span>
                        <span className="text-slate-500 text-xs block">({commissionRevenue?.transaction_counts?.vente || 0} ventes)</span>
                      </div>
                      <div className="bg-slate-800/30 p-3 rounded-lg">
                        <span className="text-purple-400 font-semibold block">Loc. Véhicule</span>
                        <span className="text-white font-bold">{(commissionRevenue?.commission_breakdown?.location_vehicule || 0).toLocaleString('fr-FR')} {commissionRevenue?.devise || settings.devise}</span>
                        <span className="text-slate-500 text-xs block">({commissionRevenue?.transaction_counts?.location_vehicule || 0} trans.)</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Settings Form */}
                <Card className="p-6 bg-slate-800 border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                      <Settings className="h-6 w-6 text-purple-400" />
                      Paramètres des Commissions
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshTabData('settings')}
                      disabled={tabLoading}
                      className="text-slate-400 hover:text-white"
                    >
                      <RefreshCw className={`h-4 w-4 ${tabLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {/* Currency Selection */}
                  <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                      <DollarSign className="h-4 w-4 text-amber-400" />
                      Devise
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {deviseOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSettings({...settings, devise: option.value})}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            settings.devise === option.value
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Commission Prestation de services (%) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-orange-400" />
                        Prestation de services
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={settings.commission_prestation}
                          onChange={(e) => setSettings({...settings, commission_prestation: e.target.value})}
                          className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold">%</span>
                      </div>
                      <p className="text-xs text-slate-500">Commission sur les prestations</p>
                    </div>

                    {/* Commission Location courte durée (%) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        Location courte durée
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={settings.commission_location_courte}
                          onChange={(e) => setSettings({...settings, commission_location_courte: e.target.value})}
                          className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 font-bold">%</span>
                      </div>
                      <p className="text-xs text-slate-500">Location journalière/hebdo</p>
                    </div>

                    {/* Commission Location longue durée (%) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Home className="h-4 w-4 text-green-400" />
                        Location longue durée
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={settings.commission_location_longue}
                          onChange={(e) => setSettings({...settings, commission_location_longue: e.target.value})}
                          className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-bold">%</span>
                      </div>
                      <p className="text-xs text-slate-500">Location mensuelle/annuelle</p>
                    </div>

                    {/* Commission Vente immobilière (%) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Building className="h-4 w-4 text-amber-400" />
                        Vente immobilière
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={settings.commission_vente}
                          onChange={(e) => setSettings({...settings, commission_vente: e.target.value})}
                          className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-bold">%</span>
                      </div>
                      <p className="text-xs text-slate-500">Commission sur les ventes</p>
                    </div>

                    {/* Commission Location véhicule (%) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-purple-400" />
                        Location véhicule
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={settings.commission_location_vehicule}
                          onChange={(e) => setSettings({...settings, commission_location_vehicule: e.target.value})}
                          className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold">%</span>
                      </div>
                      <p className="text-xs text-slate-500">Location de véhicules</p>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="mt-6 pt-6 border-t border-slate-700 flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="bg-purple-600 hover:bg-purple-700 gap-2 px-6"
                    >
                      {savingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Enregistrer les Paramètres
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {/* Current Rates Summary */}
                <Card className="p-4 bg-slate-800/50 border-slate-700">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Taux actuels: Vente <span className="text-amber-400 font-semibold">{commissionRevenue?.rates?.commission_vente || settings.commission_vente}%</span> | 
                      Proprio <span className="text-purple-400 font-semibold">{(commissionRevenue?.rates?.commission_proprio || settings.commission_proprio).toLocaleString('fr-FR')} {settings.devise}</span> | 
                      Visite <span className="text-green-400 font-semibold">{(commissionRevenue?.rates?.commission_visite || settings.commission_visite).toLocaleString('fr-FR')} {settings.devise}</span> | 
                      Prestation <span className="text-blue-400 font-semibold">{(commissionRevenue?.rates?.commission_prestation || settings.commission_prestation).toLocaleString('fr-FR')} {settings.devise}</span>
                    </span>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
