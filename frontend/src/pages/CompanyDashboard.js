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
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
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
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
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
          >
            <User className="h-4 w-4" /> Profil
          </Button>
          <Button 
            variant={activeTab === 'documents' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('documents')} 
            className="gap-2"
          >
            <FileText className="h-4 w-4" /> Documents
          </Button>
          <Button 
            variant={activeTab === 'services' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('services')} 
            className="gap-2"
          >
            <Briefcase className="h-4 w-4" /> Services
          </Button>
          <Button 
            variant={activeTab === 'create-service' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('create-service')} 
            className="gap-2"
            disabled={company.verification_status !== 'approved'}
          >
            <Plus className="h-4 w-4" /> + Service
          </Button>
          <Button 
            variant={activeTab === 'jobs' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('jobs')} 
            className="gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100"
          >
            <Users className="h-4 w-4 text-blue-600" /> Offres Emploi
          </Button>
          <Button 
            variant={activeTab === 'create-job' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('create-job')} 
            className="gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100"
            disabled={company.verification_status !== 'approved'}
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
