import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Shield, LogOut, Users, Briefcase, CheckCircle, XCircle, 
  Clock, Eye, Home, Building, UserCheck, UserX, AlertCircle, Trash2, UserCircle
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
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null, name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [providersRes, customersRes, jobsRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/providers`),
        axios.get(`${API}/admin/customers`),
        axios.get(`${API}/admin/jobs`),
        axios.get(`${API}/admin/stats`)
      ]);
      setProviders(providersRes.data);
      setCustomers(customersRes.data);
      setJobs(jobsRes.data);
      setStats(statsRes.data);
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

  const confirmDelete = (type, id, name) => {
    setDeleteConfirm({ show: true, type, id, name });
  };

  const executeDelete = () => {
    if (deleteConfirm.type === 'provider') {
      handleDeleteProvider(deleteConfirm.id);
    } else if (deleteConfirm.type === 'customer') {
      handleDeleteCustomer(deleteConfirm.id);
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
              <div className="p-2 rounded-lg bg-amber-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                  <p className="text-2xl font-bold text-white">{stats.rentals}</p>
                  <p className="text-xs text-slate-400">Locations</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
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
                  Êtes-vous sûr de vouloir supprimer {deleteConfirm.type === 'provider' ? 'le prestataire' : 'le client'} <strong className="text-white">{deleteConfirm.name}</strong> ? Cette action est irréversible.
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

                  {/* Profile Picture */}
                  {selectedProvider.profile_picture && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Photo de Profil</h4>
                      <img 
                        src={`${BACKEND_URL}${selectedProvider.profile_picture}`}
                        alt="Photo de profil"
                        className="w-32 h-32 rounded-lg object-cover border border-slate-600"
                      />
                    </div>
                  )}

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

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-lg font-heading font-bold text-white mb-4">
              Toutes les Demandes de Service
            </h2>
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
                        {job.provider_name && (
                          <p className="text-sm text-slate-500">Prestataire: {job.provider_name}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-medium border ${getStatusBadge(job.status)}`}>
                        {translateStatus(job.status)}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{job.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>📍 {job.location}</span>
                      {job.scheduled_date && (
                        <span>📅 {new Date(job.scheduled_date).toLocaleDateString('fr-FR')}</span>
                      )}
                      <span>🕐 {new Date(job.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
