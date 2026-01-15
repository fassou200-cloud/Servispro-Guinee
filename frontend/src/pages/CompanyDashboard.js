import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Building2, LogOut, FileText, Upload, Briefcase, Users, MapPin,
  CheckCircle, XCircle, Clock, Phone, Mail, Globe, Plus, Home,
  Eye, AlertTriangle, Shield, User, ExternalLink, Trash2, Edit,
  DollarSign, Calendar, Building, Bath, Car, Trees, Waves, X
} from 'lucide-react';
import axios from 'axios';
import { getErrorMessage } from '@/utils/helpers';
import CommissionRatesCard from '@/components/CommissionRatesCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COMPANY_SECTORS = [
  { value: 'Construction', label: 'Construction & BTP' },
  { value: 'Transport', label: 'Transport & Logistique' },
  { value: 'Nettoyage', label: 'Nettoyage & Entretien' },
  { value: 'Securite', label: 'Sécurité & Gardiennage' },
  { value: 'Informatique', label: 'Informatique & Technologie' },
  { value: 'Restauration', label: 'Restauration & Hôtellerie' },
  { value: 'Immobilier', label: 'Immobilier' },
  { value: 'Commerce', label: 'Commerce & Distribution' },
  { value: 'Agriculture', label: 'Agriculture & Agroalimentaire' },
  { value: 'Industrie', label: 'Industrie & Manufacture' },
  { value: 'Services', label: 'Services aux Entreprises' },
  { value: 'Autres', label: 'Autres' }
];

const CONTRACT_TYPES = [
  { value: 'CDI', label: 'CDI - Contrat à Durée Indéterminée' },
  { value: 'CDD', label: 'CDD - Contrat à Durée Déterminée' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Freelance', label: 'Freelance / Consultant' },
  { value: 'Interim', label: 'Intérim' }
];

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [services, setServices] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [sales, setSales] = useState([]);

  // Service form state
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    category: '',
    price_min: '',
    price_max: '',
    duration: '',
    location: ''
  });

  // Job offer form state
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    contract_type: '',
    salary_min: '',
    salary_max: '',
    deadline: ''
  });

  // Rental form state (for real estate companies)
  const [rentalForm, setRentalForm] = useState({
    property_type: 'Apartment',
    title: '',
    description: '',
    location: '',
    rental_price: '',
    rental_type: 'long_term',
    price_per_night: '',
    min_nights: '1',
    max_guests: '',
    amenities: [],
    is_available: true
  });
  const [rentalStep, setRentalStep] = useState(1);
  const [createdRentalId, setCreatedRentalId] = useState(null);
  const [rentalPhotos, setRentalPhotos] = useState([]);
  const [rentalPhotoPreviewUrls, setRentalPhotoPreviewUrls] = useState([]);
  const [uploadingRentalFiles, setUploadingRentalFiles] = useState(false);

  // Sale form state (for real estate companies)
  const [saleForm, setSaleForm] = useState({
    property_type: 'Maison',
    title: '',
    description: '',
    location: '',
    sale_price: '',
    surface_area: '',
    num_rooms: '',
    num_bathrooms: '',
    has_garage: false,
    has_garden: false,
    has_pool: false,
    year_built: '',
    features: [],
    is_negotiable: true
  });
  const [saleStep, setSaleStep] = useState(1);
  const [createdSaleId, setCreatedSaleId] = useState(null);
  const [salePhotos, setSalePhotos] = useState([]);
  const [salePhotoPreviewUrls, setSalePhotoPreviewUrls] = useState([]);
  const [uploadingSaleFiles, setUploadingSaleFiles] = useState(false);

  // Check if company is in real estate sector
  const isRealEstateSector = company?.sector === 'Immobilier';
  const isApproved = company?.verification_status === 'approved';

  // Fetch company profile
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const token = localStorage.getItem('companyToken');
        if (!token) {
          navigate('/company/auth');
          return;
        }

        const response = await axios.get(`${API}/company/profile/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCompany(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('companyToken');
          navigate('/company/auth');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();
  }, [navigate]);

  // Fetch services and job offers
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('companyToken');
      if (!token) return;

      try {
        const [servicesRes, jobsRes] = await Promise.all([
          axios.get(`${API}/company/services/my`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/company/job-offers/my`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setServices(servicesRes.data);
        setJobOffers(jobsRes.data);

        // Fetch rentals and sales for real estate companies
        if (company?.sector === 'Immobilier') {
          const [rentalsRes, salesRes] = await Promise.all([
            axios.get(`${API}/company/rentals/my`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/company/property-sales/my`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setRentals(rentalsRes.data);
          setSales(salesRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (company) fetchData();
  }, [company]);

  const handleLogout = () => {
    localStorage.removeItem('companyToken');
    localStorage.removeItem('company');
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const toggleOnlineStatus = async (checked) => {
    try {
      const token = localStorage.getItem('companyToken');
      await axios.put(`${API}/company/profile/me`, 
        { online_status: checked },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompany({ ...company, online_status: checked });
      toast.success(checked ? 'Vous êtes maintenant en ligne' : 'Vous êtes maintenant hors ligne');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDocumentUpload = async (docType, file) => {
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop grand (max 10MB)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('companyToken');

    try {
      if (docType === 'logo') {
        await axios.post(`${API}/company/upload-logo`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post(`${API}/company/upload-document/${docType}`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      }
      
      // Refresh profile
      const res = await axios.get(`${API}/company/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
      setCompany(res.data);
      toast.success('Document téléchargé avec succès');
    } catch (error) {
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
        is_available: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Service créé avec succès');
      setShowServiceForm(false);
      setServiceForm({ title: '', description: '', category: '', price_min: '', price_max: '', duration: '', location: '' });
      
      // Refresh services
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
        is_active: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Offre publiée avec succès');
      setShowJobForm(false);
      setJobForm({ title: '', description: '', requirements: '', location: '', contract_type: '', salary_min: '', salary_max: '', deadline: '' });
      
      // Refresh job offers
      const res = await axios.get(`${API}/company/job-offers/my`, { headers: { Authorization: `Bearer ${token}` } });
      setJobOffers(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la création'));
    }
  };

  // ==================== RENTAL FUNCTIONS (for real estate companies) ====================
  
  const handleRentalPhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} est trop grande (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setRentalPhotos([...rentalPhotos, ...validFiles]);
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setRentalPhotoPreviewUrls([...rentalPhotoPreviewUrls, ...newPreviewUrls]);
    toast.success(`${validFiles.length} photo(s) ajoutée(s)`);
  };

  const removeRentalPhoto = (index) => {
    const newPhotos = rentalPhotos.filter((_, i) => i !== index);
    const newPreviews = rentalPhotoPreviewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(rentalPhotoPreviewUrls[index]);
    setRentalPhotos(newPhotos);
    setRentalPhotoPreviewUrls(newPreviews);
  };

  const handleCreateRentalStep1 = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('companyToken');

    try {
      const response = await axios.post(`${API}/company/rentals`, {
        ...rentalForm,
        rental_price: parseFloat(rentalForm.rental_price) || 0,
        price_per_night: rentalForm.rental_type === 'short_term' ? parseFloat(rentalForm.price_per_night) : null,
        min_nights: rentalForm.rental_type === 'short_term' ? parseInt(rentalForm.min_nights) : 1,
        max_guests: rentalForm.max_guests ? parseInt(rentalForm.max_guests) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCreatedRentalId(response.data.id);
      toast.success('Annonce créée ! Ajoutez maintenant les photos.');
      setRentalStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la création'));
    }
  };

  const handleCreateRentalStep2 = async () => {
    if (!createdRentalId) return;
    
    setUploadingRentalFiles(true);
    const token = localStorage.getItem('companyToken');

    try {
      // Upload photos
      for (const photo of rentalPhotos) {
        const photoFormData = new FormData();
        photoFormData.append('file', photo);

        await axios.post(`${API}/company/rentals/${createdRentalId}/upload-photo`, photoFormData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      toast.success('Location publiée avec succès !');
      
      // Reset form
      setRentalForm({
        property_type: 'Apartment',
        title: '',
        description: '',
        location: '',
        rental_price: '',
        rental_type: 'long_term',
        price_per_night: '',
        min_nights: '1',
        max_guests: '',
        amenities: [],
        is_available: true
      });
      setRentalPhotos([]);
      setRentalPhotoPreviewUrls([]);
      setRentalStep(1);
      setCreatedRentalId(null);
      setActiveTab('rentals');
      
      // Refresh rentals
      const res = await axios.get(`${API}/company/rentals/my`, { headers: { Authorization: `Bearer ${token}` } });
      setRentals(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de l\'upload des photos'));
    } finally {
      setUploadingRentalFiles(false);
    }
  };

  const deleteRental = async (rentalId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
    
    const token = localStorage.getItem('companyToken');
    try {
      await axios.delete(`${API}/company/rentals/${rentalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Annonce supprimée');
      setRentals(rentals.filter(r => r.id !== rentalId));
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ==================== SALE FUNCTIONS (for real estate companies) ====================
  
  const handleSalePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} est trop grande (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setSalePhotos([...salePhotos, ...validFiles]);
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setSalePhotoPreviewUrls([...salePhotoPreviewUrls, ...newPreviewUrls]);
    toast.success(`${validFiles.length} photo(s) ajoutée(s)`);
  };

  const removeSalePhoto = (index) => {
    const newPhotos = salePhotos.filter((_, i) => i !== index);
    const newPreviews = salePhotoPreviewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(salePhotoPreviewUrls[index]);
    setSalePhotos(newPhotos);
    setSalePhotoPreviewUrls(newPreviews);
  };

  const toggleSaleFeature = (featureId) => {
    setSaleForm(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handleCreateSaleStep1 = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('companyToken');

    try {
      const response = await axios.post(`${API}/company/property-sales`, {
        ...saleForm,
        sale_price: parseInt(saleForm.sale_price) || 0,
        num_rooms: saleForm.num_rooms ? parseInt(saleForm.num_rooms) : null,
        num_bathrooms: saleForm.num_bathrooms ? parseInt(saleForm.num_bathrooms) : null,
        year_built: saleForm.year_built ? parseInt(saleForm.year_built) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCreatedSaleId(response.data.id);
      toast.success('Propriété créée ! Ajoutez maintenant les photos.');
      setSaleStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la création'));
    }
  };

  const handleCreateSaleStep2 = async () => {
    if (!createdSaleId) return;
    
    setUploadingSaleFiles(true);
    const token = localStorage.getItem('companyToken');

    try {
      // Upload photos
      for (const photo of salePhotos) {
        const photoFormData = new FormData();
        photoFormData.append('file', photo);

        await axios.post(`${API}/company/property-sales/${createdSaleId}/upload-photo`, photoFormData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      toast.success('Propriété publiée avec succès !');
      
      // Reset form
      setSaleForm({
        property_type: 'Maison',
        title: '',
        description: '',
        location: '',
        sale_price: '',
        surface_area: '',
        num_rooms: '',
        num_bathrooms: '',
        has_garage: false,
        has_garden: false,
        has_pool: false,
        year_built: '',
        features: [],
        is_negotiable: true
      });
      setSalePhotos([]);
      setSalePhotoPreviewUrls([]);
      setSaleStep(1);
      setCreatedSaleId(null);
      setActiveTab('sales');
      
      // Refresh sales
      const res = await axios.get(`${API}/company/property-sales/my`, { headers: { Authorization: `Bearer ${token}` } });
      setSales(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de l\'upload des photos'));
    } finally {
      setUploadingSaleFiles(false);
    }
  };

  const deleteSale = async (saleId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette propriété ?')) return;
    
    const token = localStorage.getItem('companyToken');
    try {
      await axios.delete(`${API}/company/property-sales/${saleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Propriété supprimée');
      setSales(sales.filter(s => s.id !== saleId));
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getDocumentStatus = () => {
    if (!company) return { complete: 0, total: 4 };
    const docs = [
      company.licence_exploitation,
      company.rccm_document,
      company.nif_document,
      company.attestation_fiscale
    ];
    const complete = docs.filter(Boolean).length;
    return { complete, total: 4 };
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

  return (
    <div className="min-h-screen bg-muted">
      {/* Header - Same style as Agent Immobilier */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
                <Home className="h-4 w-4" />
                Accueil
              </Button>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Espace Entreprise
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Label htmlFor="online-status" className="font-heading text-xs uppercase tracking-wide">
                  {company.online_status ? 'En ligne' : 'Hors ligne'}
                </Label>
                <Switch
                  id="online-status"
                  checked={company.online_status}
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

      {/* Pending Verification Banner */}
      {company.verification_status === 'pending' && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-amber-800 font-medium">Votre entreprise est en attente de validation</p>
                <p className="text-amber-600 text-sm">
                  Vous pourrez publier des services et offres d'emploi une fois approuvé par notre équipe.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {company.verification_status === 'rejected' && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">Votre entreprise a été rejetée</p>
                <p className="text-red-600 text-sm">
                  Veuillez vérifier vos documents et contacter le support.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Commission Rates Info */}
        {company.verification_status === 'approved' && (
          <div className="mb-6">
            <CommissionRatesCard sector={company.sector} />
          </div>
        )}

        {/* Profile Summary - Same style as Agent Immobilier */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 ring-4 ring-primary/20">
              <AvatarImage src={company.logo ? `${BACKEND_URL}${company.logo}` : undefined} />
              <AvatarFallback className="text-2xl font-heading bg-primary text-primary-foreground">
                <Building2 className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-heading font-bold text-foreground">
                  {company.company_name}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  company.verification_status === 'approved' 
                    ? 'bg-green-100 text-green-700' 
                    : company.verification_status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {company.verification_status === 'approved' ? 'Approuvée' : 
                   company.verification_status === 'rejected' ? 'Rejetée' : 'En attente'}
                </span>
              </div>
              <p className="text-muted-foreground">{company.sector}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {company.city}, {company.region}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {company.phone_number}
                </span>
                {company.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {company.email}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Documents</div>
              <div className="text-2xl font-bold text-primary">{docStatus.complete}/{docStatus.total}</div>
            </div>
          </div>
        </Card>

        {/* Tabs - Same style as Agent Immobilier */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button 
            variant={activeTab === 'profile' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('profile')} 
            className="gap-2"
            data-testid="tab-profile"
          >
            <User className="h-4 w-4" /> Profil
          </Button>
          <Button 
            variant={activeTab === 'documents' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('documents')} 
            className="gap-2"
            data-testid="tab-documents"
          >
            <FileText className="h-4 w-4" /> Documents
          </Button>
          
          {/* Real Estate Company Tabs - Only for Immobilier sector */}
          {isRealEstateSector && (
            <>
              <Button 
                variant={activeTab === 'rentals' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('rentals')} 
                className="gap-2 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                data-testid="tab-rentals"
              >
                <Home className="h-4 w-4 text-emerald-600" /> Locations ({rentals.length})
              </Button>
              <Button 
                variant={activeTab === 'create-rental' ? 'default' : 'outline'} 
                onClick={() => { setActiveTab('create-rental'); setRentalStep(1); }}
                className="gap-2 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                disabled={!isApproved}
                data-testid="tab-create-rental"
              >
                <Plus className="h-4 w-4 text-emerald-600" /> + Location
              </Button>
              <Button 
                variant={activeTab === 'sales' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('sales')} 
                className="gap-2 bg-orange-50 border-orange-200 hover:bg-orange-100"
                data-testid="tab-sales"
              >
                <Building className="h-4 w-4 text-orange-600" /> Ventes ({sales.length})
              </Button>
              <Button 
                variant={activeTab === 'create-sale' ? 'default' : 'outline'} 
                onClick={() => { setActiveTab('create-sale'); setSaleStep(1); }}
                className="gap-2 bg-orange-50 border-orange-200 hover:bg-orange-100"
                disabled={!isApproved}
                data-testid="tab-create-sale"
              >
                <Plus className="h-4 w-4 text-orange-600" /> + Vendre
              </Button>
            </>
          )}
          
          <Button 
            variant={activeTab === 'services' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('services')} 
            className="gap-2"
            data-testid="tab-services"
          >
            <Briefcase className="h-4 w-4" /> Services
          </Button>
          <Button 
            variant={activeTab === 'create-service' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('create-service')} 
            className="gap-2"
            disabled={!isApproved}
            data-testid="tab-create-service"
          >
            <Plus className="h-4 w-4" /> + Service
          </Button>
          <Button 
            variant={activeTab === 'jobs' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('jobs')} 
            className="gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100"
            data-testid="tab-jobs"
          >
            <Users className="h-4 w-4 text-blue-600" /> Offres Emploi
          </Button>
          <Button 
            variant={activeTab === 'create-job' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('create-job')} 
            className="gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100"
            disabled={!isApproved}
            data-testid="tab-create-job"
          >
            <Plus className="h-4 w-4 text-blue-600" /> + Offre
          </Button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card className="p-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
              Informations de l'Entreprise
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground text-sm">Nom de l'Entreprise</Label>
                <p className="text-foreground font-medium text-lg">{company.company_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Secteur d'Activité</Label>
                <p className="text-foreground font-medium">{company.sector}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Numéro RCCM</Label>
                <p className="text-foreground font-mono">{company.rccm_number}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Numéro NIF</Label>
                <p className="text-foreground font-mono">{company.nif_number || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-muted-foreground text-sm">Adresse</Label>
                <p className="text-foreground">{company.address}, {company.city}, {company.region}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Téléphone</Label>
                <p className="text-foreground">{company.phone_number}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Email</Label>
                <p className="text-foreground">{company.email || '-'}</p>
              </div>
              {company.website && (
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground text-sm">Site Web</Label>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    {company.website} <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
              <div className="md:col-span-2">
                <Label className="text-muted-foreground text-sm">Description</Label>
                <p className="text-foreground">{company.description}</p>
              </div>
            </div>

            {/* Contact Person */}
            <div className="mt-8 p-6 bg-muted rounded-xl">
              <h4 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personne de Contact
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Nom</Label>
                  <p className="text-foreground font-medium">{company.contact_person_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Téléphone</Label>
                  <p className="text-foreground">{company.contact_person_phone}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <Card className="p-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Documents de l'Entreprise
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo */}
              <DocumentUploadCard
                title="Logo de l'Entreprise"
                document={company.logo}
                docType="logo"
                onUpload={handleDocumentUpload}
                isImage
              />

              {/* Licence */}
              <DocumentUploadCard
                title="Licence d'Exploitation"
                document={company.licence_exploitation}
                docType="licence_exploitation"
                onUpload={handleDocumentUpload}
                required
              />

              {/* RCCM */}
              <DocumentUploadCard
                title="Document RCCM"
                document={company.rccm_document}
                docType="rccm_document"
                onUpload={handleDocumentUpload}
                required
              />

              {/* NIF */}
              <DocumentUploadCard
                title="Document NIF"
                document={company.nif_document}
                docType="nif_document"
                onUpload={handleDocumentUpload}
              />

              {/* Attestation Fiscale */}
              <DocumentUploadCard
                title="Attestation de Régularité Fiscale"
                document={company.attestation_fiscale}
                docType="attestation_fiscale"
                onUpload={handleDocumentUpload}
              />
            </div>

            {/* Additional Documents */}
            {company.documents_additionnels && company.documents_additionnels.length > 0 && (
              <div className="mt-8">
                <h4 className="font-heading font-bold text-foreground mb-4">Autres Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {company.documents_additionnels.map((doc, idx) => (
                    <a
                      key={idx}
                      href={`${BACKEND_URL}${doc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors flex items-center gap-3"
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-foreground">Document {idx + 1}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-heading font-bold text-foreground">
                Mes Services ({services.length})
              </h3>
            </div>

            {services.length === 0 ? (
              <Card className="p-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun service publié</p>
                {company.verification_status === 'approved' && (
                  <Button className="mt-4" onClick={() => setActiveTab('create-service')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un service
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map(service => (
                  <Card key={service.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-heading font-bold text-foreground">{service.title}</h4>
                        <p className="text-sm text-muted-foreground">{service.category}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${service.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {service.is_available ? 'Disponible' : 'Indisponible'}
                      </span>
                    </div>
                    <p className="text-foreground text-sm mb-4 line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <MapPin className="h-4 w-4" />
                        {service.location}
                      </div>
                      <div className="text-primary font-bold">
                        {service.price_min && service.price_max 
                          ? `${service.price_min.toLocaleString()} - ${service.price_max.toLocaleString()} GNF`
                          : 'Prix sur devis'}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Service Tab */}
        {activeTab === 'create-service' && (
          <Card className="p-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
              Créer un Nouveau Service
            </h3>

            {company.verification_status !== 'approved' ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Vous devez être approuvé pour publier des services.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateService} className="space-y-6">
                <div className="space-y-2">
                  <Label>Titre du Service *</Label>
                  <Input
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                    required
                    placeholder="Ex: Construction de bâtiments"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Catégorie *</Label>
                  <Select value={serviceForm.category} onValueChange={(v) => setServiceForm({ ...serviceForm, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SECTORS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    required
                    rows={4}
                    placeholder="Décrivez votre service..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prix Minimum (GNF)</Label>
                    <Input
                      type="number"
                      value={serviceForm.price_min}
                      onChange={(e) => setServiceForm({ ...serviceForm, price_min: e.target.value })}
                      placeholder="100000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix Maximum (GNF)</Label>
                    <Input
                      type="number"
                      value={serviceForm.price_max}
                      onChange={(e) => setServiceForm({ ...serviceForm, price_max: e.target.value })}
                      placeholder="500000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Localisation *</Label>
                  <Input
                    value={serviceForm.location}
                    onChange={(e) => setServiceForm({ ...serviceForm, location: e.target.value })}
                    required
                    placeholder="Conakry, Guinée"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Créer le Service
                </Button>
              </form>
            )}
          </Card>
        )}

        {/* Job Offers Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-heading font-bold text-foreground">
                Mes Offres d'Emploi ({jobOffers.length})
              </h3>
            </div>

            {jobOffers.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune offre d'emploi publiée</p>
                {company.verification_status === 'approved' && (
                  <Button className="mt-4" onClick={() => setActiveTab('create-job')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Publier une offre
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                {jobOffers.map(job => (
                  <Card key={job.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-heading font-bold text-foreground">{job.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-primary font-medium">{job.contract_type}</span>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${job.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">{job.applications_count} candidature(s)</p>
                      </div>
                    </div>
                    <p className="text-foreground text-sm mb-4 line-clamp-2">{job.description}</p>
                    <div className="flex items-center justify-between">
                      {job.deadline && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Date limite: {new Date(job.deadline).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {job.salary_min && job.salary_max && (
                        <span className="text-primary font-bold">
                          {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()} GNF
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Job Offer Tab */}
        {activeTab === 'create-job' && (
          <Card className="p-8">
            <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
              Publier une Offre d'Emploi
            </h3>

            {company.verification_status !== 'approved' ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Vous devez être approuvé pour publier des offres d'emploi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateJobOffer} className="space-y-6">
                <div className="space-y-2">
                  <Label>Titre du Poste *</Label>
                  <Input
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    required
                    placeholder="Ex: Ingénieur Civil"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type de Contrat *</Label>
                  <Select value={jobForm.contract_type} onValueChange={(v) => setJobForm({ ...jobForm, contract_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le type de contrat" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description du Poste *</Label>
                  <Textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    required
                    rows={4}
                    placeholder="Décrivez les responsabilités et missions..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Exigences / Qualifications *</Label>
                  <Textarea
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                    required
                    rows={3}
                    placeholder="Ex: Bac+5 en génie civil, 3 ans d'expérience..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salaire Minimum (GNF/mois)</Label>
                    <Input
                      type="number"
                      value={jobForm.salary_min}
                      onChange={(e) => setJobForm({ ...jobForm, salary_min: e.target.value })}
                      placeholder="3000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salaire Maximum (GNF/mois)</Label>
                    <Input
                      type="number"
                      value={jobForm.salary_max}
                      onChange={(e) => setJobForm({ ...jobForm, salary_max: e.target.value })}
                      placeholder="5000000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Localisation *</Label>
                    <Input
                      value={jobForm.location}
                      onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      required
                      placeholder="Conakry, Guinée"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Limite de Candidature</Label>
                    <Input
                      type="date"
                      value={jobForm.deadline}
                      onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Publier l'Offre
                </Button>
              </form>
            )}
          </Card>
        )}

        {/* ==================== REAL ESTATE TABS (Immobilier only) ==================== */}

        {/* Rentals List Tab */}
        {activeTab === 'rentals' && isRealEstateSector && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-heading font-bold text-foreground">
                Mes Locations ({rentals.length})
              </h3>
              {isApproved && (
                <Button onClick={() => setActiveTab('create-rental')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4" /> Nouvelle Location
                </Button>
              )}
            </div>

            {rentals.length === 0 ? (
              <Card className="p-8 text-center">
                <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune location publiée</p>
                {isApproved && (
                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setActiveTab('create-rental')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une annonce
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rentals.map(rental => (
                  <Card key={rental.id} className="overflow-hidden">
                    {rental.photos && rental.photos.length > 0 && (
                      <img 
                        src={`${BACKEND_URL}${rental.photos[0]}`} 
                        alt={rental.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                            {rental.property_type}
                          </span>
                          <h4 className="text-lg font-heading font-bold text-foreground mt-2">{rental.title}</h4>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {/* Approval Status Badge */}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rental.approval_status === 'approved' 
                              ? 'bg-green-100 text-green-700' 
                              : rental.approval_status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {rental.approval_status === 'approved' ? (
                              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approuvée</span>
                            ) : rental.approval_status === 'rejected' ? (
                              <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejetée</span>
                            ) : (
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> En attente</span>
                            )}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${rental.is_available ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                            {rental.is_available ? 'Disponible' : 'Indisponible'}
                          </span>
                        </div>
                      </div>
                      <p className="text-foreground text-sm mb-4 line-clamp-2">{rental.description}</p>
                      
                      {/* Rejection Reason if rejected */}
                      {rental.approval_status === 'rejected' && rental.rejection_reason && (
                        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <strong>Raison:</strong> {rental.rejection_reason}
                        </div>
                      )}
                      
                      {/* Pending notice */}
                      {(!rental.approval_status || rental.approval_status === 'pending') && (
                        <div className="mb-4 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          En attente d'approbation admin
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {rental.location}
                        </span>
                        <span className="text-emerald-600 font-bold">
                          {rental.rental_price?.toLocaleString()} GNF/mois
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-1" /> Voir
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => deleteRental(rental.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Rental Tab */}
        {activeTab === 'create-rental' && isRealEstateSector && (
          <Card className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <Home className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold text-foreground">
                  Créer une Annonce de Location
                </h3>
                <p className="text-muted-foreground">Étape {rentalStep}/2 - {rentalStep === 1 ? 'Informations' : 'Photos'}</p>
              </div>
            </div>

            {!isApproved ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Vous devez être approuvé pour publier des locations.
                </p>
              </div>
            ) : rentalStep === 1 ? (
              <form onSubmit={handleCreateRentalStep1} className="space-y-6">
                <div className="space-y-2">
                  <Label>Type de Propriété *</Label>
                  <Select value={rentalForm.property_type} onValueChange={(v) => setRentalForm({ ...rentalForm, property_type: v })}>
                    <SelectTrigger data-testid="rental-property-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apartment">Appartement</SelectItem>
                      <SelectItem value="House">Maison</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="Chambre">Chambre d'Hôtes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Titre de l'Annonce *</Label>
                  <Input
                    value={rentalForm.title}
                    onChange={(e) => setRentalForm({ ...rentalForm, title: e.target.value })}
                    required
                    placeholder="Ex: Bel appartement meublé à Kipé"
                    data-testid="rental-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={rentalForm.description}
                    onChange={(e) => setRentalForm({ ...rentalForm, description: e.target.value })}
                    required
                    rows={4}
                    placeholder="Décrivez votre propriété..."
                    data-testid="rental-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Localisation *</Label>
                  <Input
                    value={rentalForm.location}
                    onChange={(e) => setRentalForm({ ...rentalForm, location: e.target.value })}
                    required
                    placeholder="Quartier, Commune, Ville"
                    data-testid="rental-location"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type de Location *</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={rentalForm.rental_type === 'long_term' ? 'default' : 'outline'}
                      onClick={() => setRentalForm({ ...rentalForm, rental_type: 'long_term' })}
                      className="h-12"
                    >
                      Longue Durée
                    </Button>
                    <Button
                      type="button"
                      variant={rentalForm.rental_type === 'short_term' ? 'default' : 'outline'}
                      onClick={() => setRentalForm({ ...rentalForm, rental_type: 'short_term' })}
                      className="h-12"
                    >
                      Courte Durée
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prix Mensuel (GNF) *</Label>
                    <Input
                      type="number"
                      value={rentalForm.rental_price}
                      onChange={(e) => setRentalForm({ ...rentalForm, rental_price: e.target.value })}
                      required
                      placeholder="500000"
                      data-testid="rental-price"
                    />
                  </div>
                  {rentalForm.rental_type === 'short_term' && (
                    <div className="space-y-2">
                      <Label>Prix par Nuit (GNF)</Label>
                      <Input
                        type="number"
                        value={rentalForm.price_per_night}
                        onChange={(e) => setRentalForm({ ...rentalForm, price_per_night: e.target.value })}
                        placeholder="50000"
                      />
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full h-14 bg-emerald-600 hover:bg-emerald-700" data-testid="rental-submit-step1">
                  Continuer - Photos
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="font-heading font-bold">Photos de la Propriété</Label>
                  <input
                    id="company-rental-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleRentalPhotoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('company-rental-photos').click()}
                    className="w-full h-14 gap-2 rounded-xl border-dashed border-2"
                  >
                    <Upload className="h-5 w-5" />
                    Ajouter des Photos ({rentalPhotos.length})
                  </Button>
                  
                  {rentalPhotoPreviewUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                      {rentalPhotoPreviewUrls.map((url, index) => (
                        <div key={index} className="relative group aspect-square">
                          <img
                            src={url}
                            alt={`Aperçu ${index + 1}`}
                            className="w-full h-full object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => removeRentalPhoto(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRentalStep(1)}
                    className="flex-1 h-14"
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateRentalStep2}
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700"
                    disabled={uploadingRentalFiles}
                    data-testid="rental-submit-step2"
                  >
                    {uploadingRentalFiles ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Publication...
                      </div>
                    ) : (
                      "Publier l'Annonce"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Sales List Tab */}
        {activeTab === 'sales' && isRealEstateSector && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-heading font-bold text-foreground">
                Mes Ventes ({sales.length})
              </h3>
              {isApproved && (
                <Button onClick={() => setActiveTab('create-sale')} className="gap-2 bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4" /> Nouvelle Vente
                </Button>
              )}
            </div>

            {sales.length === 0 ? (
              <Card className="p-8 text-center">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune propriété en vente</p>
                {isApproved && (
                  <Button className="mt-4 bg-orange-600 hover:bg-orange-700" onClick={() => setActiveTab('create-sale')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une propriété
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sales.map(sale => (
                  <Card key={sale.id} className="overflow-hidden">
                    {sale.photos && sale.photos.length > 0 && (
                      <img 
                        src={`${BACKEND_URL}${sale.photos[0]}`} 
                        alt={sale.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                            {sale.property_type}
                          </span>
                          <h4 className="text-lg font-heading font-bold text-foreground mt-2">{sale.title}</h4>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${sale.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {sale.is_available ? 'Disponible' : 'Vendu'}
                        </span>
                      </div>
                      <p className="text-foreground text-sm mb-4 line-clamp-2">{sale.description}</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {sale.location}
                        </span>
                        <span className="text-orange-600 font-bold">
                          {sale.sale_price?.toLocaleString()} GNF
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {sale.surface_area && <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {sale.surface_area}</span>}
                        {sale.num_rooms && <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {sale.num_rooms} pièces</span>}
                        {sale.has_garage && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> Garage</span>}
                        {sale.has_garden && <span className="flex items-center gap-1"><Trees className="h-3 w-3" /> Jardin</span>}
                      </div>
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-1" /> Voir
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => deleteSale(sale.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Sale Tab */}
        {activeTab === 'create-sale' && isRealEstateSector && (
          <Card className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <Building className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold text-foreground">
                  Vente Immobilière
                </h3>
                <p className="text-muted-foreground">Étape {saleStep}/2 - {saleStep === 1 ? 'Informations' : 'Photos'}</p>
              </div>
            </div>

            {!isApproved ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Vous devez être approuvé pour publier des ventes.
                </p>
              </div>
            ) : saleStep === 1 ? (
              <form onSubmit={handleCreateSaleStep1} className="space-y-6">
                <div className="space-y-2">
                  <Label>Type de Propriété *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'Maison', label: 'Maison', icon: Home },
                      { value: 'Terrain', label: 'Terrain', icon: Trees },
                      { value: 'Appartement', label: 'Appartement', icon: Building },
                      { value: 'Villa', label: 'Villa', icon: Home },
                      { value: 'Immeuble', label: 'Immeuble', icon: Building },
                      { value: 'Bureau', label: 'Bureau/Commerce', icon: Building }
                    ].map((type) => {
                      const Icon = type.icon;
                      return (
                        <Button
                          key={type.value}
                          type="button"
                          variant={saleForm.property_type === type.value ? 'default' : 'outline'}
                          onClick={() => setSaleForm({ ...saleForm, property_type: type.value })}
                          className={`h-16 flex-col gap-1 ${saleForm.property_type === type.value ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Titre de l'Annonce *</Label>
                  <Input
                    value={saleForm.title}
                    onChange={(e) => setSaleForm({ ...saleForm, title: e.target.value })}
                    required
                    placeholder="Ex: Belle villa avec jardin à Kipé"
                    data-testid="sale-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={saleForm.description}
                    onChange={(e) => setSaleForm({ ...saleForm, description: e.target.value })}
                    required
                    rows={4}
                    placeholder="Décrivez votre propriété..."
                    data-testid="sale-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Localisation *</Label>
                  <Input
                    value={saleForm.location}
                    onChange={(e) => setSaleForm({ ...saleForm, location: e.target.value })}
                    required
                    placeholder="Quartier, Commune, Ville"
                    data-testid="sale-location"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prix de Vente (GNF) *</Label>
                    <Input
                      type="number"
                      value={saleForm.sale_price}
                      onChange={(e) => setSaleForm({ ...saleForm, sale_price: e.target.value })}
                      required
                      placeholder="500000000"
                      data-testid="sale-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Surface (m²)</Label>
                    <Input
                      value={saleForm.surface_area}
                      onChange={(e) => setSaleForm({ ...saleForm, surface_area: e.target.value })}
                      placeholder="150 m²"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre de Pièces</Label>
                    <Input
                      type="number"
                      value={saleForm.num_rooms}
                      onChange={(e) => setSaleForm({ ...saleForm, num_rooms: e.target.value })}
                      placeholder="4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salles de Bain</Label>
                    <Input
                      type="number"
                      value={saleForm.num_bathrooms}
                      onChange={(e) => setSaleForm({ ...saleForm, num_bathrooms: e.target.value })}
                      placeholder="2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Année Construction</Label>
                    <Input
                      type="number"
                      value={saleForm.year_built}
                      onChange={(e) => setSaleForm({ ...saleForm, year_built: e.target.value })}
                      placeholder="2020"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Équipements</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={saleForm.has_garage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSaleForm({ ...saleForm, has_garage: !saleForm.has_garage })}
                      className={saleForm.has_garage ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      <Car className="h-4 w-4 mr-1" /> Garage
                    </Button>
                    <Button
                      type="button"
                      variant={saleForm.has_garden ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSaleForm({ ...saleForm, has_garden: !saleForm.has_garden })}
                      className={saleForm.has_garden ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      <Trees className="h-4 w-4 mr-1" /> Jardin
                    </Button>
                    <Button
                      type="button"
                      variant={saleForm.has_pool ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSaleForm({ ...saleForm, has_pool: !saleForm.has_pool })}
                      className={saleForm.has_pool ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      <Waves className="h-4 w-4 mr-1" /> Piscine
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <Label className="font-medium">Prix Négociable</Label>
                    <p className="text-sm text-muted-foreground">
                      {saleForm.is_negotiable ? 'Le prix est négociable' : 'Prix ferme'}
                    </p>
                  </div>
                  <Switch
                    checked={saleForm.is_negotiable}
                    onCheckedChange={(checked) => setSaleForm({ ...saleForm, is_negotiable: checked })}
                  />
                </div>

                <Button type="submit" className="w-full h-14 bg-orange-600 hover:bg-orange-700" data-testid="sale-submit-step1">
                  Continuer - Photos
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="font-heading font-bold">Photos de la Propriété</Label>
                  <input
                    id="company-sale-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleSalePhotoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('company-sale-photos').click()}
                    className="w-full h-14 gap-2 rounded-xl border-dashed border-2"
                  >
                    <Upload className="h-5 w-5" />
                    Ajouter des Photos ({salePhotos.length})
                  </Button>
                  
                  {salePhotoPreviewUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                      {salePhotoPreviewUrls.map((url, index) => (
                        <div key={index} className="relative group aspect-square">
                          <img
                            src={url}
                            alt={`Aperçu ${index + 1}`}
                            className="w-full h-full object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => removeSalePhoto(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSaleStep(1)}
                    className="flex-1 h-14"
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateSaleStep2}
                    className="flex-1 h-14 bg-orange-600 hover:bg-orange-700"
                    disabled={uploadingSaleFiles}
                    data-testid="sale-submit-step2"
                  >
                    {uploadingSaleFiles ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Publication...
                      </div>
                    ) : (
                      "Publier l'Annonce"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

// Document Upload Card Component
const DocumentUploadCard = ({ title, document, docType, onUpload, required, isImage }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    await onUpload(docType, file);
    setUploading(false);
  };

  return (
    <div className="p-6 bg-muted rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className={`h-5 w-5 ${document ? 'text-green-600' : 'text-muted-foreground'}`} />
          <span className="font-medium text-foreground">{title}</span>
          {required && <span className="text-red-500">*</span>}
        </div>
        {document ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {isImage && document && (
        <div className="mb-4">
          <img src={`${BACKEND_URL}${document}`} alt={title} className="h-24 w-24 object-cover rounded-lg" />
        </div>
      )}

      <div className="flex gap-2">
        {document && (
          <a
            href={`${BACKEND_URL}${document}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Voir
            </Button>
          </a>
        )}
        <div className="flex-1">
          <input
            type="file"
            accept={isImage ? "image/*" : ".pdf,.jpg,.jpeg,.png"}
            onChange={handleFileChange}
            className="hidden"
            id={`doc-${docType}`}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => document.getElementById(`doc-${docType}`).click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Envoi...' : document ? 'Remplacer' : 'Télécharger'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
