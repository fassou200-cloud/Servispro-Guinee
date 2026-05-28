import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { clearAuth } from '@/utils/helpers';
import { AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { getErrorMessage } from '@/utils/helpers';
import { getImageUrl } from '@/utils/imageUrl';
import MyShop from '@/components/MyShop';
import CompanyProfileTab from '@/components/company/CompanyProfileTab';
import CompanyCreateServiceTab from '@/components/company/CompanyCreateServiceTab';
import CompanyCreateJobTab from '@/components/company/CompanyCreateJobTab';
import CompanyRentalsTab from '@/components/company/CompanyRentalsTab';
import CompanyCreateRentalTab from '@/components/company/CompanyCreateRentalTab';
import CompanySalesTab from '@/components/company/CompanySalesTab';
import CompanyCreateSaleTab from '@/components/company/CompanyCreateSaleTab';
import CompanyDocumentsTab from '@/components/company/CompanyDocumentsTab';
import CompanyServicesTab from '@/components/company/CompanyServicesTab';
import CompanyJobsTab from '@/components/company/CompanyJobsTab';
import CompanyPropertyMessagesTab from '@/components/company/CompanyPropertyMessagesTab';
import CompanyStatsTab from '@/components/company/CompanyStatsTab';
import CompanyInterimTab from '@/components/company/CompanyInterimTab';
import { CompanyDashboardHeader } from '@/components/company/CompanyDashboardHeader';
import CompanyDashboardProfileCard from '@/components/company/CompanyDashboardProfileCard';
import CompanyDashboardTabsNav from '@/components/company/CompanyDashboardTabsNav';
import { COMPANY_SECTORS, CONTRACT_TYPES } from '@/data/companyConstants';
import { useRentalManager } from '@/hooks/useRentalManager';
import { useSaleManager } from '@/hooks/useSaleManager';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const blankServiceForm = { title: '', description: '', category: '', price_min: '', price_max: '', duration: '', location: '' };
const blankJobForm = { title: '', description: '', requirements: '', location: '', contract_type: '', salary_min: '', salary_max: '', deadline: '' };

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [services, setServices] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);
  const [propertyMessages, setPropertyMessages] = useState([]);
  const [interimBadge, setInterimBadge] = useState({ pending_applications: 0, open_missions: 0 });

  // Service / Job forms
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState(blankServiceForm);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState(blankJobForm);

  // Password change (used by CompanyProfileTab)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  // Real-estate managers (encapsulate all rental/sale state + handlers)
  const rentalMgr = useRentalManager(API, () => setActiveTab('rentals'));
  const saleMgr = useSaleManager(API, () => setActiveTab('sales'));

  const isRealEstateSector = company?.sector === 'Immobilier';
  const isApproved = company?.verification_status === 'approved';

  // Fetch company profile
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const token = localStorage.getItem('companyToken');
        if (!token) { navigate('/company/auth'); return; }
        const response = await axios.get(`${API}/company/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
        setCompany(response.data);
      } catch (error) {
        if (error.response?.status === 401) {
          clearAuth('company');
          navigate('/company/auth');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyProfile();
  }, [navigate]);

  // Poll interim badge
  useEffect(() => {
    const fetchBadge = async () => {
      const token = localStorage.getItem('companyToken');
      if (!token) return;
      try {
        const res = await axios.get(`${API}/interim/company/badge`, { headers: { Authorization: `Bearer ${token}` } });
        setInterimBadge(res.data || {});
      } catch { /* silent */ }
    };
    fetchBadge();
    const id = setInterval(fetchBadge, 30000);
    return () => clearInterval(id);
  }, []);

  // Fetch services, jobs, rentals, sales
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('companyToken');
      if (!token) return;
      try {
        const [servicesRes, jobsRes] = await Promise.all([
          axios.get(`${API}/company/services/my`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/company/job-offers/my`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setServices(servicesRes.data);
        setJobOffers(jobsRes.data);

        if (company?.sector === 'Immobilier') {
          const [rentalsRes, salesRes, propertyMsgsRes] = await Promise.all([
            axios.get(`${API}/company/rentals/my`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/company/property-sales/my`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/company/property-messages`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
          ]);
          rentalMgr.setRentals(rentalsRes.data);
          saleMgr.setSales(salesRes.data);
          setPropertyMessages(propertyMsgsRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    if (company) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const handleLogout = () => {
    clearAuth('company');
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const toggleOnlineStatus = async (checked) => {
    try {
      const token = localStorage.getItem('companyToken');
      await axios.put(`${API}/company/profile/me`, { online_status: checked }, { headers: { Authorization: `Bearer ${token}` } });
      setCompany({ ...company, online_status: checked });
      toast.success(checked ? 'Vous êtes maintenant en ligne' : 'Vous êtes maintenant hors ligne');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDocumentUpload = async (docType, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Fichier trop grand (max 10MB)'); return; }
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('companyToken');
    try {
      const endpoint = docType === 'logo' ? `${API}/company/upload-logo` : `${API}/company/upload-document/${docType}`;
      await axios.post(endpoint, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      const res = await axios.get(`${API}/company/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
      setCompany(res.data);
      toast.success('Document téléchargé avec succès');
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('companyToken');
    try {
      await axios.post(`${API}/company/services`, {
        ...serviceForm,
        price_min: serviceForm.price_min ? parseInt(serviceForm.price_min) : null,
        price_max: serviceForm.price_max ? parseInt(serviceForm.price_max) : null,
        is_available: true,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Service créé avec succès');
      setShowServiceForm(false);
      setServiceForm(blankServiceForm);
      const res = await axios.get(`${API}/company/services/my`, { headers: { Authorization: `Bearer ${token}` } });
      setServices(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la création'));
    }
  };

  const handleCreateJobOffer = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('companyToken');
    try {
      await axios.post(`${API}/company/job-offers`, {
        ...jobForm,
        salary_min: jobForm.salary_min ? parseInt(jobForm.salary_min) : null,
        salary_max: jobForm.salary_max ? parseInt(jobForm.salary_max) : null,
        is_active: true,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Offre publiée avec succès');
      setShowJobForm(false);
      setJobForm(blankJobForm);
      const res = await axios.get(`${API}/company/job-offers/my`, { headers: { Authorization: `Bearer ${token}` } });
      setJobOffers(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la création'));
    }
  };

  const getDocumentStatus = () => {
    if (!company) return { complete: 0, total: 4 };
    const docs = [company.licence_exploitation, company.rccm_document, company.nif_document, company.attestation_fiscale];
    return { complete: docs.filter(Boolean).length, total: 4 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Session expirée</h2>
          <p className="text-muted-foreground mb-4">Veuillez vous reconnecter</p>
          <Button onClick={() => navigate('/company/auth')}>Se reconnecter</Button>
        </Card>
      </div>
    );
  }

  const docStatus = getDocumentStatus();

  // Shared props for tab components (mirrors previous allTabProps)
  const allTabProps = {
    company, setCompany, services, setServices, jobOffers, setJobOffers,
    rentals: rentalMgr.rentals, setRentals: rentalMgr.setRentals,
    sales: saleMgr.sales, setSales: saleMgr.setSales,
    propertyMessages,
    showServiceForm, setShowServiceForm, serviceForm, setServiceForm,
    showJobForm, setShowJobForm, jobForm, setJobForm,
    rentalForm: rentalMgr.rentalForm, setRentalForm: rentalMgr.setRentalForm,
    rentalStep: rentalMgr.rentalStep, setRentalStep: rentalMgr.setRentalStep,
    createdRentalId: rentalMgr.createdRentalId, setCreatedRentalId: rentalMgr.setCreatedRentalId,
    rentalPhotos: rentalMgr.rentalPhotos, setRentalPhotos: rentalMgr.setRentalPhotos,
    rentalPhotoPreviewUrls: rentalMgr.rentalPhotoPreviewUrls, setRentalPhotoPreviewUrls: rentalMgr.setRentalPhotoPreviewUrls,
    uploadingRentalFiles: rentalMgr.uploadingRentalFiles,
    saleForm: saleMgr.saleForm, setSaleForm: saleMgr.setSaleForm,
    saleStep: saleMgr.saleStep, setSaleStep: saleMgr.setSaleStep,
    createdSaleId: saleMgr.createdSaleId, setCreatedSaleId: saleMgr.setCreatedSaleId,
    salePhotos: saleMgr.salePhotos, setSalePhotos: saleMgr.setSalePhotos,
    salePhotoPreviewUrls: saleMgr.salePhotoPreviewUrls, setSalePhotoPreviewUrls: saleMgr.setSalePhotoPreviewUrls,
    uploadingSaleFiles: saleMgr.uploadingSaleFiles,
    saleDocuments: saleMgr.saleDocuments, setSaleDocuments: saleMgr.setSaleDocuments,
    saleDocumentNames: saleMgr.saleDocumentNames, setSaleDocumentNames: saleMgr.setSaleDocumentNames,
    passwordForm, setPasswordForm, changingPassword, setChangingPassword,
    isRealEstateSector, isApproved, activeTab, setActiveTab,
    handleCreateService, handleCreateJobOffer,
    handleRentalPhotoSelect: rentalMgr.handleRentalPhotoSelect,
    removeRentalPhoto: rentalMgr.removeRentalPhoto,
    handleCreateRentalStep1: rentalMgr.handleCreateRentalStep1,
    handleCreateRentalStep2: rentalMgr.handleCreateRentalStep2,
    deleteRental: rentalMgr.deleteRental,
    handleSalePhotoSelect: saleMgr.handleSalePhotoSelect,
    removeSalePhoto: saleMgr.removeSalePhoto,
    handleSaleDocumentSelect: saleMgr.handleSaleDocumentSelect,
    removeSaleDocument: saleMgr.removeSaleDocument,
    toggleSaleFeature: saleMgr.toggleSaleFeature,
    handleCreateSaleStep1: saleMgr.handleCreateSaleStep1,
    handleCreateSaleStep2: saleMgr.handleCreateSaleStep2,
    deleteSale: saleMgr.deleteSale,
    handleDocumentUpload, toggleOnlineStatus,
    getDocumentStatus, docStatus, handleLogout,
    COMPANY_SECTORS, CONTRACT_TYPES, API, BACKEND_URL,
    getErrorMessage, getImageUrl,
  };

  return (
    <div className="min-h-screen bg-muted">
      <CompanyDashboardHeader
        company={company}
        onToggleOnline={toggleOnlineStatus}
        onLogout={handleLogout}
        onHome={() => navigate('/')}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <CompanyDashboardProfileCard company={company} backendUrl={BACKEND_URL} docStatus={docStatus} />

        <CompanyDashboardTabsNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isRealEstateSector={isRealEstateSector}
          isApproved={isApproved}
          rentals={rentalMgr.rentals}
          sales={saleMgr.sales}
          propertyMessages={propertyMessages}
          interimBadge={interimBadge}
          setRentalStep={rentalMgr.setRentalStep}
          setSaleStep={saleMgr.setSaleStep}
        />

        {activeTab === 'profile' && <CompanyProfileTab {...allTabProps} />}
        {activeTab === 'documents' && (
          <CompanyDocumentsTab company={company} handleDocumentUpload={handleDocumentUpload} BACKEND_URL={BACKEND_URL} />
        )}
        {activeTab === 'services' && (
          <CompanyServicesTab services={services} company={company} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'create-service' && <CompanyCreateServiceTab {...allTabProps} />}
        {activeTab === 'jobs' && (
          <CompanyJobsTab jobOffers={jobOffers} company={company} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'create-job' && <CompanyCreateJobTab {...allTabProps} />}

        {activeTab === 'rentals' && isRealEstateSector && <CompanyRentalsTab {...allTabProps} />}
        {activeTab === 'create-rental' && isRealEstateSector && <CompanyCreateRentalTab {...allTabProps} />}
        {activeTab === 'sales' && isRealEstateSector && <CompanySalesTab {...allTabProps} />}
        {activeTab === 'create-sale' && isRealEstateSector && <CompanyCreateSaleTab {...allTabProps} />}

        {activeTab === 'my-shop' && (
          <MyShop token={localStorage.getItem('companyToken')} apiPrefix="company/shop" />
        )}
        {activeTab === 'property-messages' && isRealEstateSector && (
          <CompanyPropertyMessagesTab propertyMessages={propertyMessages} setPropertyMessages={setPropertyMessages} API={API} />
        )}
        {activeTab === 'stats' && <CompanyStatsTab API={API} />}
        {activeTab === 'interim' && <CompanyInterimTab />}
      </div>
    </div>
  );
};

export default CompanyDashboard;
