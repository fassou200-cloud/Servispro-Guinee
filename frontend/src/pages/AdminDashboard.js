import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Shield, LogOut, Users, Briefcase, CheckCircle, XCircle, 
  Clock, Eye, Home, Building, UserCheck, UserX, AlertCircle, Trash2, UserCircle,
  MapPin, Calendar, Moon, DollarSign, Star, MessageCircle, FileText, ExternalLink
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [providersRes, customersRes, jobsRes, statsRes, rentalsRes, agentsRes, salesRes, companiesRes] = await Promise.all([
        axios.get(`${API}/admin/providers`),
        axios.get(`${API}/admin/customers`),
        axios.get(`${API}/admin/jobs`),
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/rentals`),
        axios.get(`${API}/admin/agents-immobilier`),
        axios.get(`${API}/property-sales?available_only=false`).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/companies`).catch(() => ({ data: [] }))
      ]);
      setProviders(providersRes.data);
      setCustomers(customersRes.data);
      setJobs(jobsRes.data);
      setStats(statsRes.data);
      setRentals(rentalsRes.data);
      setAgentsImmobilier(agentsRes.data);
      setPropertySales(salesRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
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
      fetchData();
      setSelectedProvider(null);
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleRejectProvider = async (providerId) => {
    try {
      await axios.put(`${API}/admin/providers/${providerId}/reject`);
      toast.success('Prestataire rejeté');
      fetchData();
      setSelectedProvider(null);
    } catch (error) {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleDeleteProvider = async (providerId) => {
    try {
      await axios.delete(`${API}/admin/providers/${providerId}`);
      toast.success('Prestataire supprimé avec succès');
      fetchData();
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
      fetchData();
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
      fetchData();
      setSelectedRental(null);
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600/20">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.providers.total}</p>
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
                  <p className="text-2xl font-bold text-white">{stats.providers.pending}</p>
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
                  <p className="text-2xl font-bold text-white">{stats.jobs.total}</p>
                  <p className="text-xs text-slate-400">Demandes</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600/20">
                  <Building className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.rentals?.total || stats.rentals}</p>
                  <p className="text-xs text-slate-400">Locations</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-600/20">
                  <Home className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.providers.agent_immobilier || 0}</p>
                  <p className="text-xs text-slate-400">Agents Immo.</p>
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
              <h2 className="text-lg font-heading font-bold text-white mb-4">
                Liste des Prestataires
              </h2>
              {providers.length === 0 ? (
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
                          {rental.is_available !== false ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-600/20 text-green-400">Disponible</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-600/20 text-red-400">Indisponible</span>
                          )}
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
      </div>
    </div>
  );
};

export default AdminDashboard;
