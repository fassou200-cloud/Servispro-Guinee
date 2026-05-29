import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, LogOut, Users, Briefcase, CheckCircle, XCircle, 
  Clock, Eye, Home, Building, UserCheck, UserX, AlertCircle, Trash2, UserCircle,
  MapPin, Calendar, Moon, DollarSign, Star, MessageCircle, FileText, ExternalLink,
  Loader2, RefreshCw, Settings, Percent, TrendingUp, Save, Car, Banknote, Wallet,
  MessageSquare, Bug, AlertTriangle, Lightbulb, Sparkles, HelpCircle, Send, Pencil,
  Power, Ban, ChevronLeft, ChevronRight, Package, Camera, Image as ImageIcon, X, Store, Phone
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import AdminSalesManager from '@/components/AdminSalesManager';
import { getImageUrl } from '@/utils/imageUrl';
import { professionGroups } from '@/data/professions';
import AdminProvidersTab from '@/components/admin/AdminProvidersTab';
import AdminCustomersTab from '@/components/admin/AdminCustomersTab';
import AdminRentalsTab from '@/components/admin/AdminRentalsTab';
import AdminAgentsTab from '@/components/admin/AdminAgentsTab';
import AdminSalesTab from '@/components/admin/AdminSalesTab';
import AdminCompaniesTab from '@/components/admin/AdminCompaniesTab';
import AdminRevenueTab from '@/components/admin/AdminRevenueTab';
import AdminRefundsTab from '@/components/admin/AdminRefundsTab';
import AdminFeedbacksTab from '@/components/admin/AdminFeedbacksTab';
import AdminMakitiTab from '@/components/admin/AdminMakitiTab';
import AdminInterimTab from '@/components/admin/AdminInterimTab';
import AdminSMSTab from '@/components/admin/AdminSMSTab';
import AdminMakitiInsights from '@/components/admin/AdminMakitiInsights';
import AdminSettingsTab from '@/components/admin/AdminSettingsTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with admin auth token
const adminApi = axios.create();
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// Auto-logout on 401/403
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      clearAuth('admin');
      window.location.href = '/admin';
    }
    return Promise.reject(error);
  }
);

// Traduction des professions
const translateProfession = (profession) => {
  const translations = {
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'AgentImmobilier': 'Propriétaire immobilier',
    'ElectricienBatiment': 'Électricien bâtiment',
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
  const [editingSalePrice, setEditingSalePrice] = useState(false);
  const [salePriceValue, setSalePriceValue] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompanyDesc, setEditingCompanyDesc] = useState(null);
  const [companyDescText, setCompanyDescText] = useState('');
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyEditData, setCompanyEditData] = useState({});
  const [companyProducts, setCompanyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [expandedProductPhotos, setExpandedProductPhotos] = useState(null);
  const [editingAdminProduct, setEditingAdminProduct] = useState(null);
  const [adminProductEditData, setAdminProductEditData] = useState({});
  const [deletingAdminPhoto, setDeletingAdminPhoto] = useState(null);
  const [allMessages, setAllMessages] = useState({ product_messages: [], property_messages: [] });
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [makitiProducts, setMakitiProducts] = useState([]);
  const [loadingMakiti, setLoadingMakiti] = useState(false);
  const [makitiCategoryFilter, setMakitiCategoryFilter] = useState('');
  const [editingMakitiProduct, setEditingMakitiProduct] = useState(null);
  const [makitiEditData, setMakitiEditData] = useState({});
  const [expandedMakitiPhotos, setExpandedMakitiPhotos] = useState(null);
  const [deletingMakitiPhoto, setDeletingMakitiPhoto] = useState(null);
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
    devise: 'GNF',
    // Frais d'annonces immobilières
    frais_annonce_location: 50000,    // Frais par annonce de location
    frais_annonce_vente: 100000,      // Frais par annonce de vente
    annonces_gratuites: 3             // Nombre d'annonces gratuites
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
  
  // Pagination state for providers
  const [providerPage, setProviderPage] = useState(1);
  const [providersPerPage] = useState(10);
  const [providerStatusFilter, setProviderStatusFilter] = useState('all');
  
  // Pagination state for customers
  const [customerPage, setCustomerPage] = useState(1);
  const [customersPerPage] = useState(10);
  const [customerActiveFilter, setCustomerActiveFilter] = useState('all'); // all | active | inactive

  // Pagination state for agents (real-estate providers)
  const [agentPage, setAgentPage] = useState(1);
  const [agentsPerPage] = useState(10);
  const [agentStatusFilter, setAgentStatusFilter] = useState('all');

  // Sort and paginate providers - "En attente" first, then "Approuvé", then others
  const sortedAndPaginatedProviders = useMemo(() => {
    // Define sort order for verification_status
    const statusOrder = {
      'pending': 0,
      'approved': 1,
      'rejected': 2
    };
    
    // Filter
    const filtered = providerStatusFilter === 'all'
      ? providers
      : providers.filter((p) => (p.verification_status || 'pending') === providerStatusFilter);

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const statusA = statusOrder[a.verification_status || 'pending'] ?? 3;
      const statusB = statusOrder[b.verification_status || 'pending'] ?? 3;
      if (statusA !== statusB) return statusA - statusB;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    // Paginate
    const startIndex = (providerPage - 1) * providersPerPage;
    const endIndex = startIndex + providersPerPage;
    
    return {
      items: sorted.slice(startIndex, endIndex),
      totalItems: sorted.length,
      totalPages: Math.ceil(sorted.length / providersPerPage),
      currentPage: providerPage,
      pendingCount: providers.filter((p) => (p.verification_status || 'pending') === 'pending').length,
    };
  }, [providers, providerPage, providersPerPage, providerStatusFilter]);

  // Sort and paginate customers - inactive first (need action), then newest first
  const sortedAndPaginatedCustomers = useMemo(() => {
    const filtered = customerActiveFilter === 'all'
      ? customers
      : customerActiveFilter === 'inactive'
        ? customers.filter((c) => c.is_active === false)
        : customers.filter((c) => c.is_active !== false);

    const sorted = [...filtered].sort((a, b) => {
      // Inactive customers first (need attention), then by created_at
      const inactiveA = a.is_active === false ? 0 : 1;
      const inactiveB = b.is_active === false ? 0 : 1;
      if (inactiveA !== inactiveB) return inactiveA - inactiveB;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    const startIndex = (customerPage - 1) * customersPerPage;
    const endIndex = startIndex + customersPerPage;
    
    return {
      items: sorted.slice(startIndex, endIndex),
      totalItems: sorted.length,
      totalPages: Math.ceil(sorted.length / customersPerPage),
      currentPage: customerPage,
      inactiveCount: customers.filter((c) => c.is_active === false).length,
    };
  }, [customers, customerPage, customersPerPage, customerActiveFilter]);

  // Sort and paginate agents immobilier — pending first
  const sortedAndPaginatedAgents = useMemo(() => {
    const statusOrder = { 'pending': 0, 'approved': 1, 'rejected': 2 };
    const filtered = agentStatusFilter === 'all'
      ? agentsImmobilier
      : agentsImmobilier.filter((a) => (a.verification_status || 'pending') === agentStatusFilter);

    const sorted = [...filtered].sort((a, b) => {
      const statusA = statusOrder[a.verification_status || 'pending'] ?? 3;
      const statusB = statusOrder[b.verification_status || 'pending'] ?? 3;
      if (statusA !== statusB) return statusA - statusB;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const startIndex = (agentPage - 1) * agentsPerPage;
    const endIndex = startIndex + agentsPerPage;

    return {
      items: sorted.slice(startIndex, endIndex),
      totalItems: sorted.length,
      totalPages: Math.ceil(sorted.length / agentsPerPage),
      currentPage: agentPage,
      pendingCount: agentsImmobilier.filter((a) => (a.verification_status || 'pending') === 'pending').length,
    };
  }, [agentsImmobilier, agentPage, agentsPerPage, agentStatusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setProviderPage(1); }, [providerStatusFilter]);
  useEffect(() => { setCustomerPage(1); }, [customerActiveFilter]);
  useEffect(() => { setAgentPage(1); }, [agentStatusFilter]);
  
  // Refund requests state
  const [refundRequests, setRefundRequests] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(null);

  // Edit About Me modal state
  const [editAboutModal, setEditAboutModal] = useState({ show: false, providerId: null, currentText: '' });
  const [editAboutText, setEditAboutText] = useState('');
  const [savingAbout, setSavingAbout] = useState(false);

  // Edit Profile modal state
  const [editProfileModal, setEditProfileModal] = useState({ show: false, provider: null });
  const [editProfileData, setEditProfileData] = useState({ first_name: '', last_name: '', profession: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // All available professions for dropdown - extracted from professionGroups (69 total)
  const availableProfessions = professionGroups.flatMap(group => 
    group.professions.map(p => ({ name: p.name, group: group.name }))
  ).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

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
      const statsRes = await adminApi.get(`${API}/admin/stats`);
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
          const providersRes = await adminApi.get(`${API}/admin/providers`);
          setProviders(providersRes.data);
          break;
        case 'customers':
          const customersRes = await adminApi.get(`${API}/admin/customers`);
          setCustomers(customersRes.data);
          break;
        case 'jobs':
          const jobsRes = await adminApi.get(`${API}/admin/jobs`);
          setJobs(jobsRes.data);
          break;
        case 'rentals':
          const rentalsRes = await adminApi.get(`${API}/admin/rentals`);
          setRentals(rentalsRes.data);
          break;
        case 'agents':
          const agentsRes = await adminApi.get(`${API}/admin/agents-immobilier`);
          setAgentsImmobilier(agentsRes.data);
          break;
        case 'sales':
          const salesRes = await adminApi.get(`${API}/admin/property-sales`).catch(() => ({ data: [] }));
          setPropertySales(salesRes.data);
          break;
        case 'companies':
          const companiesRes = await adminApi.get(`${API}/admin/companies`).catch(() => ({ data: [] }));
          setCompanies(companiesRes.data);
          break;
        case 'settings':
          const [settingsRes, revenueRes, feesRes] = await Promise.all([
            adminApi.get(`${API}/admin/settings`),
            adminApi.get(`${API}/admin/commission-revenue`),
            adminApi.get(`${API}/admin/service-fees`)
          ]);
          setSettings(settingsRes.data);
          setCommissionRevenue(revenueRes.data);
          setServiceFees(feesRes.data);
          break;
        case 'revenus':
          setLoadingVisitFees(true);
          setLoadingDemandStats(true);
          const [visitFeesRes, demandStatsRes] = await Promise.all([
            adminApi.get(`${API}/admin/visit-fees-stats`),
            adminApi.get(`${API}/admin/demand-stats`)
          ]);
          setVisitFeesStats(visitFeesRes.data);
          setDemandStats(demandStatsRes.data);
          setLoadingVisitFees(false);
          setLoadingDemandStats(false);
          break;
        case 'feedbacks':
          const [feedbacksRes, feedbackStatsRes] = await Promise.all([
            adminApi.get(`${API}/admin/feedbacks`),
            adminApi.get(`${API}/admin/feedbacks/stats`)
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
      const statsRes = await adminApi.get(`${API}/admin/stats`);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await adminApi.put(`${API}/admin/settings`, {
        commission_prestation: parseFloat(settings.commission_prestation) || 10,
        commission_location_courte: parseFloat(settings.commission_location_courte) || 10,
        commission_location_longue: parseFloat(settings.commission_location_longue) || 5,
        commission_vente: parseFloat(settings.commission_vente) || 3,
        commission_location_vehicule: parseFloat(settings.commission_location_vehicule) || 10,
        devise: settings.devise || 'GNF',
        frais_annonce_location: parseInt(settings.frais_annonce_location) || 50000,
        frais_annonce_vente: parseInt(settings.frais_annonce_vente) || 100000,
        annonces_gratuites: parseInt(settings.annonces_gratuites) || 3
      });
      toast.success('Paramètres enregistrés avec succès !');
      // Refresh commission revenue with new rates
      const revenueRes = await adminApi.get(`${API}/admin/commission-revenue`);
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
      
      await adminApi.put(`${API}/admin/service-fees/bulk`, feesToSave);
      toast.success('Frais de service enregistrés avec succès !');
    } catch (error) {
      console.error('Error saving fees:', error);
      toast.error('Erreur lors de la sauvegarde des frais');
    } finally {
      setSavingFees(false);
    }
  };

  const handleLogout = () => {
    clearAuth('admin');
    setIsAdminAuthenticated(false);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  // Refund requests functions
  const fetchRefundRequests = async () => {
    setLoadingRefunds(true);
    try {
      const response = await adminApi.get(`${API}/admin/refund-requests`);
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
      await adminApi.put(`${API}/admin/refund-requests/${requestId}`, {
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
      await adminApi.put(`${API}/admin/providers/${editAboutModal.providerId}/about`, {
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

  // Open edit profile modal
  const openEditProfileModal = (provider) => {
    setEditProfileModal({ show: true, provider });
    setEditProfileData({
      first_name: provider.first_name || '',
      last_name: provider.last_name || '',
      profession: provider.profession || ''
    });
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!editProfileData.first_name.trim() || !editProfileData.last_name.trim()) {
      toast.error('Le prénom et le nom sont obligatoires');
      return;
    }
    
    setSavingProfile(true);
    try {
      await adminApi.put(`${API}/admin/providers/${editProfileModal.provider.id}/profile`, {
        first_name: editProfileData.first_name.trim(),
        last_name: editProfileData.last_name.trim(),
        profession: editProfileData.profession.trim(),
        profession_group: ''
      });
      
      toast.success('Profil mis à jour avec succès !');
      
      // Update local state
      const updatedData = {
        first_name: editProfileData.first_name.trim(),
        last_name: editProfileData.last_name.trim(),
        profession: editProfileData.profession.trim()
      };
      
      setSelectedProvider(prev => prev ? { ...prev, ...updatedData } : null);
      setProviders(prev => prev.map(p => 
        p.id === editProfileModal.provider.id ? { ...p, ...updatedData } : p
      ));
      
      setEditProfileModal({ show: false, provider: null });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleApproveProvider = async (providerId) => {
    try {
      await adminApi.put(`${API}/admin/providers/${providerId}/approve`);
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
      await adminApi.put(`${API}/admin/providers/${providerId}/reject`);
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
      await adminApi.delete(`${API}/admin/providers/${providerId}`);
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
      await adminApi.delete(`${API}/admin/customers/${customerId}`);
      toast.success('Client supprimé avec succès');
      refreshTabData('customers');
      setSelectedCustomer(null);
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Toggle provider active status
  const handleToggleProviderActive = async (providerId) => {
    try {
      const response = await adminApi.put(`${API}/admin/providers/${providerId}/toggle-active`);
      toast.success(response.data.message);
      refreshTabData('providers');
      refreshTabData('agents');
      // Update selected provider if it's the same one
      if (selectedProvider?.id === providerId) {
        setSelectedProvider(prev => ({ ...prev, is_active: response.data.is_active }));
      }
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  // Toggle customer active status
  const handleToggleCustomerActive = async (customerId) => {
    try {
      const response = await adminApi.put(`${API}/admin/customers/${customerId}/toggle-active`);
      toast.success(response.data.message);
      refreshTabData('customers');
      // Update selected customer if it's the same one
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(prev => ({ ...prev, is_active: response.data.is_active }));
      }
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleDeleteRental = async (rentalId) => {
    try {
      await adminApi.delete(`${API}/admin/rentals/${rentalId}`);
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
      await adminApi.put(`${API}/admin/companies/${companyId}/approve`);
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
      await adminApi.put(`${API}/admin/companies/${companyId}/reject`);
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
      await adminApi.delete(`${API}/admin/companies/${companyId}`);
      toast.success('Entreprise supprimée avec succès');
      refreshTabData('companies');
      setSelectedCompany(null);
      setCompanyProducts([]);
      setDeleteConfirm({ show: false, type: null, id: null, name: '' });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Load products for a selected company
  const loadCompanyProducts = async (companyId) => {
    setLoadingProducts(true);
    try {
      const res = await adminApi.get(`${API}/admin/companies/${companyId}/products`);
      setCompanyProducts(res.data);
    } catch (error) {
      console.error('Error loading products:', error);
      setCompanyProducts([]);
    } finally { setLoadingProducts(false); }
  };

  const handleAdminDeleteProduct = async (productId) => {
    if (!window.confirm('Supprimer ce produit et toutes ses photos ?')) return;
    try {
      await adminApi.delete(`${API}/admin/products/${productId}`);
      toast.success('Produit supprimé');
      setCompanyProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      toast.error('Erreur lors de la suppression du produit');
    }
  };

  const handleAdminDeletePhoto = async (productId, photoIndex) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    setDeletingAdminPhoto(`${productId}-${photoIndex}`);
    try {
      const res = await adminApi.delete(`${API}/admin/products/${productId}/photos/${photoIndex}`);
      setCompanyProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, photos: res.data.photos } : p
      ));
      toast.success('Photo supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression de la photo');
    } finally { setDeletingAdminPhoto(null); }
  };

  const handleAdminUpdateProduct = async (productId) => {
    try {
      const res = await adminApi.put(`${API}/admin/products/${productId}`, {
        name: adminProductEditData.name,
        description: adminProductEditData.description,
        price: parseFloat(adminProductEditData.price),
        is_negotiable: adminProductEditData.is_negotiable,
        is_available: adminProductEditData.is_available
      });
      setCompanyProducts(prev => prev.map(p => p.id === productId ? res.data : p));
      setEditingAdminProduct(null);
      toast.success('Produit mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Load all messages for admin
  const loadAllMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await adminApi.get(`${API}/admin/all-messages`);
      setAllMessages(res.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally { setLoadingMessages(false); }
  };

  // Makiti product type constants
  const ADMIN_PRODUCT_TYPES = [
    { value: 'chaussures', label: 'Chaussures' },
    { value: 'vetements', label: 'Vêtements & Mode' },
    { value: 'voitures', label: 'Voitures' },
    { value: 'cosmetiques', label: 'Cosmétiques' },
    { value: 'electronique', label: 'Électronique' },
    { value: 'ordinateurs', label: 'Ordinateurs portables' },
    { value: 'smartphones', label: 'Smartphones' },
    { value: 'alimentation', label: 'Alimentation' },
    { value: 'mobilier', label: 'Mobilier' },
    { value: 'bijoux', label: 'Bijoux' },
    { value: 'autre', label: 'Autre' },
  ];

  // Load ALL products for Makiti admin view
  const loadMakitiProducts = async () => {
    setLoadingMakiti(true);
    try {
      const res = await adminApi.get(`${API}/admin/all-products`);
      setMakitiProducts(res.data);
    } catch (error) {
      console.error('Error loading makiti products:', error);
    } finally { setLoadingMakiti(false); }
  };

  const handleMakitiUpdateProduct = async (productId) => {
    try {
      const res = await adminApi.put(`${API}/admin/products/${productId}`, {
        name: makitiEditData.name,
        description: makitiEditData.description,
        price: parseFloat(makitiEditData.price) || 0,
        currency: makitiEditData.currency || 'GNF',
        price_on_request: makitiEditData.price_on_request || false,
        product_type: makitiEditData.product_type || null,
        is_negotiable: makitiEditData.is_negotiable,
        is_available: makitiEditData.is_available
      });
      setMakitiProducts(prev => prev.map(p => p.id === productId ? res.data : p));
      setEditingMakitiProduct(null);
      toast.success('Produit mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleMakitiDeleteProduct = async (productId) => {
    if (!window.confirm('Supprimer ce produit et toutes ses photos ?')) return;
    try {
      await adminApi.delete(`${API}/admin/products/${productId}`);
      toast.success('Produit supprimé');
      setMakitiProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleMakitiDeletePhoto = async (productId, photoIndex) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    setDeletingMakitiPhoto(`${productId}-${photoIndex}`);
    try {
      const res = await adminApi.delete(`${API}/admin/products/${productId}/photos/${photoIndex}`);
      setMakitiProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, photos: res.data.photos } : p
      ));
      toast.success('Photo supprimée');
    } catch (error) {
      toast.error('Erreur');
    } finally { setDeletingMakitiPhoto(null); }
  };

  const filteredMakitiProducts = makitiCategoryFilter === '_none'
    ? makitiProducts.filter(p => !p.product_type)
    : makitiCategoryFilter
      ? makitiProducts.filter(p => p.product_type === makitiCategoryFilter)
      : makitiProducts;

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

      const response = await adminApi.post(
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
      await adminApi.delete(`${API}/admin/property-sales/${saleId}/documents`, {
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
      await adminApi.put(`${API}/admin/rentals/${rentalId}/approve`);
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
      await adminApi.put(`${API}/admin/rentals/${rentalId}/reject`);
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


  // Shared props for all tab components
  const allTabProps = {
    providers, customers, jobs, rentals, agentsImmobilier, propertySales, companies,
    feedbacks, feedbackStats, selectedFeedback, stats, loading,
    selectedProvider, selectedCustomer, selectedRental, selectedAgent, selectedSale,
    editingSalePrice, salePriceValue, selectedCompany, editingCompanyDesc, companyDescText,
    editingCompany, companyEditData, companyProducts, loadingProducts,
    expandedProductPhotos, editingAdminProduct, adminProductEditData, deletingAdminPhoto,
    allMessages, loadingMessages, makitiProducts, loadingMakiti, makitiCategoryFilter,
    editingMakitiProduct, makitiEditData, expandedMakitiPhotos, deletingMakitiPhoto,
    rentalFilter, feedbackFilter, deleteConfirm, uploadingAdminDoc,
    loadedTabs, tabLoading, settings, commissionRevenue, savingSettings,
    serviceFees, savingFees, visitFeesStats, loadingVisitFees, demandStats, loadingDemandStats,
    providerPage, customersPerPage, customerPage,
    sortedAndPaginatedProviders, sortedAndPaginatedCustomers,
    sortedAndPaginatedAgents, agentPage, setAgentPage,
    providerStatusFilter, setProviderStatusFilter,
    customerActiveFilter, setCustomerActiveFilter,
    agentStatusFilter, setAgentStatusFilter,
    refundRequests, loadingRefunds, processingRefund,
    editAboutModal, editAboutText, savingAbout,
    editProfileModal, editProfileData, savingProfile,
    availableProfessions, deviseOptions, filteredRentals,
    setSelectedProvider, setSelectedCustomer, setSelectedRental, setSelectedAgent,
    setSelectedSale, setEditingSalePrice, setSalePriceValue, setSelectedCompany,
    setEditingCompanyDesc, setCompanyDescText, setEditingCompany, setCompanyEditData,
    setExpandedProductPhotos, setEditingAdminProduct, setAdminProductEditData, setDeletingAdminPhoto,
    setLoadingMessages, setMakitiCategoryFilter, setEditingMakitiProduct, setMakitiEditData,
    setExpandedMakitiPhotos, setDeletingMakitiPhoto, setRentalFilter, setFeedbackFilter,
    setDeleteConfirm, setSettings, setServiceFees,
    setEditAboutModal, setEditAboutText, setEditProfileModal, setEditProfileData,
    setSelectedFeedback, setProviderPage, setCustomerPage,
    setRefundRequests, setProcessingRefund, setLoadedTabs,
    refreshTabData, fetchData, handleSaveSettings, handleUpdateFee, handleSaveServiceFees,
    handleApproveProvider, handleRejectProvider, handleDeleteProvider, handleDeleteCustomer,
    handleToggleProviderActive, handleToggleCustomerActive, handleDeleteRental,
    handleApproveCompany, handleRejectCompany, handleDeleteCompany,
    loadCompanyProducts, handleAdminDeleteProduct, handleAdminDeletePhoto, handleAdminUpdateProduct,
    loadAllMessages, loadMakitiProducts, handleMakitiUpdateProduct, handleMakitiDeleteProduct,
    handleMakitiDeletePhoto, handleAdminDocUpload, handleDeleteAdminDoc,
    handleApproveRental, handleRejectRental, handleSaveAbout, handleSaveProfile,
    fetchRefundRequests, handleRefundDecision, loadTabData,
    confirmDelete, executeDelete,
    adminApi, API, translateProfession, translateStatus, getStatusBadge, getImageUrl,
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
            variant={activeTab === 'messages' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('messages'); loadAllMessages(); }}
            className={activeTab === 'messages' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-300'}
            data-testid="admin-messages-tab"
          >
            <Send className="h-4 w-4 mr-2" />
            Messages
          </Button>
          <Button
            variant={activeTab === 'makiti' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('makiti'); loadMakitiProducts(); }}
            className={activeTab === 'makiti' ? 'bg-orange-600 hover:bg-orange-700' : 'border-slate-600 text-slate-300'}
            data-testid="admin-makiti-tab"
          >
            <Package className="h-4 w-4 mr-2" />
            Makiti
          </Button>
          <Button
            variant={activeTab === 'makiti-insights' ? 'default' : 'outline'}
            onClick={() => setActiveTab('makiti-insights')}
            className={activeTab === 'makiti-insights' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-600 text-slate-300'}
            data-testid="admin-makiti-insights-tab"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Insights Makiti
          </Button>
          <Button
            variant={activeTab === 'interim' ? 'default' : 'outline'}
            onClick={() => setActiveTab('interim')}
            className={activeTab === 'interim' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-600 text-slate-300'}
            data-testid="admin-interim-tab"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Intérim
          </Button>
          <Button
            variant={activeTab === 'sms' ? 'default' : 'outline'}
            onClick={() => setActiveTab('sms')}
            className={activeTab === 'sms' ? 'bg-sky-600 hover:bg-sky-700' : 'border-slate-600 text-slate-300'}
            data-testid="admin-sms-tab-btn"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
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

        {/* Edit Profile Modal */}
        {editProfileModal.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 bg-slate-800 border-slate-700 max-w-lg w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-blue-400" />
                  Modifier le Profil
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditProfileModal({ show: false, provider: null })}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Prénom</label>
                    <input
                      type="text"
                      value={editProfileData.first_name}
                      onChange={(e) => setEditProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Nom</label>
                    <input
                      type="text"
                      value={editProfileData.last_name}
                      onChange={(e) => setEditProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                      placeholder="Nom"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Profession ({availableProfessions.length} disponibles)</label>
                  <select
                    value={editProfileData.profession}
                    onChange={(e) => setEditProfileData(prev => ({ ...prev, profession: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                    data-testid="edit-profession-select"
                  >
                    <option value="">Sélectionner une profession</option>
                    {professionGroups.map((group) => (
                      <optgroup key={group.id} label={`${group.icon} ${group.name}`}>
                        {group.professions.map((prof) => (
                          <option key={prof.id} value={prof.name}>{prof.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setEditProfileModal({ show: false, provider: null })}
                  className="border-slate-600 text-slate-300"
                  disabled={savingProfile}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={savingProfile}
                >
                  {savingProfile ? (
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
            </Card>
          </div>
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && <AdminProvidersTab {...allTabProps} />}


        {/* Customers Tab */}
        {activeTab === 'customers' && <AdminCustomersTab {...allTabProps} />}


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
        {activeTab === 'rentals' && <AdminRentalsTab {...allTabProps} />}


        {/* Agents Immobilier Tab */}
        {activeTab === 'agents' && <AdminAgentsTab {...allTabProps} />}


        {/* Property Sales Tab */}
        {activeTab === 'sales' && <AdminSalesTab {...allTabProps} />}


        {/* Companies Tab */}
        {activeTab === 'companies' && <AdminCompaniesTab {...allTabProps} />}


        {/* Property Inquiries Tab - Managed by AdminSalesManager */}
        {activeTab === 'property-inquiries' && (
          <AdminSalesManager />
        )}

        {/* Revenus Tab - Visit Fees Statistics */}
        {activeTab === 'revenus' && <AdminRevenueTab {...allTabProps} />}


        {/* Refunds Tab */}
        {activeTab === 'refunds' && <AdminRefundsTab {...allTabProps} />}


        {/* Feedbacks Tab */}
        {activeTab === 'feedbacks' && <AdminFeedbacksTab {...allTabProps} />}


        {/* Makiti Tab - All Products by Category */}
        {activeTab === 'makiti' && <AdminMakitiTab {...allTabProps} />}
        {activeTab === 'makiti-insights' && <AdminMakitiInsights />}
        {activeTab === 'interim' && <AdminInterimTab />}
        {activeTab === 'sms' && <AdminSMSTab />}


        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-6" data-testid="admin-messages-section">
            {loadingMessages ? (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-slate-400">Chargement des messages...</p>
              </Card>
            ) : (
              <>
                {/* Product Messages */}
                <Card className="bg-slate-800 border-slate-700">
                  <div className="p-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-orange-400" />
                      Messages Produits ({allMessages.product_messages?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Messages envoyés par les clients aux vendeurs de Makiti</p>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {(!allMessages.product_messages || allMessages.product_messages.length === 0) ? (
                      <div className="p-8 text-center">
                        <MessageCircle className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500">Aucun message produit</p>
                      </div>
                    ) : allMessages.product_messages.map(msg => (
                      <div key={msg.id} className={`p-4 ${!msg.is_read ? 'bg-blue-900/10 border-l-2 border-l-blue-500' : ''}`} data-testid={`msg-product-${msg.id}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-bold text-white">{msg.sender_name}</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {msg.sender_phone}
                              </span>
                              {!msg.is_read && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-medium">Nouveau</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-300 mb-2">{msg.message}</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1"><Package className="h-3 w-3 text-orange-400" /> {msg.product_name}</span>
                              <span className="flex items-center gap-1"><Store className="h-3 w-3 text-teal-400" /> {msg.shop_name || 'Boutique'}</span>
                              {msg.company_name && <span className="flex items-center gap-1"><Building className="h-3 w-3 text-purple-400" /> {msg.company_name}</span>}
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Property Messages */}
                <Card className="bg-slate-800 border-slate-700">
                  <div className="p-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Home className="h-5 w-5 text-purple-400" />
                      Messages Immobilier ({allMessages.property_messages?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Messages envoyés par les clients aux agences immobilières</p>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {(!allMessages.property_messages || allMessages.property_messages.length === 0) ? (
                      <div className="p-8 text-center">
                        <MessageCircle className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500">Aucun message immobilier</p>
                      </div>
                    ) : allMessages.property_messages.map(msg => (
                      <div key={msg.id} className={`p-4 ${!msg.is_read ? 'bg-purple-900/10 border-l-2 border-l-purple-500' : ''}`} data-testid={`msg-property-${msg.id}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-bold text-white">{msg.sender_name}</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {msg.sender_phone}
                              </span>
                              {!msg.is_read && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500 text-white rounded-full font-medium">Nouveau</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-300 mb-2">{msg.message}</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1"><Home className="h-3 w-3 text-purple-400" /> {msg.rental_title || 'Bien immobilier'}</span>
                              {msg.rental_location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-teal-400" /> {msg.rental_location}</span>}
                              {msg.company_name && <span className="flex items-center gap-1"><Building className="h-3 w-3 text-purple-400" /> {msg.company_name}</span>}
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && <AdminSettingsTab {...allTabProps} />}

      </div>
    </div>
  );
};

export default AdminDashboard;
