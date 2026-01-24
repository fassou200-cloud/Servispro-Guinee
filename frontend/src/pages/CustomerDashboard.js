import { useState, useEffect, useRef } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Home, LogOut, Search, Building, User, CheckCircle, Clock, Briefcase,
  ArrowRight, MapPin, Calendar, Star, Bell, Settings, ChevronRight,
  Phone, Shield, Sparkles, TrendingUp, MessageCircle, DollarSign, 
  Mail, RefreshCw, Eye, Send, Loader2, Wallet, AlertTriangle, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import NotificationBell from '@/components/NotificationBell';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const translateProfession = (profession) => {
  const translations = {
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Logistics': 'Logistique',
    'Logisticien': 'Logisticien',
    'Electromecanicien': 'Électromécanicien',
    'Mecanicien': 'Mécanicien',
    'Macon': 'Maçon',
    'Menuisier': 'Menuisier',
    'AgentImmobilier': 'Propriétaire immobilier',
    'Soudeur': 'Soudeur',
    'Other': 'Autres'
  };
  return translations[profession] || profession;
};

const translateStatus = (status) => {
  const translations = {
    'Pending': 'En attente',
    'Accepted': 'Accepté',
    'Rejected': 'Refusé',
    'ProviderCompleted': 'En attente de confirmation',
    'Completed': 'Terminé'
  };
  return translations[status] || status;
};

const getStatusColor = (status) => {
  const colors = {
    'Pending': 'bg-orange-100 text-orange-700 border-orange-200',
    'Accepted': 'bg-blue-100 text-blue-700 border-blue-200',
    'Rejected': 'bg-gray-100 text-gray-600 border-gray-200',
    'ProviderCompleted': 'bg-purple-100 text-purple-700 border-purple-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
};

const CustomerDashboard = ({ setIsCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [propertyInquiries, setPropertyInquiries] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const conversationEndRef = useRef(null);
  
  // Credit/Balance state
  const [balance, setBalance] = useState(0);
  const [creditHistory, setCreditHistory] = useState([]);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  // Refund request state
  const [refundRequests, setRefundRequests] = useState([]);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
    fetchJobs();
    fetchBalance();
    
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    if (tabParam === 'demandes') {
      setActiveTab('demandes');
      fetchPropertyInquiries();
    } else if (tabParam === 'creances') {
      setActiveTab('creances');
      fetchCreditHistory();
      fetchRefundRequests();
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'demandes') {
      fetchPropertyInquiries();
    } else if (activeTab === 'creances') {
      fetchCreditHistory();
      fetchRefundRequests();
    }
  }, [activeTab]);

  // Scroll to bottom of conversation when messages change
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedInquiry?.conversation]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API}/customer/jobs`);
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) return;
      const response = await axios.get(`${API}/customer/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance(0);
    }
  };

  const fetchCreditHistory = async () => {
    setLoadingBalance(true);
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        setCreditHistory([]);
        return;
      }
      const response = await axios.get(`${API}/customer/credit-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCreditHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch credit history:', error);
      setCreditHistory([]);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchRefundRequests = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) return;
      const response = await axios.get(`${API}/customer/refund-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefundRequests(response.data || []);
    } catch (error) {
      console.error('Failed to fetch refund requests:', error);
    }
  };

  const requestRefund = async (amount, reason) => {
    try {
      const token = localStorage.getItem('customerToken');
      const response = await axios.post(`${API}/customer/request-refund`, {
        amount: parseFloat(amount),
        reason: reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.id) {
        toast.success('Demande de remboursement envoyée');
        setShowRefundForm(false);
        setRefundAmount('');
        setRefundReason('');
        fetchRefundRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la demande');
    }
  };

  const reportNoShow = async (jobId) => {
    try {
      const token = localStorage.getItem('customerToken');
      const response = await axios.post(`${API}/customer/report-no-show/${jobId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        setBalance(response.data.new_balance);
        fetchCreditHistory();
        fetchJobs();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors du signalement'));
    }
  };

  const fetchPropertyInquiries = async () => {
    setLoadingInquiries(true);
    try {
      const token = localStorage.getItem('customerToken');
      const response = await axios.get(`${API}/customer/property-inquiries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPropertyInquiries(response.data || []);
      // Update selected inquiry if it exists
      if (selectedInquiry) {
        const updated = response.data.find(i => i.id === selectedInquiry.id);
        if (updated) setSelectedInquiry(updated);
      }
    } catch (error) {
      console.error('Failed to fetch property inquiries:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoadingInquiries(false);
    }
  };

  const sendReplyMessage = async () => {
    if (!replyMessage.trim() || !selectedInquiry) return;
    
    setSendingReply(true);
    try {
      const token = localStorage.getItem('customerToken');
      await axios.post(
        `${API}/customer/property-inquiries/${selectedInquiry.id}/message`,
        { message: replyMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Message envoyé !');
      setReplyMessage('');
      
      // Refresh inquiries to get updated conversation
      await fetchPropertyInquiries();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSendingReply(false);
    }
  };

  const handleConfirmComplete = async (jobId) => {
    try {
      await axios.put(`${API}/jobs/${jobId}/customer-confirm`);
      toast.success('Service confirmé comme terminé ! Merci.');
      fetchJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la confirmation'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    setIsCustomerAuthenticated(false);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const pendingConfirmation = jobs.filter(j => j.status === 'ProviderCompleted');
  const activeJobs = jobs.filter(j => j.status === 'Accepted' || j.status === 'Pending');
  const completedJobs = jobs.filter(j => j.status === 'Completed');

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-xl"
              >
                <Home className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/25">
                  S
                </div>
                <div>
                  <h1 className="text-lg font-heading font-bold text-gray-900">
                    ServisPro
                  </h1>
                  <p className="text-xs text-gray-500">Espace Client</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notification Bell for Customer */}
              <NotificationBell userType="customer" />
              
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 md:p-12 mb-8">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl" />
          </div>
          
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-white/30 shadow-2xl">
              <AvatarFallback className="text-4xl font-bold bg-white text-green-600">
                {customer.first_name[0]}{customer.last_name[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center md:text-left">
              <p className="text-green-100 text-sm mb-1">👋 Bienvenue sur ServisPro</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2">
                {customer.first_name} {customer.last_name}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-sm">
                  <Phone className="h-4 w-4" />
                  {customer.phone_number}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-sm">
                  <Shield className="h-4 w-4" />
                  Client Vérifié
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeJobs.length}</p>
                <p className="text-sm text-gray-500">En cours</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Bell className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingConfirmation.length}</p>
                <p className="text-sm text-gray-500">À confirmer</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedJobs.length}</p>
                <p className="text-sm text-gray-500">Terminés</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className={`rounded-xl ${activeTab === 'overview' ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            <Home className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
          <Button
            variant={activeTab === 'demandes' ? 'default' : 'outline'}
            onClick={() => setActiveTab('demandes')}
            className={`rounded-xl ${activeTab === 'demandes' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Mes Demandes
            {propertyInquiries.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                {propertyInquiries.length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'creances' ? 'default' : 'outline'}
            onClick={() => setActiveTab('creances')}
            className={`rounded-xl ${activeTab === 'creances' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Mes Créances
            {balance > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                {balance.toLocaleString('fr-FR')} GNF
              </span>
            )}
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card 
            className="group p-6 rounded-2xl border-0 shadow-lg bg-white hover:shadow-2xl transition-all cursor-pointer overflow-hidden relative"
            onClick={() => navigate('/browse')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
                <Search className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
                Trouver un Prestataire
              </h3>
              <p className="text-gray-600 mb-4">
                Électriciens, plombiers, mécaniciens et plus encore. Des professionnels vérifiés près de chez vous.
              </p>
              <div className="flex items-center gap-2 text-green-600 font-medium group-hover:gap-3 transition-all">
                Parcourir <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card 
            className="group p-6 rounded-2xl border-0 shadow-lg bg-white hover:shadow-2xl transition-all cursor-pointer overflow-hidden relative"
            onClick={() => navigate('/rentals')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform">
                <Building className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
                Locations Immobilières
              </h3>
              <p className="text-gray-600 mb-4">
                Appartements et maisons disponibles à Conakry et partout en Guinée. Courte et longue durée.
              </p>
              <div className="flex items-center gap-2 text-purple-600 font-medium group-hover:gap-3 transition-all">
                Voir les locations <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Confirmations */}
        {pendingConfirmation.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold text-gray-900">
                  Action Requise
                </h3>
                <p className="text-sm text-gray-500">Services en attente de votre confirmation</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {pendingConfirmation.map((job) => (
                <Card key={job.id} className="p-6 rounded-2xl border-2 border-purple-200 bg-purple-50/50 shadow-lg">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">{job.service_type}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
                          {translateStatus(job.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Prestataire: <strong>{job.provider_name}</strong> • {translateProfession(job.provider_profession)}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{job.description}</p>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                      )}
                      {job.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(job.scheduled_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleConfirmComplete(job.id)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 rounded-xl"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmer le Service Terminé
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold text-gray-900">
                  Services en Cours
                </h3>
                <p className="text-sm text-gray-500">{activeJobs.length} service(s) actif(s)</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <Card key={job.id} className="p-6 rounded-2xl border-0 shadow-lg bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-lg font-bold text-gray-900">{job.service_type}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
                          {translateStatus(job.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Prestataire: <strong>{job.provider_name}</strong>
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold text-gray-900">
                  Services Terminés
                </h3>
                <p className="text-sm text-gray-500">{completedJobs.length} service(s) complété(s)</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {completedJobs.slice(0, 4).map((job) => (
                <Card key={job.id} className="p-5 rounded-2xl border-0 shadow bg-white">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h4 className="font-bold text-gray-900">{job.service_type}</h4>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    {job.provider_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(job.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {jobs.length === 0 && !loadingJobs && (
          <Card className="p-12 rounded-2xl border-0 shadow-lg bg-white text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Briefcase className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucune demande de service
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Vous n'avez pas encore fait de demande de service. Parcourez nos prestataires pour trouver le professionnel idéal.
            </p>
            <Button
              onClick={() => navigate('/browse')}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 rounded-xl"
            >
              <Search className="h-4 w-4 mr-2" />
              Trouver un Prestataire
            </Button>
          </Card>
        )}
          </>
        )}

        {/* Mes Demandes Tab */}
        {activeTab === 'demandes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-gray-900">
                    Mes Demandes d'Achat
                  </h3>
                  <p className="text-sm text-gray-500">Suivez vos demandes d'achat immobilier</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPropertyInquiries}
                disabled={loadingInquiries}
                className="rounded-xl"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingInquiries ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>

            {loadingInquiries ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : propertyInquiries.length === 0 ? (
              <Card className="p-12 rounded-2xl border-0 shadow-lg bg-white text-center">
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                  <Building className="h-10 w-10 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Aucune demande d'achat
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Vous n'avez pas encore fait de demande d'achat immobilier. Consultez nos propriétés à vendre sur la page d'accueil.
                </p>
                <Button
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 rounded-xl"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Voir les Propriétés
                </Button>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Inquiries List */}
                <div className="space-y-4">
                  {propertyInquiries.map((inquiry) => {
                    const statusColors = {
                      pending: 'bg-orange-100 text-orange-700 border-orange-200',
                      contacted: 'bg-blue-100 text-blue-700 border-blue-200',
                      completed: 'bg-green-100 text-green-700 border-green-200',
                      rejected: 'bg-red-100 text-red-700 border-red-200'
                    };
                    const statusText = {
                      pending: 'En attente',
                      contacted: 'Contacté',
                      completed: 'Terminé',
                      rejected: 'Rejeté'
                    };
                    
                    return (
                      <Card 
                        key={inquiry.id}
                        className={`p-5 rounded-2xl border-0 shadow-lg bg-white cursor-pointer transition-all hover:shadow-xl ${
                          selectedInquiry?.id === inquiry.id ? 'ring-2 ring-amber-500' : ''
                        } ${inquiry.admin_response && !inquiry.read ? 'border-l-4 border-l-amber-500' : ''}`}
                        onClick={() => setSelectedInquiry(inquiry)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">{inquiry.property_info}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <MapPin className="h-4 w-4" />
                              {inquiry.property_location}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[inquiry.status] || statusColors.pending}`}>
                            {statusText[inquiry.status] || inquiry.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-amber-600">
                            {Number(inquiry.property_price).toLocaleString('fr-FR')} GNF
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(inquiry.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        
                        {inquiry.admin_response && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                              <MessageCircle className="h-4 w-4" />
                              Nouvelle réponse reçue
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {/* Inquiry Detail */}
                <div>
                  {selectedInquiry ? (
                    <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white sticky top-24">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Détails de la Demande</h4>
                      
                      {/* Property Info */}
                      <div className="p-4 bg-amber-50 rounded-xl mb-4">
                        <div className="flex gap-3">
                          {selectedInquiry.property_photos && selectedInquiry.property_photos.length > 0 ? (
                            <img 
                              src={`${BACKEND_URL}${selectedInquiry.property_photos[0]}`}
                              alt="Propriété"
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-amber-100 flex items-center justify-center">
                              <Building className="h-8 w-8 text-amber-400" />
                            </div>
                          )}
                          <div>
                            <h5 className="font-bold text-gray-900">{selectedInquiry.property_info}</h5>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {selectedInquiry.property_location}
                            </p>
                            <p className="text-amber-600 font-bold">
                              {Number(selectedInquiry.property_price).toLocaleString('fr-FR')} GNF
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Your Message */}
                      <div className="mb-4">
                        <h5 className="text-sm font-bold text-gray-500 uppercase mb-2">Votre Message</h5>
                        <div className="p-3 bg-gray-50 rounded-lg text-gray-700">
                          {selectedInquiry.message}
                        </div>
                      </div>

                      {/* Budget & Financing */}
                      {(selectedInquiry.budget_range || selectedInquiry.financing_type) && (
                        <div className="flex gap-4 mb-4">
                          {selectedInquiry.budget_range && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              Budget: {selectedInquiry.budget_range}
                            </div>
                          )}
                          {selectedInquiry.financing_type && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Building className="h-4 w-4 text-gray-400" />
                              {selectedInquiry.financing_type === 'cash' ? 'Comptant' : 
                               selectedInquiry.financing_type === 'credit' ? 'Crédit' : 'Autre'}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Conversation Section */}
                      <div className="border-t border-gray-200 pt-4">
                        <h5 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-amber-500" />
                          Conversation
                        </h5>
                        
                        {/* Messages Container */}
                        <div className="bg-gray-50 rounded-xl p-4 max-h-80 overflow-y-auto mb-4 space-y-3">
                          {/* Initial message from customer */}
                          <div className="flex justify-end">
                            <div className="bg-amber-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                              <p className="text-sm">{selectedInquiry.message}</p>
                              <p className="text-xs text-amber-200 mt-1">
                                {new Date(selectedInquiry.created_at).toLocaleDateString('fr-FR')} - Vous
                              </p>
                            </div>
                          </div>

                          {/* Legacy admin_response (if exists and no conversation array) */}
                          {selectedInquiry.admin_response && (!selectedInquiry.conversation || selectedInquiry.conversation.length === 0) && (
                            <div className="flex justify-start">
                              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%] shadow-sm">
                                <p className="text-sm text-gray-700">{selectedInquiry.admin_response}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {selectedInquiry.response_date ? new Date(selectedInquiry.response_date).toLocaleDateString('fr-FR') : ''} - ServisPro
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Conversation messages */}
                          {selectedInquiry.conversation && selectedInquiry.conversation.map((msg) => (
                            <div 
                              key={msg.id} 
                              className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                                msg.sender === 'customer' 
                                  ? 'bg-amber-500 text-white rounded-br-md' 
                                  : 'bg-white border border-gray-200 rounded-bl-md shadow-sm'
                              }`}>
                                <p className={`text-sm ${msg.sender === 'customer' ? 'text-white' : 'text-gray-700'}`}>
                                  {msg.message}
                                </p>
                                <p className={`text-xs mt-1 ${msg.sender === 'customer' ? 'text-amber-200' : 'text-gray-400'}`}>
                                  {new Date(msg.created_at).toLocaleDateString('fr-FR')} - {msg.sender_name}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={conversationEndRef} />
                        </div>

                        {/* Reply Input */}
                        {selectedInquiry.status !== 'completed' && (
                          <div className="space-y-3">
                            <Textarea
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Écrivez votre message..."
                              rows={3}
                              className="bg-white border-gray-300 resize-none"
                            />
                            <Button
                              onClick={sendReplyMessage}
                              disabled={sendingReply || !replyMessage.trim()}
                              className="w-full bg-amber-500 hover:bg-amber-600 gap-2"
                            >
                              {sendingReply ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Envoi...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4" />
                                  Envoyer
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {selectedInquiry.status === 'pending' && (
                            <p className="text-orange-600 text-sm flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              En attente de réponse de ServisPro
                            </p>
                          )}
                          {selectedInquiry.status === 'contacted' && (
                            <p className="text-blue-600 text-sm flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Conversation en cours
                            </p>
                          )}
                          {selectedInquiry.status === 'completed' && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-green-700 text-sm flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Cette demande a été traitée
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-12 rounded-2xl border-0 shadow-lg bg-white text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Eye className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Sélectionnez une demande pour voir les détails</p>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Créances Tab */}
        {activeTab === 'creances' && (
          <div className="space-y-6">
            {/* Balance Card */}
            <Card className="p-6 rounded-2xl border-0 shadow-lg bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm mb-1">Votre Solde de Créances</p>
                  <p className="text-4xl font-bold">{balance.toLocaleString('fr-FR')} GNF</p>
                  <p className="text-purple-200 text-sm mt-2">
                    Utilisable pour vos prochains paiements
                  </p>
                </div>
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <Wallet className="h-10 w-10 text-white" />
                </div>
              </div>
            </Card>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5 rounded-2xl border-0 shadow-md bg-amber-50 border-l-4 border-amber-500">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-800">Visite refusée</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Si un propriétaire refuse votre demande de visite après paiement, 
                      le montant est automatiquement crédité sur votre solde.
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-5 rounded-2xl border-0 shadow-md bg-red-50 border-l-4 border-red-500">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800">Prestataire absent</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Si un prestataire ne se présente pas après paiement, 
                      signalez-le pour récupérer votre crédit.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Credit History */}
            <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-heading font-bold text-gray-900">Historique des Créances</h3>
                  <p className="text-sm text-gray-500">Vos transactions de crédit</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchCreditHistory}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
              </div>

              {loadingBalance ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : creditHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Aucune transaction de crédit pour le moment</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Les créances apparaîtront ici lorsqu'un remboursement sera effectué
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creditHistory.map((transaction) => {
                    // Determine if this is a refusal-type transaction (show in red)
                    const isRefusal = ['visit_rejected', 'provider_no_show', 'used_for_payment'].includes(transaction.transaction_type) || transaction.amount < 0;
                    // Accepted/positive transactions (admin credit, refund) show in green
                    const isAccepted = ['admin_adjustment', 'refund'].includes(transaction.transaction_type) && transaction.amount > 0;
                    
                    const bgColor = isRefusal ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
                    const iconBgColor = isRefusal ? 'bg-red-100' : 'bg-green-100';
                    const iconColor = isRefusal ? 'text-red-600' : 'text-green-600';
                    const amountColor = isRefusal ? 'text-red-600' : 'text-green-600';
                    
                    return (
                      <div 
                        key={transaction.id}
                        className={`flex items-center justify-between p-4 rounded-xl border ${bgColor}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgColor}`}>
                            {transaction.transaction_type === 'visit_rejected' && (
                              <Building className={`h-5 w-5 ${iconColor}`} />
                            )}
                            {transaction.transaction_type === 'provider_no_show' && (
                              <User className={`h-5 w-5 ${iconColor}`} />
                            )}
                            {transaction.transaction_type === 'used_for_payment' && (
                              <CreditCard className={`h-5 w-5 ${iconColor}`} />
                            )}
                            {transaction.transaction_type === 'admin_adjustment' && (
                              <Shield className={`h-5 w-5 ${iconColor}`} />
                            )}
                            {!['visit_rejected', 'provider_no_show', 'used_for_payment', 'admin_adjustment'].includes(transaction.transaction_type) && (
                              <Wallet className={`h-5 w-5 ${iconColor}`} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {transaction.transaction_type === 'visit_rejected' && '❌ Visite refusée'}
                              {transaction.transaction_type === 'provider_no_show' && '❌ Prestataire absent'}
                              {transaction.transaction_type === 'used_for_payment' && '💳 Utilisé pour paiement'}
                              {transaction.transaction_type === 'admin_adjustment' && (transaction.amount > 0 ? '✅ Crédit admin' : '❌ Débit admin')}
                              {transaction.transaction_type === 'refund' && '✅ Remboursement'}
                            </p>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${amountColor}`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString('fr-FR')} GNF
                          </p>
                          <p className="text-xs text-gray-400">
                            Solde: {transaction.balance_after.toLocaleString('fr-FR')} GNF
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
