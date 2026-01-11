import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Building2, FileText, Upload, Eye, EyeOff, ArrowLeft, ArrowRight,
  CheckCircle, AlertTriangle, User, Phone, Mail, Globe, MapPin,
  Briefcase, Shield, Lock
} from 'lucide-react';
import axios from 'axios';
import { GUINEA_LOCATIONS, getVillesByRegion, getRegions } from '../data/guineaLocations';

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

const CompanyAuth = ({ setIsCompanyAuthenticated }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdCompanyId, setCreatedCompanyId] = useState(null);
  
  // Login form
  const [loginData, setLoginData] = useState({
    rccm_number: '',
    password: ''
  });
  
  // Register form
  const [formData, setFormData] = useState({
    company_name: '',
    rccm_number: '',
    nif_number: '',
    sector: '',
    address: '',
    region: '',
    city: '',
    phone_number: '',
    email: '',
    website: '',
    description: '',
    password: '',
    confirm_password: '',
    contact_person_name: '',
    contact_person_phone: ''
  });

  // Documents state
  const [documents, setDocuments] = useState({
    logo: null,
    licence_exploitation: null,
    rccm_document: null,
    nif_document: null,
    attestation_fiscale: null,
    documents_additionnels: []
  });
  const [documentNames, setDocumentNames] = useState({
    logo: '',
    licence_exploitation: '',
    rccm_document: '',
    nif_document: '',
    attestation_fiscale: '',
    documents_additionnels: []
  });

  // Get cities based on region
  const getCities = () => {
    if (!formData.region) return [];
    // Find the region by name to get its id
    const regionObj = getRegions().find(r => r.name === formData.region);
    if (!regionObj) return [];
    return getVillesByRegion(regionObj.id);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/company/login`, loginData);
      localStorage.setItem('companyToken', response.data.token);
      localStorage.setItem('company', JSON.stringify(response.data.user));
      toast.success('Connexion réussie !');
      if (setIsCompanyAuthenticated) setIsCompanyAuthenticated(true);
      navigate('/company/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/company/register`, {
        company_name: formData.company_name,
        rccm_number: formData.rccm_number,
        nif_number: formData.nif_number || null,
        sector: formData.sector,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        phone_number: formData.phone_number,
        email: formData.email || null,
        website: formData.website || null,
        description: formData.description,
        password: formData.password,
        contact_person_name: formData.contact_person_name,
        contact_person_phone: formData.contact_person_phone
      });

      localStorage.setItem('companyToken', response.data.token);
      localStorage.setItem('company', JSON.stringify(response.data.user));
      setCreatedCompanyId(response.data.user.id);
      toast.success('Entreprise créée ! Veuillez télécharger vos documents.');
      setCurrentStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec de inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelect = (docType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop grand (max 10MB)');
      return;
    }

    if (docType === 'documents_additionnels') {
      setDocuments(prev => ({
        ...prev,
        documents_additionnels: [...prev.documents_additionnels, file]
      }));
      setDocumentNames(prev => ({
        ...prev,
        documents_additionnels: [...prev.documents_additionnels, file.name]
      }));
    } else {
      setDocuments(prev => ({ ...prev, [docType]: file }));
      setDocumentNames(prev => ({ ...prev, [docType]: file.name }));
    }
    
    toast.success('Document ajouté');
  };

  const removeDocument = (docType, index = null) => {
    if (docType === 'documents_additionnels' && index !== null) {
      setDocuments(prev => ({
        ...prev,
        documents_additionnels: prev.documents_additionnels.filter((_, i) => i !== index)
      }));
      setDocumentNames(prev => ({
        ...prev,
        documents_additionnels: prev.documents_additionnels.filter((_, i) => i !== index)
      }));
    } else {
      setDocuments(prev => ({ ...prev, [docType]: null }));
      setDocumentNames(prev => ({ ...prev, [docType]: '' }));
    }
  };

  const handleUploadDocuments = async () => {
    setLoading(true);
    const token = localStorage.getItem('companyToken');

    try {
      // Upload logo
      if (documents.logo) {
        const logoFormData = new FormData();
        logoFormData.append('file', documents.logo);
        await axios.post(`${API}/company/upload-logo`, logoFormData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      }

      // Upload other documents
      for (const [docType, file] of Object.entries(documents)) {
        if (docType === 'logo') continue; // Already handled
        
        if (docType === 'documents_additionnels') {
          for (const additionalFile of file) {
            const docFormData = new FormData();
            docFormData.append('file', additionalFile);
            await axios.post(`${API}/company/upload-document/${docType}`, docFormData, {
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
          }
        } else if (file) {
          const docFormData = new FormData();
          docFormData.append('file', file);
          await axios.post(`${API}/company/upload-document/${docType}`, docFormData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      toast.success('Documents téléchargés avec succès !');
      if (setIsCompanyAuthenticated) setIsCompanyAuthenticated(true);
      navigate('/company/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec du téléchargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipDocuments = () => {
    toast.info('Vous pourrez ajouter vos documents plus tard dans votre profil.');
    if (setIsCompanyAuthenticated) setIsCompanyAuthenticated(true);
    navigate('/company/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'accueil
        </Button>
      </div>

      <div className="flex items-center justify-center min-h-screen py-20 px-4">
        <Card className="w-full max-w-2xl p-8 bg-slate-800/50 border-slate-700 backdrop-blur">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-heading font-bold text-white text-center mb-2">
            Espace Entreprise
          </h1>
          <p className="text-slate-400 text-center mb-8">
            {isLogin ? 'Connectez-vous à votre compte entreprise' : 
             currentStep === 1 ? 'Créez votre profil entreprise' : 'Téléchargez vos documents'}
          </p>

          {/* Tab Switch (only for step 1) */}
          {currentStep === 1 && (
            <div className="flex gap-2 p-1 bg-slate-700/50 rounded-xl mb-8">
              <Button
                type="button"
                variant={isLogin ? 'default' : 'ghost'}
                onClick={() => setIsLogin(true)}
                className={`flex-1 ${isLogin ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-400 hover:text-white'}`}
              >
                Connexion
              </Button>
              <Button
                type="button"
                variant={!isLogin ? 'default' : 'ghost'}
                onClick={() => setIsLogin(false)}
                className={`flex-1 ${!isLogin ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-400 hover:text-white'}`}
              >
                Inscription
              </Button>
            </div>
          )}

          {/* Step indicator for registration */}
          {!isLogin && (
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                  {currentStep > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
                </div>
                <span className="text-sm hidden sm:inline">Informations</span>
              </div>
              <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-slate-700'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                  2
                </div>
                <span className="text-sm hidden sm:inline">Documents</span>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLogin && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rccm_login" className="text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  Numéro RCCM *
                </Label>
                <Input
                  id="rccm_login"
                  name="rccm_number"
                  value={loginData.rccm_number}
                  onChange={(e) => setLoginData({ ...loginData, rccm_number: e.target.value })}
                  required
                  className="h-12 bg-slate-700/50 border-slate-600 text-white"
                  placeholder="RCCM/GC/XXXX"
                  data-testid="company-login-rccm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_login" className="text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  Mot de passe *
                </Label>
                <div className="relative">
                  <Input
                    id="password_login"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="h-12 bg-slate-700/50 border-slate-600 text-white pr-12"
                    data-testid="company-login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-lg"
                disabled={loading}
                data-testid="company-login-submit"
              >
                {loading ? 'Connexion...' : 'Se Connecter'}
              </Button>
            </form>
          )}

          {/* REGISTER STEP 1 - Company Information */}
          {!isLogin && currentStep === 1 && (
            <form onSubmit={handleRegisterStep1} className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  Nom de lentreprise *
                </Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                  className="h-12 bg-slate-700/50 border-slate-600 text-white"
                  placeholder="Ex: SARL Alpha Services"
                  data-testid="company-name-input"
                />
              </div>

              {/* RCCM & NIF */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    Numéro RCCM *
                  </Label>
                  <Input
                    value={formData.rccm_number}
                    onChange={(e) => setFormData({ ...formData, rccm_number: e.target.value })}
                    required
                    className="h-12 bg-slate-700/50 border-slate-600 text-white"
                    placeholder="RCCM/GC/XXXX"
                    data-testid="company-rccm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-400" />
                    Numéro NIF
                  </Label>
                  <Input
                    value={formData.nif_number}
                    onChange={(e) => setFormData({ ...formData, nif_number: e.target.value })}
                    className="h-12 bg-slate-700/50 border-slate-600 text-white"
                    placeholder="NIF-XXXXXXX"
                    data-testid="company-nif-input"
                  />
                </div>
              </div>

              {/* Sector */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-400" />
                  Secteur dactivité *
                </Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value) => setFormData({ ...formData, sector: value })}
                >
                  <SelectTrigger className="h-12 bg-slate-700/50 border-slate-600 text-white" data-testid="company-sector-select">
                    <SelectValue placeholder="Sélectionnez un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SECTORS.map(sector => (
                      <SelectItem key={sector.value} value={sector.value}>{sector.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region & City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    Région *
                  </Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData({ ...formData, region: value, city: '' })}
                  >
                    <SelectTrigger className="h-12 bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRegions().map(region => (
                        <SelectItem key={region.id} value={region.name}>{region.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Ville *</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                    disabled={!formData.region}
                  >
                    <SelectTrigger className="h-12 bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCities().map(city => (
                        <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label className="text-slate-300">Adresse du siège *</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="h-12 bg-slate-700/50 border-slate-600 text-white"
                  placeholder="Quartier, Rue, Immeuble..."
                />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-400" />
                    Téléphone entreprise *
                  </Label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    required
                    className="h-12 bg-slate-700/50 border-slate-600 text-white"
                    placeholder="6XX XX XX XX"
                    data-testid="company-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 bg-slate-700/50 border-slate-600 text-white"
                    placeholder="contact@entreprise.com"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  Site web
                </Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="h-12 bg-slate-700/50 border-slate-600 text-white"
                  placeholder="https://www.exemple.com"
                />
              </div>

              {/* Contact Person */}
              <div className="p-4 bg-slate-700/30 rounded-xl space-y-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  Personne de contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Nom complet *</Label>
                    <Input
                      value={formData.contact_person_name}
                      onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                      required
                      className="h-12 bg-slate-700/50 border-slate-600 text-white"
                      placeholder="Prénom Nom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Téléphone *</Label>
                    <Input
                      value={formData.contact_person_phone}
                      onChange={(e) => setFormData({ ...formData, contact_person_phone: e.target.value })}
                      required
                      className="h-12 bg-slate-700/50 border-slate-600 text-white"
                      placeholder="6XX XX XX XX"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-slate-300">Description de lentreprise *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="bg-slate-700/50 border-slate-600 text-white resize-none"
                  placeholder="Décrivez votre entreprise, vos services, votre expérience..."
                />
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-400" />
                    Mot de passe *
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-12 bg-slate-700/50 border-slate-600 text-white pr-12"
                      data-testid="company-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Confirmer le mot de passe *</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    required
                    className="h-12 bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-lg"
                disabled={loading}
                data-testid="company-register-submit"
              >
                {loading ? 'Création en cours...' : (
                  <>
                    Continuer <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* REGISTER STEP 2 - Documents Upload */}
          {!isLogin && currentStep === 2 && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-400">Documents Requis</h4>
                  <p className="text-sm text-amber-200/80">
                    Les documents légaux sont nécessaires pour la validation de votre entreprise par notre équipe.
                  </p>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  Logo de lentreprise
                </Label>
                <input
                  id="company-logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDocumentSelect('logo', e)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('company-logo').click()}
                  className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {documentNames.logo || 'Choisir le logo'}
                </Button>
              </div>

              {/* Required Documents */}
              <div className="space-y-4 p-4 bg-slate-700/30 rounded-xl">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Documents Légaux
                </h3>

                {/* Licence */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Licence dexploitation *</Label>
                  <input
                    id="licence-doc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentSelect('licence_exploitation', e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('licence-doc').click()}
                    className="w-full h-11 border-slate-600 text-slate-300 hover:bg-slate-700 justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {documentNames.licence_exploitation || 'Choisir le fichier'}
                  </Button>
                </div>

                {/* RCCM Document */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Document RCCM *</Label>
                  <input
                    id="rccm-doc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentSelect('rccm_document', e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('rccm-doc').click()}
                    className="w-full h-11 border-slate-600 text-slate-300 hover:bg-slate-700 justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {documentNames.rccm_document || 'Choisir le fichier'}
                  </Button>
                </div>

                {/* NIF Document */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Document NIF</Label>
                  <input
                    id="nif-doc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentSelect('nif_document', e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('nif-doc').click()}
                    className="w-full h-11 border-slate-600 text-slate-300 hover:bg-slate-700 justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {documentNames.nif_document || 'Choisir le fichier'}
                  </Button>
                </div>

                {/* Attestation Fiscale */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Attestation de Régularité Fiscale</Label>
                  <input
                    id="attestation-doc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentSelect('attestation_fiscale', e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('attestation-doc').click()}
                    className="w-full h-11 border-slate-600 text-slate-300 hover:bg-slate-700 justify-start"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {documentNames.attestation_fiscale || 'Choisir le fichier'}
                  </Button>
                </div>

                {/* Additional Documents */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Autres Documents</Label>
                  <input
                    id="additional-docs"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentSelect('documents_additionnels', e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('additional-docs').click()}
                    className="w-full h-11 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Ajouter un document
                  </Button>
                  {documentNames.documents_additionnels.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {documentNames.documents_additionnels.map((name, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-600/50 rounded">
                          <span className="text-sm text-slate-300 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            {name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument('documents_additionnels', index)}
                            className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipDocuments}
                  className="flex-1 h-14 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Passer pour linstant
                </Button>
                <Button
                  type="button"
                  onClick={handleUploadDocuments}
                  className="flex-1 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold"
                  disabled={loading}
                >
                  {loading ? 'Téléchargement...' : 'Terminer linscription'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CompanyAuth;
