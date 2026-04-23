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
  DollarSign, Calendar, Building, Bath, Car, Trees, Waves, X, Store, MessageCircle
} from 'lucide-react';
import axios from 'axios';
import { getErrorMessage } from '@/utils/helpers';
import { getImageUrl } from '@/utils/imageUrl';
import CommissionRatesCard from '@/components/CommissionRatesCard';
import MyShop from '@/components/MyShop';
import CompanyProfileTab from '@/components/company/CompanyProfileTab';
import CompanyCreateServiceTab from '@/components/company/CompanyCreateServiceTab';
import CompanyCreateJobTab from '@/components/company/CompanyCreateJobTab';
import CompanyRentalsTab from '@/components/company/CompanyRentalsTab';
import CompanyCreateRentalTab from '@/components/company/CompanyCreateRentalTab';
import CompanySalesTab from '@/components/company/CompanySalesTab';
import CompanyCreateSaleTab from '@/components/company/CompanyCreateSaleTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COMPANY_SECTORS = [
  { value: 'Construction', label: 'Construction & BTP' },
  { value: 'Transport', label: 'Transport & Logistique' },
  { value: 'Nettoyage', label: 'Nettoyage & Entretien' },
  { value: 'Securite', label: 'Sécurité & Gardiennage' },
  { value: 'Informatique', label: 'Informatique & Technologie' },
  { value: 'Restauration', label: 'Restauration & Hôtellerie' },
  { value: 'Immobilier', label: 'Agence Immobilière' },
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
    caution: '',
    mois_avance: '',
    rental_type: 'long_term',
    price_per_night: '',
    min_nights: '1',
    max_guests: '',
    amenities: [],
    is_available: true
  });
  const [rentalStep, setRentalStep] = useState(1);
  const [propertyMessages, setPropertyMessages] = useState([]);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPassword, setChangingPassword] = useState(false);
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
  
  // Sale documents state
  const [saleDocuments, setSaleDocuments] = useState({
    titre_foncier: null,
    document_ministere_habitat: null,
    document_batiment: null,
    documents_additionnels: []
  });
  const [saleDocumentNames, setSaleDocumentNames] = useState({
    titre_foncier: '',
    document_ministere_habitat: '',
    document_batiment: '',
    documents_additionnels: []
  });

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
          const [rentalsRes, salesRes, propertyMsgsRes] = await Promise.all([
            axios.get(`${API}/company/rentals/my`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/company/property-sales/my`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/company/property-messages`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
          ]);
          setRentals(rentalsRes.data);
          setSales(salesRes.data);
          setPropertyMessages(propertyMsgsRes.data);
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
        caution: rentalForm.rental_type === 'long_term' && rentalForm.caution ? parseFloat(rentalForm.caution) : null,
        mois_avance: rentalForm.rental_type === 'long_term' && rentalForm.mois_avance ? parseInt(rentalForm.mois_avance) : null,
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
        caution: '',
        mois_avance: '',
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

  const handleSaleDocumentSelect = (docType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop grand (max 10MB)');
      return;
    }

    if (docType === 'documents_additionnels') {
      setSaleDocuments(prev => ({
        ...prev,
        documents_additionnels: [...prev.documents_additionnels, file]
      }));
      setSaleDocumentNames(prev => ({
        ...prev,
        documents_additionnels: [...prev.documents_additionnels, file.name]
      }));
    } else {
      setSaleDocuments(prev => ({ ...prev, [docType]: file }));
      setSaleDocumentNames(prev => ({ ...prev, [docType]: file.name }));
    }
    
    toast.success('Document ajouté');
  };

  const removeSaleDocument = (docType, index = null) => {
    if (docType === 'documents_additionnels' && index !== null) {
      setSaleDocuments(prev => ({
        ...prev,
        documents_additionnels: prev.documents_additionnels.filter((_, i) => i !== index)
      }));
      setSaleDocumentNames(prev => ({
        ...prev,
        documents_additionnels: prev.documents_additionnels.filter((_, i) => i !== index)
      }));
    } else {
      setSaleDocuments(prev => ({ ...prev, [docType]: null }));
      setSaleDocumentNames(prev => ({ ...prev, [docType]: '' }));
    }
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
    
    // Validate required documents
    if (!saleDocuments.titre_foncier) {
      toast.error('Le Titre Foncier est obligatoire');
      return;
    }
    if (!saleDocuments.document_ministere_habitat) {
      toast.error('Le Document du Ministère de l\'Habitat est obligatoire');
      return;
    }
    if (!saleDocuments.document_batiment) {
      toast.error('Le Document du Bâtiment est obligatoire');
      return;
    }
    
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

      // Upload required documents
      const docTypes = ['titre_foncier', 'document_ministere_habitat', 'document_batiment'];
      for (const docType of docTypes) {
        if (saleDocuments[docType]) {
          const docFormData = new FormData();
          docFormData.append('file', saleDocuments[docType]);

          await axios.post(`${API}/company/property-sales/${createdSaleId}/upload-document/${docType}`, docFormData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      // Upload additional documents
      for (const doc of saleDocuments.documents_additionnels) {
        const docFormData = new FormData();
        docFormData.append('file', doc);

        await axios.post(`${API}/company/property-sales/${createdSaleId}/upload-document/autres_documents`, docFormData, {
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
      setSaleDocuments({
        titre_foncier: null,
        document_ministere_habitat: null,
        document_batiment: null,
        documents_additionnels: []
      });
      setSaleDocumentNames({
        titre_foncier: '',
        document_ministere_habitat: '',
        document_batiment: '',
        documents_additionnels: []
      });
      setSaleStep(1);
      setCreatedSaleId(null);
      setActiveTab('sales');
      
      // Refresh sales
      const res = await axios.get(`${API}/company/property-sales/my`, { headers: { Authorization: `Bearer ${token}` } });
      setSales(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de l\'upload des fichiers'));
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

  // Shared props for tab components
  const allTabProps = {
    company, setCompany, services, setServices, jobOffers, setJobOffers,
    rentals, setRentals, sales, setSales, propertyMessages,
    showServiceForm, setShowServiceForm, serviceForm, setServiceForm,
    showJobForm, setShowJobForm, jobForm, setJobForm,
    rentalForm, setRentalForm, rentalStep, setRentalStep,
    createdRentalId, setCreatedRentalId, rentalPhotos, setRentalPhotos,
    rentalPhotoPreviewUrls, setRentalPhotoPreviewUrls, uploadingRentalFiles,
    saleForm, setSaleForm, saleStep, setSaleStep,
    createdSaleId, setCreatedSaleId, salePhotos, setSalePhotos,
    salePhotoPreviewUrls, setSalePhotoPreviewUrls, uploadingSaleFiles,
    saleDocuments, setSaleDocuments, saleDocumentNames, setSaleDocumentNames,
    passwordForm, setPasswordForm, changingPassword, setChangingPassword,
    isRealEstateSector, isApproved, activeTab, setActiveTab,
    handleCreateService, handleCreateJobOffer,
    handleRentalPhotoSelect, removeRentalPhoto, handleCreateRentalStep1, handleCreateRentalStep2, deleteRental,
    handleSalePhotoSelect, removeSalePhoto, handleSaleDocumentSelect, removeSaleDocument,
    toggleSaleFeature, handleCreateSaleStep1, handleCreateSaleStep2, deleteSale,
    handleDocumentUpload, toggleOnlineStatus,
    getDocumentStatus, docStatus, handleLogout,
    COMPANY_SECTORS, CONTRACT_TYPES, API, BACKEND_URL,
    getErrorMessage, getImageUrl,
  };

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
              <Button 
                variant={activeTab === 'property-messages' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('property-messages')} 
                className="gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100"
                data-testid="tab-property-messages"
              >
                <MessageCircle className="h-4 w-4 text-blue-600" /> Messages ({propertyMessages.filter(m => !m.is_read).length})
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
            variant={activeTab === 'my-shop' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('my-shop')} 
            className={`gap-2 ${activeTab === 'my-shop' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-orange-50 border-orange-200 hover:bg-orange-100'}`}
            data-testid="tab-my-shop"
          >
            <Store className="h-4 w-4 text-orange-500" /> Ma Boutique
          </Button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && <CompanyProfileTab {...allTabProps} />}


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
        {activeTab === 'create-service' && <CompanyCreateServiceTab {...allTabProps} />}


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
        {activeTab === 'create-job' && <CompanyCreateJobTab {...allTabProps} />}


        {/* ==================== REAL ESTATE TABS (Immobilier only) ==================== */}

        {/* Rentals List Tab */}
        {activeTab === 'rentals' && isRealEstateSector && <CompanyRentalsTab {...allTabProps} />}


        {/* Create Rental Tab */}
        {activeTab === 'create-rental' && isRealEstateSector && <CompanyCreateRentalTab {...allTabProps} />}


        {/* Sales List Tab */}
        {activeTab === 'sales' && isRealEstateSector && <CompanySalesTab {...allTabProps} />}


        {/* Create Sale Tab */}
        {activeTab === 'create-sale' && isRealEstateSector && <CompanyCreateSaleTab {...allTabProps} />}


        {/* Ma Boutique */}
        {activeTab === 'my-shop' && (
          <MyShop token={localStorage.getItem('companyToken')} apiPrefix="company/shop" />
        )}

        {/* Property Messages */}
        {activeTab === 'property-messages' && isRealEstateSector && (
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Messages des Clients ({propertyMessages.length})
            </h3>
            {propertyMessages.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun message pour le moment</p>
                <p className="text-gray-400 text-sm">Les clients vous contacteront via vos annonces</p>
              </div>
            ) : (
              <div className="space-y-3">
                {propertyMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`p-4 rounded-xl border ${msg.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${msg.message_type === 'sale' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                          {msg.message_type === 'sale' ? (
                            <Building className="h-4 w-4 text-orange-600" />
                          ) : (
                            <Home className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{msg.sender_name}</p>
                          <a href={`tel:${msg.sender_phone}`} className="text-xs text-blue-600 hover:underline">{msg.sender_phone}</a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${msg.message_type === 'sale' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {msg.message_type === 'sale' ? 'Vente' : 'Location'}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    {msg.rental_title && (
                      <p className="text-xs text-gray-500 mb-1">Annonce: {msg.rental_title || msg.property_info}</p>
                    )}
                    <p className="text-sm text-gray-700">{msg.message}</p>
                    {!msg.is_read && (
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('companyToken');
                            await axios.put(`${API}/company/property-messages/${msg.id}/read`, {}, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            setPropertyMessages(prev => prev.map(m => m.id === msg.id ? {...m, is_read: true} : m));
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="mt-2 text-xs text-blue-600 hover:underline"
                      >
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                ))}
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
