import { useState, useEffect, useRef } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Home, LogOut, User, CheckCircle, Clock, Briefcase,
  Bell, Phone, Shield, MessageCircle, Wallet, ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import NotificationBell from '@/components/NotificationBell';
import RatingPopup from '@/components/RatingPopup';
import { CustomerOverviewTab } from '@/components/customer/CustomerOverviewTab';
import { CustomerDemandesTab } from '@/components/customer/CustomerDemandesTab';
import { CustomerCreancesTab } from '@/components/customer/CustomerCreancesTab';
import { CustomerAchatsTab } from '@/components/customer/CustomerAchatsTab';
import CustomerInterimTab from '@/components/customer/CustomerInterimTab';
import GuineaFlag from '@/components/GuineaFlag';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  // Rating popup state
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [ratingJobData, setRatingJobData] = useState(null);

  // Product inquiries history
  const [productInquiries, setProductInquiries] = useState([]);
  const [loadingProductInquiries, setLoadingProductInquiries] = useState(false);

  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
    fetchJobs();
    fetchBalance();

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
    } else if (activeTab === 'achats') {
      fetchProductInquiries();
    }
  }, [activeTab]);

  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedInquiry?.conversation]);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      const response = await axios.get(`${API}/customer/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchProductInquiries = async () => {
    setLoadingProductInquiries(true);
    try {
      const token = localStorage.getItem('customerToken');
      const res = await axios.get(`${API}/customer/product-inquiries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductInquiries(res.data);
    } catch (e) {
      console.error('Failed to fetch product inquiries:', e);
    } finally {
      setLoadingProductInquiries(false);
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

  const fetchPropertyInquiries = async () => {
    setLoadingInquiries(true);
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        setPropertyInquiries([]);
        return;
      }
      const response = await axios.get(`${API}/customer/property-inquiries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPropertyInquiries(response.data || []);
      if (selectedInquiry) {
        const updated = response.data.find(i => i.id === selectedInquiry.id);
        if (updated) setSelectedInquiry(updated);
      }
    } catch (error) {
      console.error('Failed to fetch property inquiries:', error);
      setPropertyInquiries([]);
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
      const token = localStorage.getItem('customerToken');
      const response = await axios.put(`${API}/jobs/${jobId}/customer-confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Service confirmé comme terminé !');

      if (response.data.can_review) {
        setRatingJobData({
          job_id: response.data.job_id,
          provider_id: response.data.provider_id,
          provider_name: response.data.provider_name,
          provider_profession: response.data.provider_profession,
          service_description: response.data.service_description
        });
        setShowRatingPopup(true);
      }

      fetchJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la confirmation'));
    }
  };

  const handleOpenRating = (job) => {
    setRatingJobData({
      job_id: job.id,
      provider_id: job.service_provider_id,
      provider_name: job.provider_name || 'Prestataire',
      provider_profession: job.provider_profession || '',
      service_description: job.description || ''
    });
    setShowRatingPopup(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    setIsCustomerAuthenticated(false);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const pendingConfirmation = jobs.filter(j => j.status === 'ProviderCompleted');
  const inProgressJobs = jobs.filter(j => j.status === 'Accepted');
  const pendingJobs = jobs.filter(j => j.status === 'Pending');
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
                  <h1 className="text-lg font-heading font-bold text-gray-900 flex items-center gap-2">
                    ServisPro <GuineaFlag className="h-3.5 w-5" />
                  </h1>
                  <p className="text-xs text-gray-500">Espace Client</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                <p className="text-2xl font-bold text-gray-900">{pendingJobs.length}</p>
                <p className="text-sm text-gray-500">En attente</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inProgressJobs.length}</p>
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
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className={`rounded-xl ${activeTab === 'overview' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            data-testid="tab-overview"
          >
            <Home className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
          <Button
            variant={activeTab === 'demandes' ? 'default' : 'outline'}
            onClick={() => setActiveTab('demandes')}
            className={`rounded-xl ${activeTab === 'demandes' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            data-testid="tab-demandes"
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
            data-testid="tab-creances"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Mes Créances
            {balance > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                {balance.toLocaleString('fr-FR')} GNF
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'achats' ? 'default' : 'outline'}
            onClick={() => setActiveTab('achats')}
            className={`rounded-xl ${activeTab === 'achats' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
            data-testid="tab-achats"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Mes Achats Makiti
            {productInquiries.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                {productInquiries.length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'interim' ? 'default' : 'outline'}
            onClick={() => setActiveTab('interim')}
            className={`rounded-xl ${activeTab === 'interim' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            data-testid="tab-interim"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Intérim
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <CustomerOverviewTab
            navigate={navigate}
            jobs={jobs}
            loadingJobs={loadingJobs}
            pendingConfirmation={pendingConfirmation}
            pendingJobs={pendingJobs}
            inProgressJobs={inProgressJobs}
            completedJobs={completedJobs}
            handleConfirmComplete={handleConfirmComplete}
            handleOpenRating={handleOpenRating}
          />
        )}

        {activeTab === 'demandes' && (
          <CustomerDemandesTab
            navigate={navigate}
            propertyInquiries={propertyInquiries}
            loadingInquiries={loadingInquiries}
            selectedInquiry={selectedInquiry}
            setSelectedInquiry={setSelectedInquiry}
            replyMessage={replyMessage}
            setReplyMessage={setReplyMessage}
            sendingReply={sendingReply}
            sendReplyMessage={sendReplyMessage}
            fetchPropertyInquiries={fetchPropertyInquiries}
            conversationEndRef={conversationEndRef}
          />
        )}

        {activeTab === 'creances' && (
          <CustomerCreancesTab
            balance={balance}
            loadingBalance={loadingBalance}
            creditHistory={creditHistory}
            refundRequests={refundRequests}
            showRefundForm={showRefundForm}
            setShowRefundForm={setShowRefundForm}
            refundAmount={refundAmount}
            setRefundAmount={setRefundAmount}
            refundReason={refundReason}
            setRefundReason={setRefundReason}
            requestRefund={requestRefund}
            fetchCreditHistory={fetchCreditHistory}
          />
        )}

        {activeTab === 'achats' && (
          <CustomerAchatsTab
            navigate={navigate}
            productInquiries={productInquiries}
            loadingProductInquiries={loadingProductInquiries}
          />
        )}

        {activeTab === 'interim' && (
          <CustomerInterimTab />
        )}
      </div>

      {/* Rating Popup */}
      <RatingPopup
        open={showRatingPopup}
        onOpenChange={setShowRatingPopup}
        jobData={ratingJobData}
        customerInfo={customer}
        onReviewSubmitted={() => {
          setRatingJobData(null);
          fetchJobs();
        }}
      />
    </div>
  );
};

export default CustomerDashboard;
