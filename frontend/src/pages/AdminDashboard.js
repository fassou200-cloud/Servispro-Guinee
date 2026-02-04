import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, LogOut, Users, Briefcase, CheckCircle, XCircle, 
  Clock, Eye, Home, Building, UserCheck, UserX, AlertCircle, Trash2, UserCircle,
  MapPin, Calendar, Moon, DollarSign, Star, MessageCircle, FileText, ExternalLink,
  Loader2, RefreshCw, Settings, Percent, TrendingUp, Save, Car, Banknote, Wallet,
  MessageSquare, Bug, AlertTriangle, Lightbulb, Sparkles, HelpCircle, Send, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import AdminSalesManager from '@/components/AdminSalesManager';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Traduction des professions
const translateProfession = (profession) => {
  const translations = {
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'AgentImmobilier': 'Propriétaire immobilier',
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
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [rentalFilter, setRentalFilter] = useState('all'); // all, long_term, short_term
  const [feedbackFilter, setFeedbackFilter] = useState('all'); // all, new, in_progress, resolved
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null, name: '' });
  const [uploadingAdminDoc, setUploadingAdminDoc] = useState(false);
  
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
  
  // Service fees state
  const [serviceFees, setServiceFees] = useState([]);
  const [savingFees, setSavingFees] = useState(false);
  
  // Visit fees statistics
  const [visitFeesStats, setVisitFeesStats] = useState(null);
  const [loadingVisitFees, setLoadingVisitFees] = useState(false);
  
  // Demand statistics by profession and location
  const [demandStats, setDemandStats] = useState(null);
  const [loadingDemandStats, setLoadingDemandStats] = useState(false);
  
  // Refund requests state
  const [refundRequests, setRefundRequests] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(null);

  // Edit About Me modal state
  const [editAboutModal, setEditAboutModal] = useState({ show: false, providerId: null, currentText: '' });
  const [editAboutText, setEditAboutText] = useState('');
  const [savingAbout, setSavingAbout] = useState(false);

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
          const salesRes = await axios.get(`${API}/admin/property-sales`).catch(() => ({ data: [] }));
          setPropertySales(salesRes.data);
          break;
        case 'companies':
          const companiesRes = await axios.get(`${API}/admin/companies`).catch(() => ({ data: [] }));
          setCompanies(companiesRes.data);
          break;
        case 'settings':
          const [settingsRes, revenueRes, feesRes] = await Promise.all([
            axios.get(`${API}/admin/settings`),
            axios.get(`${API}/admin/commission-revenue`),
            axios.get(`${API}/admin/service-fees`)
          ]);
          setSettings(settingsRes.data);
          setCommissionRevenue(revenueRes.data);
          setServiceFees(feesRes.data);
          break;
        case 'revenus':
          setLoadingVisitFees(true);
          setLoadingDemandStats(true);
          const [visitFeesRes, demandStatsRes] = await Promise.all([
            axios.get(`${API}/admin/visit-fees-stats`),
            axios.get(`${API}/admin/demand-stats`)
          ]);
          setVisitFeesStats(visitFeesRes.data);
          setDemandStats(demandStatsRes.data);
          setLoadingVisitFees(false);
          setLoadingDemandStats(false);
          break;
        case 'feedbacks':
          const [feedbacksRes, feedbackStatsRes] = await Promise.all([
            axios.get(`${API}/admin/feedbacks`),
            axios.get(`${API}/admin/feedbacks/stats`)
          ]);
          setFeedbacks(feedbacksRes.data);
          setFeedbackStats(feedbackStatsRes.data);
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

  // Update a single service fee
  const handleUpdateFee = (profession, field, value) => {
    setServiceFees(prev => 
      prev.map(fee => 
        fee.profession === profession 
          ? { ...fee, [field]: parseFloat(value) || 0 }
          : fee
      )
    );
  };

  // Save all service fees
  const handleSaveServiceFees = async () => {
    setSavingFees(true);
    try {
      const feesToSave = serviceFees.map(fee => ({
        profession: fee.profession,
        frais_visite: parseFloat(fee.frais_visite) || 0,
        frais_prestation: parseFloat(fee.frais_prestation) || 0
      }));
      
      await axios.put(`${API}/admin/service-fees/bulk`, feesToSave);
      toast.success('Frais de service enregistrés avec succès !');
    } catch (error) {
      console.error('Error saving fees:', error);
      toast.error('Erreur lors de la sauvegarde des frais');
    } finally {
      setSavingFees(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setIsAdminAuthenticated(false);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  // Refund requests functions
  const fetchRefundRequests = async () => {
    setLoadingRefunds(true);
    try {
      const response = await axios.get(`${API}/admin/refund-requests`);
      setRefundRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching refund requests:', error);
    } finally {
      setLoadingRefunds(false);
    }
  };

  const handleRefundDecision = async (requestId, status, adminNote = '') => {
    setProcessingRefund(requestId);
    try {
      await axios.put(`${API}/admin/refund-requests/${requestId}`, {
        status: status,
        admin_note: adminNote
      });
      toast.success(status === 'approved' ? 'Remboursement approuvé' : 'Demande refusée');
      fetchRefundRequests();
    } catch (error) {
      toast.error('Erreur lors du traitement');
    } finally {
      setProcessingRefund(null);
    }
  };

  // Handle editing provider's "About Me"
  const openEditAboutModal = (provider) => {
    setEditAboutModal({
      show: true,
      providerId: provider.id,
      currentText: provider.about_me || ''
    });
    setEditAboutText(provider.about_me || '');
  };

  const handleSaveAbout = async () => {
    if (!editAboutText || editAboutText.trim().length < 10) {
      toast.error('Le texte "À propos" doit contenir au moins 10 caractères');
      return;
    }

    setSavingAbout(true);
    try {
      await axios.put(`${API}/admin/providers/${editAboutModal.providerId}/about`, {
        about_me: editAboutText.trim()
      });
      
      toast.success('Texte "À propos" mis à jour avec succès !');
      
      // Update local state
      setSelectedProvider(prev => prev ? { ...prev, about_me: editAboutText.trim() } : null);
      setProviders(prev => prev.map(p => 
        p.id === editAboutModal.providerId ? { ...p, about_me: editAboutText.trim() } : p
      ));
      
      // Close modal
      setEditAboutModal({ show: false, providerId: null, currentText: '' });
      setEditAboutText('');
    } catch (error) {
      console.error('Error updating about:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSavingAbout(false);
    }
  };

  const handleApproveProvider = async (providerId) => {
    try {
      await axios.put(`${API}/admin/providers/${providerId}/approve`);
      toast.success('Prestataire approuvé !');
      refreshTabData('providers');
      setSelectedProvider(null);
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'approbation');
    }
  };

  const handleRejectProvider = async (providerId) => {
    try {
      await axios.put(`${API}/admin/providers/${providerId}/reject`);
      toast.success('Prestataire rejeté');
      refreshTabData('providers');
      setSelectedProvider(null);
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du rejet');
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
      console.error('Company approval error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'approbation');
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
      console.error('Company reject error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du rejet');
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

  // Admin document upload for property sales
  const handleAdminDocUpload = async (saleId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non autorisé. Utilisez PDF, JPG, PNG ou WEBP');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10MB)');
      return;
    }

    setUploadingAdminDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await axios.post(
        `${API}/admin/property-sales/${saleId}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      toast.success('Document téléchargé avec succès !');
      
      // Update the selected sale with new document
      if (selectedSale?.id === saleId) {
        const adminDocs = selectedSale.admin_documents || [];
        setSelectedSale({
          ...selectedSale,
          admin_documents: [...adminDocs, response.data.document_path]
        });
      }
      
      // Refresh data
      refreshTabData('property-sales');
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du téléchargement');
    } finally {
      setUploadingAdminDoc(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Delete admin document
  const handleDeleteAdminDoc = async (saleId, docPath) => {
    try {
      await axios.delete(`${API}/admin/property-sales/${saleId}/documents`, {
        data: { document_path: docPath }
      });
      
      toast.success('Document supprimé');
      
      // Update the selected sale
      if (selectedSale?.id === saleId) {
        setSelectedSale({
          ...selectedSale,
          admin_documents: (selectedSale.admin_documents || []).filter(d => d !== docPath)
        });
      }
      
      refreshTabData('property-sales');
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
      console.error('Rental approval error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'approbation');
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
            Ventes Immo ({propertySales.length})
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
            variant={activeTab === 'property-inquiries' ? 'default' : 'outline'}
            onClick={() => setActiveTab('property-inquiries')}
            className={activeTab === 'property-inquiries' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-600 text-slate-300'}
          >
            <Home className="h-4 w-4 mr-2" />
            Demandes Immobilier
          </Button>
          <Button
            variant={activeTab === 'revenus' ? 'default' : 'outline'}
            onClick={() => setActiveTab('revenus')}
            className={activeTab === 'revenus' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-600 text-slate-300'}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Revenus
          </Button>
          <Button
            variant={activeTab === 'feedbacks' ? 'default' : 'outline'}
            onClick={() => setActiveTab('feedbacks')}
            className={activeTab === 'feedbacks' ? 'bg-pink-600 hover:bg-pink-700' : 'border-slate-600 text-slate-300'}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedbacks
            {feedbackStats?.by_status?.new > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {feedbackStats.by_status.new}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'refunds' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('refunds'); fetchRefundRequests(); }}
            className={activeTab === 'refunds' ? 'bg-orange-600 hover:bg-orange-700' : 'border-slate-600 text-slate-300'}
          >
            <Banknote className="h-4 w-4 mr-2" />
            Remboursements
            {refundRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {refundRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
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

        {/* Edit About Me Modal */}
        {editAboutModal.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 bg-slate-800 border-slate-700 max-w-lg w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-amber-400" />
                  Modifier "À Propos"
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditAboutModal({ show: false, providerId: null, currentText: '' });
                    setEditAboutText('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
              
              <p className="text-sm text-slate-400 mb-3">
                Modifiez le texte de présentation du prestataire. Minimum 10 caractères.
              </p>
              
              <Textarea
                value={editAboutText}
                onChange={(e) => setEditAboutText(e.target.value)}
                placeholder="Description du prestataire..."
                className="min-h-[150px] bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 mb-4"
                data-testid="edit-about-textarea"
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {editAboutText.length} caractère{editAboutText.length > 1 ? 's' : ''}
                </span>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditAboutModal({ show: false, providerId: null, currentText: '' });
                      setEditAboutText('');
                    }}
                    className="border-slate-600 text-slate-300"
                    disabled={savingAbout}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveAbout}
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={savingAbout || editAboutText.trim().length < 10}
                    data-testid="save-about-btn"
                  >
                    {savingAbout ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </>
                    )}
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
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-300 uppercase">À Propos</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditAboutModal(selectedProvider)}
                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 h-8 px-2"
                        data-testid="edit-about-btn"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                    </div>
                    <p className="text-slate-400 bg-slate-700/50 p-3 rounded-lg whitespace-pre-wrap">
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

                  {/* Provider Documents */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Documents Justificatifs</h4>
                    {selectedProvider.documents && selectedProvider.documents.length > 0 ? (
                      <ul className="list-none m-0 p-0">
                        {selectedProvider.documents.map((doc, idx) => {
                          const docUrl = `${BACKEND_URL}${doc.path}`;
                          return (
                            <li key={idx} className="mb-2 last:mb-0">
                              <div
                                onClick={() => window.open(docUrl, '_blank')}
                                className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                                role="button"
                                tabIndex={0}
                                data-testid={`admin-provider-doc-${idx}`}
                              >
                                <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0">
                                  <FileText className="h-5 w-5 text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-slate-200 text-sm font-medium truncate">{doc.filename || `Document ${idx + 1}`}</p>
                                  {doc.uploaded_at && (
                                    <p className="text-slate-500 text-xs">
                                      Ajouté le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                                    </p>
                                  )}
                                </div>
                                <ExternalLink className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 bg-slate-700/30 p-3 rounded-lg">
                        <FileText className="h-5 w-5" />
                        <span>Aucun document justificatif fourni</span>
                      </div>
                    )}
                  </div>

                  {/* Profile Photo */}
                  {selectedProvider.profile_picture && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Photo de Profil</h4>
                      <img 
                        src={`${BACKEND_URL}${selectedProvider.profile_picture}`}
                        alt="Photo de profil"
                        className="w-32 h-32 rounded-xl object-cover border border-slate-600"
                      />
                    </div>
                  )}

                  {/* Additional Info */}
                  {(selectedProvider.years_experience || selectedProvider.profession_group) && (
                    <div className="mb-6 grid grid-cols-2 gap-3">
                      {selectedProvider.years_experience && (
                        <div className="bg-slate-700/50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase">Expérience</p>
                          <p className="text-slate-200 font-medium">
                            {selectedProvider.years_experience === '0-1' && "Moins d'1 an"}
                            {selectedProvider.years_experience === '1-2' && '1 - 2 ans'}
                            {selectedProvider.years_experience === '2-5' && '2 - 5 ans'}
                            {selectedProvider.years_experience === '5-10' && '5 - 10 ans'}
                            {selectedProvider.years_experience === '10-15' && '10 - 15 ans'}
                            {selectedProvider.years_experience === '15-20' && '15 - 20 ans'}
                            {selectedProvider.years_experience === '20+' && 'Plus de 20 ans'}
                          </p>
                        </div>
                      )}
                      {selectedProvider.profession_group && (
                        <div className="bg-slate-700/50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500 uppercase">Catégorie</p>
                          <p className="text-slate-200 font-medium">{selectedProvider.profession_group}</p>
                        </div>
                      )}
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
                      
                      {selectedRental.document_ministere_habitat ? (
                        <a
                          href={`${BACKEND_URL}${selectedRental.document_ministere_habitat}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Document Ministère de l'Habitat
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : selectedRental.registration_ministere ? (
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
                          Document Ministère - Non fourni
                        </div>
                      )}
                      
                      {selectedRental.document_batiment ? (
                        <a
                          href={`${BACKEND_URL}${selectedRental.document_batiment}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Document du Bâtiment
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Document du Bâtiment - Non fourni
                        </div>
                      )}
                      
                      {selectedRental.seller_id_document && (
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
                      )}
                      
                      {selectedRental.documents_additionnels && selectedRental.documents_additionnels.length > 0 && (
                        <div className="pt-2 border-t border-slate-600">
                          <span className="text-xs text-slate-400 mb-2 block">Autres Documents</span>
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
                      <p className="text-amber-400">Propriétaire immobilier</p>
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
                    } ${sale.status === 'pending' ? 'border-l-4 border-l-orange-500' : ''}`}
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
                          <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                            sale.status === 'pending' ? 'bg-orange-600/20 text-orange-400' :
                            sale.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                            sale.status === 'rejected' ? 'bg-red-600/20 text-red-400' :
                            sale.status === 'sold' ? 'bg-purple-600/20 text-purple-400' :
                            'bg-emerald-600/20 text-emerald-400'
                          }`}>
                            {sale.status === 'pending' ? 'En attente' :
                             sale.status === 'approved' ? 'Approuvé' :
                             sale.status === 'rejected' ? 'Rejeté' :
                             sale.status === 'sold' ? 'Vendu' : sale.property_type}
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
                      
                      {selectedSale.document_ministere_habitat ? (
                        <a
                          href={`${BACKEND_URL}${selectedSale.document_ministere_habitat}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Document Ministère de l'Habitat
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : selectedSale.registration_ministere ? (
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
                          Document Ministère - Non fourni
                        </div>
                      )}
                      
                      {selectedSale.document_batiment ? (
                        <a
                          href={`${BACKEND_URL}${selectedSale.document_batiment}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            Document du Bâtiment
                          </span>
                          <Eye className="h-4 w-4 text-slate-400" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Document du Bâtiment - Non fourni
                        </div>
                      )}
                      
                      {selectedSale.seller_id_document && (
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
                      )}
                      
                      {selectedSale.documents_additionnels && selectedSale.documents_additionnels.length > 0 && (
                        <div className="pt-2 border-t border-slate-600">
                          <span className="text-xs text-slate-400 mb-2 block">Autres Documents</span>
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

                  {/* Admin Documents Upload Section */}
                  <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-amber-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documents Admin
                      </h4>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => handleAdminDocUpload(selectedSale.id, e)}
                          disabled={uploadingAdminDoc}
                        />
                        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          uploadingAdminDoc 
                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}>
                          {uploadingAdminDoc ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Envoi...
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3" />
                              Ajouter un document
                            </>
                          )}
                        </span>
                      </label>
                    </div>
                    
                    {/* List of admin uploaded documents */}
                    {selectedSale.admin_documents && selectedSale.admin_documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedSale.admin_documents.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                          >
                            <a
                              href={`${BACKEND_URL}${doc}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                            >
                              <FileText className="h-4 w-4 text-amber-400" />
                              Document Admin {idx + 1}
                              <ExternalLink className="h-3 w-3 text-slate-500" />
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAdminDoc(selectedSale.id, doc)}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-2">
                        Aucun document admin ajouté
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      Formats acceptés: PDF, JPG, PNG, WEBP (max 10MB)
                    </p>
                  </div>

                  <div className="text-xs text-slate-500 mb-4">
                    Créée le {new Date(selectedSale.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4 p-3 rounded-lg border" style={{
                    backgroundColor: selectedSale.status === 'pending' ? 'rgba(249, 115, 22, 0.1)' :
                                    selectedSale.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' :
                                    selectedSale.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' :
                                    'rgba(168, 85, 247, 0.1)',
                    borderColor: selectedSale.status === 'pending' ? 'rgba(249, 115, 22, 0.3)' :
                                selectedSale.status === 'approved' ? 'rgba(34, 197, 94, 0.3)' :
                                selectedSale.status === 'rejected' ? 'rgba(239, 68, 68, 0.3)' :
                                'rgba(168, 85, 247, 0.3)'
                  }}>
                    <p className={`text-sm font-medium flex items-center gap-2 ${
                      selectedSale.status === 'pending' ? 'text-orange-400' :
                      selectedSale.status === 'approved' ? 'text-green-400' :
                      selectedSale.status === 'rejected' ? 'text-red-400' :
                      'text-purple-400'
                    }`}>
                      {selectedSale.status === 'pending' && <Clock className="h-4 w-4" />}
                      {selectedSale.status === 'approved' && <CheckCircle className="h-4 w-4" />}
                      {selectedSale.status === 'rejected' && <XCircle className="h-4 w-4" />}
                      {selectedSale.status === 'sold' && <DollarSign className="h-4 w-4" />}
                      Statut: {selectedSale.status === 'pending' ? 'En attente d\'approbation' :
                               selectedSale.status === 'approved' ? 'Approuvé - Visible sur le site' :
                               selectedSale.status === 'rejected' ? 'Rejeté' :
                               'Vendu'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {selectedSale.status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-700">
                      <Button
                        onClick={async () => {
                          try {
                            await axios.put(`${API}/admin/property-sales/${selectedSale.id}/approve`);
                            toast.success('Vente immobilière approuvée !');
                            fetchData();
                            setSelectedSale({...selectedSale, status: 'approved'});
                          } catch (error) {
                            toast.error('Erreur lors de l\'approbation');
                          }
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approuver
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            await axios.put(`${API}/admin/property-sales/${selectedSale.id}/reject`);
                            toast.success('Vente immobilière rejetée');
                            fetchData();
                            setSelectedSale({...selectedSale, status: 'rejected'});
                          } catch (error) {
                            toast.error('Erreur lors du rejet');
                          }
                        }}
                        variant="outline"
                        className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Rejeter
                      </Button>
                    </div>
                  )}

                  {selectedSale.status === 'approved' && (
                    <div className="pt-4 border-t border-slate-700">
                      <Button
                        onClick={async () => {
                          try {
                            await axios.put(`${API}/admin/property-sales/${selectedSale.id}/sold`);
                            toast.success('Propriété marquée comme vendue !');
                            fetchData();
                            setSelectedSale({...selectedSale, status: 'sold', is_available: false});
                          } catch (error) {
                            toast.error('Erreur lors de la mise à jour');
                          }
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                      >
                        <DollarSign className="h-4 w-4" />
                        Marquer comme Vendu
                      </Button>
                    </div>
                  )}

                  {selectedSale.status === 'sold' && (
                    <div className="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                      <p className="text-sm text-purple-400 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Cette propriété a été vendue
                        {selectedSale.sold_at && ` le ${new Date(selectedSale.sold_at).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                  )}
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

        {/* Property Inquiries Tab - Managed by AdminSalesManager */}
        {activeTab === 'property-inquiries' && (
          <AdminSalesManager />
        )}

        {/* Revenus Tab - Visit Fees Statistics */}
        {activeTab === 'revenus' && (
          <div className="space-y-6">
            {loadingVisitFees || !visitFeesStats ? (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-2" />
                <p className="text-slate-400">Chargement des statistiques de revenus...</p>
              </Card>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total */}
                  <Card className="p-6 bg-gradient-to-br from-green-600 to-green-700 border-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-green-200 text-sm font-medium">Total Général</span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {Number(visitFeesStats.grand_total.amount).toLocaleString('fr-FR')} GNF
                    </p>
                    <p className="text-green-200 text-sm">
                      {visitFeesStats.grand_total.count} paiements
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-200">Aujourd'hui</span>
                        <span className="text-white font-medium">
                          {Number(visitFeesStats.grand_total.today_amount).toLocaleString('fr-FR')} GNF
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-green-200">Ce mois</span>
                        <span className="text-white font-medium">
                          {Number(visitFeesStats.grand_total.this_month_amount).toLocaleString('fr-FR')} GNF
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Locations */}
                  <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 border-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Home className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-blue-200 text-sm font-medium">Frais Visite Locations</span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {Number(visitFeesStats.locations.total_amount).toLocaleString('fr-FR')} GNF
                    </p>
                    <p className="text-blue-200 text-sm">
                      {visitFeesStats.locations.count} visites payées
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-200">Aujourd'hui</span>
                        <span className="text-white font-medium">
                          {Number(visitFeesStats.locations.today_amount).toLocaleString('fr-FR')} GNF
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-blue-200">Ce mois</span>
                        <span className="text-white font-medium">
                          {Number(visitFeesStats.locations.this_month_amount).toLocaleString('fr-FR')} GNF
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Prestataires */}
                  <Card className="p-6 bg-gradient-to-br from-amber-600 to-amber-700 border-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Briefcase className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-amber-200 text-sm font-medium">Frais Visite Prestataires</span>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {Number(visitFeesStats.prestataires.total_amount).toLocaleString('fr-FR')} GNF
                    </p>
                    <p className="text-amber-200 text-sm">
                      {visitFeesStats.prestataires.count} services payés
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-200">Aujourd'hui</span>
                        <span className="text-white font-medium">
                          {Number(visitFeesStats.prestataires.today_amount).toLocaleString('fr-FR')} GNF
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-amber-200">Ce mois</span>
                        <span className="text-white font-medium">
                          {Number(visitFeesStats.prestataires.this_month_amount).toLocaleString('fr-FR')} GNF
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Demand Statistics by Profession and Location */}
                {demandStats && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Demands by Profession */}
                    <Card className="p-6 bg-slate-800 border-slate-700">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-purple-400" />
                        Demandes par Profession
                        <span className="ml-auto text-sm text-slate-400 font-normal">
                          Total: {demandStats.total_demands}
                        </span>
                      </h3>
                      {Object.keys(demandStats.by_profession).length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Aucune demande enregistrée</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {Object.entries(demandStats.by_profession).map(([profession, stats]) => (
                            <div key={profession} className="p-3 bg-slate-700/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">{translateProfession(profession)}</span>
                                <span className="text-lg font-bold text-purple-400">{stats.count}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="px-2 py-1 rounded bg-orange-600/20 text-orange-400">
                                  En attente: {stats.pending}
                                </span>
                                <span className="px-2 py-1 rounded bg-blue-600/20 text-blue-400">
                                  Acceptées: {stats.accepted}
                                </span>
                                <span className="px-2 py-1 rounded bg-green-600/20 text-green-400">
                                  Terminées: {stats.completed}
                                </span>
                                <span className="px-2 py-1 rounded bg-red-600/20 text-red-400">
                                  Refusées: {stats.rejected}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Demands by Location */}
                    <Card className="p-6 bg-slate-800 border-slate-700">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-teal-400" />
                        Demandes par Localisation
                        <span className="ml-auto text-sm text-slate-400 font-normal">
                          {Object.keys(demandStats.by_location).length} zones
                        </span>
                      </h3>
                      {Object.keys(demandStats.by_location).length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Aucune localisation enregistrée</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {Object.entries(demandStats.by_location).map(([location, stats]) => (
                            <div key={location} className="p-3 bg-slate-700/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-teal-400" />
                                  {location}
                                </span>
                                <span className="text-lg font-bold text-teal-400">{stats.count}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="px-2 py-1 rounded bg-orange-600/20 text-orange-400">
                                  En attente: {stats.pending}
                                </span>
                                <span className="px-2 py-1 rounded bg-blue-600/20 text-blue-400">
                                  Acceptées: {stats.accepted}
                                </span>
                                <span className="px-2 py-1 rounded bg-green-600/20 text-green-400">
                                  Terminées: {stats.completed}
                                </span>
                                <span className="px-2 py-1 rounded bg-red-600/20 text-red-400">
                                  Refusées: {stats.rejected}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* Recent Payments Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Location Payments */}
                  <Card className="p-6 bg-slate-800 border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Home className="h-5 w-5 text-blue-400" />
                      Derniers Paiements - Locations
                    </h3>
                    {visitFeesStats.locations.recent_payments.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Aucun paiement de visite location</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {visitFeesStats.locations.recent_payments.map((payment, idx) => (
                          <div key={idx} className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">{payment.customer_name}</p>
                              <p className="text-sm text-slate-400">{payment.rental_title}</p>
                              <p className="text-xs text-slate-500">{payment.customer_phone}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-blue-400">
                                {Number(payment.amount).toLocaleString('fr-FR')} GNF
                              </p>
                              <p className="text-xs text-slate-500">
                                {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Recent Service Payments */}
                  <Card className="p-6 bg-slate-800 border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-amber-400" />
                      Derniers Paiements - Prestataires
                    </h3>
                    {visitFeesStats.prestataires.recent_payments.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Aucun paiement de service</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {visitFeesStats.prestataires.recent_payments.map((payment, idx) => (
                          <div key={idx} className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">{payment.customer_name}</p>
                              <p className="text-sm text-slate-400">Prestataire: {payment.provider_name}</p>
                              <p className="text-xs text-slate-500">{payment.customer_phone}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-amber-400">
                                {Number(payment.amount).toLocaleString('fr-FR')} GNF
                              </p>
                              <p className="text-xs text-slate-500">
                                {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Refresh Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      setLoadedTabs(prev => ({ ...prev, revenus: false }));
                      loadTabData('revenus');
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser les Statistiques
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Refunds Tab */}
        {activeTab === 'refunds' && (
          <div className="space-y-6">
            <Card className="p-6 bg-slate-800 border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                  <Banknote className="h-6 w-6 text-orange-400" />
                  Demandes de Remboursement
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchRefundRequests}
                  disabled={loadingRefunds}
                  className="text-slate-400 hover:text-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingRefunds ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>

              {loadingRefunds ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-slate-400">Chargement des demandes...</p>
                </div>
              ) : refundRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
                    <Wallet className="h-8 w-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400">Aucune demande de remboursement</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pending Requests */}
                  {refundRequests.filter(r => r.status === 'pending').length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-orange-400 mb-3">
                        En attente ({refundRequests.filter(r => r.status === 'pending').length})
                      </h3>
                      <div className="space-y-3">
                        {refundRequests.filter(r => r.status === 'pending').map((request) => (
                          <div key={request.id} className="p-4 bg-slate-700/50 rounded-xl border border-orange-500/30">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-bold text-white text-lg">{request.amount.toLocaleString('fr-FR')} GNF</p>
                                <p className="text-slate-300">{request.customer_name}</p>
                                <p className="text-slate-400 text-sm">{request.customer_phone}</p>
                                <p className="text-slate-400 text-sm mt-2 p-2 bg-slate-800 rounded">
                                  <strong>Raison:</strong> {request.reason}
                                </p>
                                <p className="text-slate-500 text-xs mt-2">
                                  {new Date(request.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleRefundDecision(request.id, 'approved', 'Remboursement effectué')}
                                  disabled={processingRefund === request.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processingRefund === request.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approuver
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRefundDecision(request.id, 'rejected', 'Demande non conforme')}
                                  disabled={processingRefund === request.id}
                                  className="border-red-500 text-red-400 hover:bg-red-500/20"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Refuser
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Processed Requests */}
                  {refundRequests.filter(r => r.status !== 'pending').length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-slate-400 mb-3">
                        Historique ({refundRequests.filter(r => r.status !== 'pending').length})
                      </h3>
                      <div className="space-y-2">
                        {refundRequests.filter(r => r.status !== 'pending').map((request) => (
                          <div key={request.id} className={`p-4 rounded-xl border ${
                            request.status === 'approved' 
                              ? 'bg-green-900/20 border-green-700/30' 
                              : 'bg-red-900/20 border-red-700/30'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-white">{request.amount.toLocaleString('fr-FR')} GNF</p>
                                <p className="text-slate-400 text-sm">{request.customer_name} - {request.customer_phone}</p>
                                <p className="text-slate-500 text-xs mt-1">{request.reason}</p>
                                {request.admin_note && (
                                  <p className="text-slate-400 text-xs mt-1">Note: {request.admin_note}</p>
                                )}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                request.status === 'approved' 
                                  ? 'bg-green-600/30 text-green-400' 
                                  : 'bg-red-600/30 text-red-400'
                              }`}>
                                {request.status === 'approved' ? '✓ Approuvé' : '✗ Refusé'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Feedbacks Tab */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-6">
            {tabLoading && !loadedTabs['feedbacks'] ? (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500 mx-auto mb-2" />
                <p className="text-slate-400">Chargement des feedbacks...</p>
              </Card>
            ) : (
              <>
                {/* Feedback Stats */}
                {feedbackStats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-pink-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{feedbackStats.total}</p>
                          <p className="text-xs text-slate-400">Total</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <Bug className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{feedbackStats.by_type.bug}</p>
                          <p className="text-xs text-slate-400">Bugs</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{feedbackStats.by_type.issue}</p>
                          <p className="text-xs text-slate-400">Problèmes</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Lightbulb className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{feedbackStats.by_type.feature}</p>
                          <p className="text-xs text-slate-400">Fonctionnalités</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{feedbackStats.by_status.new}</p>
                          <p className="text-xs text-slate-400">Nouveaux</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'Tous' },
                    { value: 'new', label: 'Nouveaux', color: 'bg-yellow-600' },
                    { value: 'in_progress', label: 'En cours', color: 'bg-blue-600' },
                    { value: 'resolved', label: 'Résolus', color: 'bg-green-600' },
                    { value: 'closed', label: 'Fermés', color: 'bg-slate-600' }
                  ].map((filter) => (
                    <Button
                      key={filter.value}
                      variant={feedbackFilter === filter.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFeedbackFilter(filter.value)}
                      className={feedbackFilter === filter.value ? (filter.color || 'bg-pink-600') : 'border-slate-600 text-slate-300'}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>

                {/* Feedbacks List */}
                <div className="grid gap-4">
                  {feedbacks
                    .filter(fb => feedbackFilter === 'all' || fb.status === feedbackFilter)
                    .map((feedback) => {
                      const typeConfig = {
                        bug: { icon: Bug, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Bug' },
                        issue: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Problème' },
                        feature: { icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Fonctionnalité' },
                        improvement: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Amélioration' },
                        other: { icon: HelpCircle, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Autre' }
                      };
                      const statusConfig = {
                        new: { color: 'bg-yellow-500', label: 'Nouveau' },
                        in_progress: { color: 'bg-blue-500', label: 'En cours' },
                        resolved: { color: 'bg-green-500', label: 'Résolu' },
                        closed: { color: 'bg-slate-500', label: 'Fermé' }
                      };
                      const TypeIcon = typeConfig[feedback.type]?.icon || HelpCircle;
                      const typeInfo = typeConfig[feedback.type] || typeConfig.other;
                      const statusInfo = statusConfig[feedback.status] || statusConfig.new;

                      return (
                        <Card 
                          key={feedback.id} 
                          className={`p-5 bg-slate-800 border-slate-700 cursor-pointer hover:border-pink-500/50 transition-colors ${selectedFeedback?.id === feedback.id ? 'border-pink-500' : ''}`}
                          onClick={() => setSelectedFeedback(selectedFeedback?.id === feedback.id ? null : feedback)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`h-12 w-12 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                              <TypeIcon className={`h-6 w-6 ${typeInfo.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-white truncate">{feedback.title}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                                  {typeInfo.label}
                                </span>
                              </div>
                              <p className="text-slate-400 text-sm line-clamp-2">{feedback.description}</p>
                              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                                {feedback.user_name && (
                                  <span className="flex items-center gap-1">
                                    <UserCircle className="h-3.5 w-3.5" />
                                    {feedback.user_name}
                                  </span>
                                )}
                                {feedback.user_type && (
                                  <span className="px-2 py-0.5 bg-slate-700 rounded">
                                    {feedback.user_type}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(feedback.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {selectedFeedback?.id === feedback.id && (
                            <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                              <div className="bg-slate-900/50 p-4 rounded-lg">
                                <p className="text-slate-300 whitespace-pre-wrap">{feedback.description}</p>
                              </div>

                              {(feedback.user_email || feedback.user_phone || feedback.page_url) && (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {feedback.user_email && (
                                    <div>
                                      <span className="text-slate-500">Email:</span>
                                      <span className="text-slate-300 ml-2">{feedback.user_email}</span>
                                    </div>
                                  )}
                                  {feedback.user_phone && (
                                    <div>
                                      <span className="text-slate-500">Téléphone:</span>
                                      <span className="text-slate-300 ml-2">{feedback.user_phone}</span>
                                    </div>
                                  )}
                                  {feedback.page_url && (
                                    <div className="col-span-2">
                                      <span className="text-slate-500">Page:</span>
                                      <a href={feedback.page_url} target="_blank" rel="noopener noreferrer" className="text-pink-400 ml-2 hover:underline">
                                        {feedback.page_url}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Admin Notes */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Notes Admin</label>
                                <Textarea
                                  value={feedback.admin_notes || ''}
                                  onChange={(e) => setSelectedFeedback({...feedback, admin_notes: e.target.value})}
                                  placeholder="Ajouter des notes..."
                                  className="bg-slate-900 border-slate-700 text-slate-300 min-h-[80px]"
                                />
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await axios.put(`${API}/admin/feedbacks/${feedback.id}?status=in_progress`);
                                      setFeedbacks(prev => prev.map(f => f.id === feedback.id ? {...f, status: 'in_progress'} : f));
                                      toast.success('Statut mis à jour');
                                    } catch (error) {
                                      toast.error('Erreur');
                                    }
                                  }}
                                  className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                                >
                                  En cours
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await axios.put(`${API}/admin/feedbacks/${feedback.id}?status=resolved`);
                                      setFeedbacks(prev => prev.map(f => f.id === feedback.id ? {...f, status: 'resolved'} : f));
                                      toast.success('Marqué comme résolu');
                                    } catch (error) {
                                      toast.error('Erreur');
                                    }
                                  }}
                                  className="border-green-500 text-green-400 hover:bg-green-500/20"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Résolu
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await axios.put(`${API}/admin/feedbacks/${feedback.id}?status=closed`);
                                      setFeedbacks(prev => prev.map(f => f.id === feedback.id ? {...f, status: 'closed'} : f));
                                      toast.success('Feedback fermé');
                                    } catch (error) {
                                      toast.error('Erreur');
                                    }
                                  }}
                                  className="border-slate-500 text-slate-400 hover:bg-slate-500/20"
                                >
                                  Fermer
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await axios.put(`${API}/admin/feedbacks/${feedback.id}`, null, {
                                        params: { admin_notes: selectedFeedback.admin_notes }
                                      });
                                      setFeedbacks(prev => prev.map(f => f.id === feedback.id ? {...f, admin_notes: selectedFeedback.admin_notes} : f));
                                      toast.success('Notes sauvegardées');
                                    } catch (error) {
                                      toast.error('Erreur');
                                    }
                                  }}
                                  className="bg-pink-600 hover:bg-pink-700"
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Sauvegarder Notes
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Supprimer ce feedback ?')) {
                                      try {
                                        await axios.delete(`${API}/admin/feedbacks/${feedback.id}`);
                                        setFeedbacks(prev => prev.filter(f => f.id !== feedback.id));
                                        setSelectedFeedback(null);
                                        toast.success('Feedback supprimé');
                                      } catch (error) {
                                        toast.error('Erreur');
                                      }
                                    }
                                  }}
                                  className="border-red-500 text-red-400 hover:bg-red-500/20"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                </div>

                {feedbacks.filter(fb => feedbackFilter === 'all' || fb.status === feedbackFilter).length === 0 && (
                  <Card className="p-12 bg-slate-800 border-slate-700 text-center">
                    <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Aucun feedback trouvé</p>
                  </Card>
                )}
              </>
            )}
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
                    <p className="text-sm text-slate-400 mb-3">Commissions sur les ventes immobilières:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-800/30 p-3 rounded-lg">
                        <span className="text-amber-400 font-semibold block">Vente Immobilière</span>
                        <span className="text-white font-bold">{(commissionRevenue?.commission_breakdown?.vente || 0).toLocaleString('fr-FR')} {commissionRevenue?.devise || settings.devise}</span>
                        <span className="text-slate-500 text-xs block">({commissionRevenue?.transaction_counts?.vente || 0} ventes)</span>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <p className="text-xs text-slate-500">Commission sur les ventes immobilières</p>
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
                      Taux actuel: 
                      Vente immobilière <span className="text-amber-400 font-semibold">{commissionRevenue?.rates?.commission_vente || settings.commission_vente}%</span>
                    </span>
                  </div>
                </Card>

                {/* Service Fees by Profession */}
                <Card className="p-6 bg-slate-800 border-slate-700 mt-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                      <DollarSign className="h-6 w-6 text-blue-400" />
                      Frais de Visite par Profession
                    </h2>
                    <Button
                      onClick={handleSaveServiceFees}
                      disabled={savingFees}
                      className="bg-blue-600 hover:bg-blue-700 gap-2"
                    >
                      {savingFees ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Enregistrer les Frais
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-sm text-slate-400 mb-4">
                    Définissez les frais de visite pour chaque catégorie de métier. Ces frais seront affichés aux clients et prestataires.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-300 font-medium">Profession</th>
                          <th className="text-center py-3 px-4 text-slate-300 font-medium">
                            <div className="flex items-center justify-center gap-2">
                              <Eye className="h-4 w-4 text-blue-400" />
                              Frais de Visite ({settings.devise})
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceFees.filter(fee => 
                          !['Electrician', 'Mechanic', 'Plumber', 'Logistics', 'Other'].includes(fee.profession)
                        ).map((fee) => (
                          <tr key={fee.profession} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="py-3 px-4">
                              <span className="text-white font-medium">{fee.label || fee.profession}</span>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={fee.frais_visite || 0}
                                onChange={(e) => handleUpdateFee(fee.profession, 'frais_visite', e.target.value)}
                                className="w-full max-w-[200px] mx-auto block h-10 px-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                    <div className="flex items-start gap-2 text-sm text-blue-300">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">À propos des frais de visite :</p>
                        <p className="mt-1 text-blue-400 text-xs">
                          Les frais de visite sont payés par le client avant le déplacement du prestataire. Ce montant est défini par la plateforme pour chaque catégorie de métier.
                        </p>
                      </div>
                    </div>
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
