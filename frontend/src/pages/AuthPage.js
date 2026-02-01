import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, ArrowRight, User, Phone, Lock, Eye, EyeOff, Briefcase, Shield, 
  Sparkles, MapPin, FileText, Upload, X, CheckCircle, Image
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getRegions, getVillesByRegion, getCommunesByVille } from '@/data/guineaLocations';
import { getProfessionGroups, getProfessionsByGroup } from '@/data/professions';
import { getErrorMessage } from '@/utils/helpers';
import ForgotPassword from '@/components/ForgotPassword';
import TermsConditionsModal from '@/components/TermsConditionsModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthPage = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Multi-step registration
  const [registrationStep, setRegistrationStep] = useState(1);
  const [documents, setDocuments] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  
  // Profession selection
  const [professionGroup, setProfessionGroup] = useState('');
  const [availableProfessions, setAvailableProfessions] = useState([]);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    profession_group: '',
    profession: '',
    years_experience: '',
    region: '',
    ville: '',
    commune: '',
    quartier: '',
    about: ''
  });

  // Location options based on selections
  const [villes, setVilles] = useState([]);
  const [communes, setCommunes] = useState([]);

  // Profession groups
  const professionGroups = getProfessionGroups();

  // Update available professions when group changes
  useEffect(() => {
    if (professionGroup) {
      setAvailableProfessions(getProfessionsByGroup(professionGroup));
      setFormData(prev => ({ ...prev, profession: '', profession_group: professionGroup }));
    } else {
      setAvailableProfessions([]);
    }
  }, [professionGroup]);

  // Update villes when region changes
  useEffect(() => {
    if (formData.region) {
      setVilles(getVillesByRegion(formData.region));
      setFormData(prev => ({ ...prev, ville: '', commune: '', quartier: '' }));
      setCommunes([]);
    }
  }, [formData.region]);

  // Update communes when ville changes
  useEffect(() => {
    if (formData.region && formData.ville) {
      setCommunes(getCommunesByVille(formData.region, formData.ville));
      setFormData(prev => ({ ...prev, commune: '', quartier: '' }));
    }
  }, [formData.ville]);

  // Validate that text doesn't contain phone numbers or emails
  const containsContactInfo = (text) => {
    if (!text) return false;
    
    // Phone number patterns (various formats)
    const phonePatterns = [
      /\+?\d{3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}/g,  // +224 XXX XX XX XX
      /\d{9,}/g,  // 9+ consecutive digits
      /\d{2,4}[\s.-]\d{2,4}[\s.-]\d{2,4}/g,  // XX-XX-XX-XX format
      /(?:zéro|zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)[\s]+(?:zéro|zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)/gi, // Numbers written in words
    ];
    
    // Email pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    // Check for phone numbers
    for (const pattern of phonePatterns) {
      if (pattern.test(text)) {
        return { found: true, type: 'phone' };
      }
    }
    
    // Check for email
    if (emailPattern.test(text)) {
      return { found: true, type: 'email' };
    }
    
    // Check for common contact phrases
    const contactPhrases = [
      /appel[ez]?[\s-]*moi/gi,
      /contact[ez]?[\s-]*moi/gi,
      /mon[\s]+(numéro|numero|tel|téléphone|telephone|mail|email|e-mail)/gi,
      /whatsapp/gi,
      /telegram/gi,
    ];
    
    for (const phrase of contactPhrases) {
      if (phrase.test(text)) {
        return { found: true, type: 'contact_phrase' };
      }
    }
    
    return { found: false };
  };

  // Validate Step 1 before proceeding
  const validateStep1 = () => {
    if (!formData.first_name.trim()) {
      toast.error('Veuillez entrer votre prénom');
      return false;
    }
    if (!formData.last_name.trim()) {
      toast.error('Veuillez entrer votre nom');
      return false;
    }
    if (!professionGroup) {
      toast.error('Veuillez sélectionner un groupe de métier');
      return false;
    }
    if (!formData.profession) {
      toast.error('Veuillez sélectionner votre métier');
      return false;
    }
    if (!formData.years_experience) {
      toast.error('Veuillez sélectionner vos années d\'expérience');
      return false;
    }
    if (!formData.region || !formData.ville || !formData.commune) {
      toast.error('Veuillez compléter votre localisation');
      return false;
    }
    if (!formData.phone_number.trim()) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    if (!termsAccepted) {
      toast.error('Vous devez accepter les Conditions Générales d\'Utilisation');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setRegistrationStep(2);
    }
  };

  const handlePreviousStep = () => {
    setRegistrationStep(1);
  };

  // Handle document upload
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    files.forEach(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} est trop volumineux (max 5MB)`);
        return;
      }
      
      if (documents.length >= 5) {
        toast.error('Maximum 5 documents autorisés');
        return;
      }
      
      setDocuments(prev => [...prev, file]);
    });
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle profile photo upload
  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        toast.error('La photo est trop volumineuse (max 2MB)');
        return;
      }
      setProfilePhoto(file);
    }
  };

  const removeProfilePhoto = () => {
    setProfilePhoto(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login flow
      setLoading(true);
      try {
        const response = await axios.post(`${API}/auth/login`, {
          phone_number: formData.phone_number,
          password: formData.password,
          user_type: 'provider'
        });
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        toast.success(`Bienvenue ${response.data.user.first_name} !`);
        setIsAuthenticated(true);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Une erreur est survenue'));
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Registration flow - Step 2 submit
    
    // Validate "About" field doesn't contain contact information
    const contactCheck = containsContactInfo(formData.about);
    if (contactCheck.found) {
      if (contactCheck.type === 'phone') {
        toast.error('La section "À propos" ne doit pas contenir de numéro de téléphone. Cela est contraire aux règles de la plateforme.');
      } else if (contactCheck.type === 'email') {
        toast.error('La section "À propos" ne doit pas contenir d\'adresse email. Cela est contraire aux règles de la plateforme.');
      } else {
        toast.error('La section "À propos" ne doit pas contenir d\'informations de contact. Cela est contraire aux règles de la plateforme.');
      }
      return;
    }
    
    setLoading(true);

    try {
      // Build location string
      const locationParts = [];
      if (formData.quartier) locationParts.push(formData.quartier);
      if (formData.commune) {
        const communeObj = communes.find(c => c.id === formData.commune);
        if (communeObj) locationParts.push(communeObj.name);
      }
      if (formData.ville) {
        const villeObj = villes.find(v => v.id === formData.ville);
        if (villeObj) locationParts.push(villeObj.name);
      }
      if (formData.region) {
        const regionObj = getRegions().find(r => r.id === formData.region);
        if (regionObj) locationParts.push(regionObj.name);
      }

      // Get profession display name
      const selectedProfession = availableProfessions.find(p => p.id === formData.profession);
      const professionName = selectedProfession ? selectedProfession.name : formData.profession;
      
      // Get group display name
      const selectedGroup = professionGroups.find(g => g.id === professionGroup);
      const groupName = selectedGroup ? selectedGroup.name : professionGroup;
      
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('first_name', formData.first_name);
      submitData.append('last_name', formData.last_name);
      submitData.append('phone_number', formData.phone_number);
      submitData.append('password', formData.password);
      submitData.append('profession', professionName);
      submitData.append('profession_group', groupName);
      submitData.append('years_experience', formData.years_experience);
      submitData.append('custom_profession', '');
      submitData.append('location', locationParts.join(', '));
      submitData.append('region', formData.region);
      submitData.append('ville', formData.ville);
      submitData.append('commune', formData.commune);
      submitData.append('quartier', formData.quartier || '');
      submitData.append('about', formData.about || '');
      
      // Add profile photo
      if (profilePhoto) {
        submitData.append('profile_photo', profilePhoto);
      }
      
      // Add documents
      documents.forEach((doc) => {
        submitData.append(`documents`, doc);
      });

      const response = await axios.post(`${API}/auth/register`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Inscription réussie ! Bienvenue sur ServisPro.');
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const features = [
    { icon: Briefcase, text: 'Gérez vos demandes de service' },
    { icon: Shield, text: 'Profil professionnel vérifié' },
    { icon: Sparkles, text: 'Augmentez votre visibilité' }
  ];

  const regions = getRegions();

  // Reset form when switching between login/register
  const resetForm = () => {
    setFormData({ 
      first_name: '', last_name: '', phone_number: '', password: '', 
      profession_group: '', profession: '', years_experience: '', region: '', ville: '', 
      commune: '', quartier: '', about: '' 
    });
    setProfessionGroup('');
    setAvailableProfessions([]);
    setTermsAccepted(false);
    setRegistrationStep(1);
    setDocuments([]);
    setProfilePhoto(null);
  };

  // Show Forgot Password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <ForgotPassword 
          userType="provider" 
          onBack={() => setShowForgotPassword(false)}
          onSuccess={() => setShowForgotPassword(false)}
        />
      </div>
    );
  }

  // Check if immobilier profession selected
  const isImmobilier = professionGroup === 'immobilier';

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${
        isImmobilier 
          ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600' 
          : 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'
      }`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-300 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-3xl font-bold">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">ServisPro</h1>
              <p className="text-sm opacity-80">Guinée 🇬🇳</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-heading font-bold mb-6">
            {isImmobilier ? 'Espace Propriétaire Immobilier' : 'Espace Prestataire'}
          </h2>
          <p className="text-xl opacity-90 mb-10 leading-relaxed">
            {isImmobilier 
              ? 'Publiez vos biens immobiliers et trouvez des locataires ou acheteurs en Guinée.'
              : 'Rejoignez la première plateforme de services professionnels en Guinée. Développez votre activité et trouvez de nouveaux clients.'
            }
          </p>
          
          <div className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-lg">{feature.text}</span>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm opacity-80">Prestataires</div>
            </div>
            <div>
              <div className="text-3xl font-bold">2000+</div>
              <div className="text-sm opacity-80">Services</div>
            </div>
            <div>
              <div className="text-3xl font-bold">4.8</div>
              <div className="text-sm opacity-80">Note Moyenne</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md my-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'Accueil
          </Button>

          <Card className="p-8 rounded-3xl shadow-xl border-0 bg-white">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-heading font-bold text-slate-900">
                Espace Prestataire
              </h1>
            </div>

            <div className="text-center mb-8 hidden lg:block">
              <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2">
                {isLogin ? 'Connexion' : `Inscription - Étape ${registrationStep}/2`}
              </h1>
              <p className="text-slate-500">
                {isLogin 
                  ? 'Accédez à votre espace prestataire' 
                  : registrationStep === 1 
                    ? 'Informations de base' 
                    : 'Complétez votre profil'
                }
              </p>
            </div>

            {/* Progress indicator for registration */}
            {!isLogin && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  registrationStep >= 1 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {registrationStep > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
                </div>
                <div className={`w-12 h-1 rounded ${registrationStep >= 2 ? 'bg-orange-500' : 'bg-slate-200'}`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  registrationStep >= 2 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  2
                </div>
              </div>
            )}

            {/* Toggle Login/Register - Only show in Step 1 or Login mode */}
            {(isLogin || registrationStep === 1) && (
              <div className="flex gap-2 mb-8 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); resetForm(); }}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    isLogin 
                      ? 'bg-white text-slate-900 shadow-md' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); resetForm(); }}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    !isLogin 
                      ? 'bg-white text-slate-900 shadow-md' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Inscription
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* LOGIN FORM */}
              {isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number" className="text-slate-700 font-medium text-sm">
                      Numéro de Téléphone *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="phone_number"
                        name="phone_number"
                        data-testid="auth-phone-input"
                        value={formData.phone_number}
                        onChange={handleChange}
                        required
                        className="h-12 pl-10 rounded-xl border-slate-200 font-mono"
                        placeholder="+224 620 00 00 00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                      Mot de Passe *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        data-testid="auth-password-input"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="h-12 pl-10 pr-12 rounded-xl border-slate-200"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    data-testid="auth-submit-button"
                    className="w-full h-12 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-500/30"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Veuillez patienter...
                      </div>
                    ) : 'Se Connecter'}
                  </Button>
                </>
              )}

              {/* REGISTRATION STEP 1 */}
              {!isLogin && registrationStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-slate-700 font-medium text-sm">
                        Prénom *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="first_name"
                          name="first_name"
                          data-testid="register-first-name-input"
                          value={formData.first_name}
                          onChange={handleChange}
                          className="h-12 pl-10 rounded-xl border-slate-200"
                          placeholder="Jean"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="text-slate-700 font-medium text-sm">
                        Nom *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="last_name"
                          name="last_name"
                          data-testid="register-last-name-input"
                          value={formData.last_name}
                          onChange={handleChange}
                          className="h-12 pl-10 rounded-xl border-slate-200"
                          placeholder="Dupont"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profession Group & Profession - Two Dropdowns */}
                  <div className="space-y-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-2 text-slate-700 font-medium text-sm mb-2">
                      <Briefcase className="h-4 w-4 text-orange-500" />
                      Profession
                    </div>
                    
                    {/* Profession Group Dropdown */}
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Groupe de métier *</Label>
                      <Select
                        value={professionGroup}
                        onValueChange={(value) => setProfessionGroup(value)}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Sélectionnez un groupe de métier" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[300px]">
                          {professionGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id} className="rounded-lg">
                              <div className="flex items-center gap-2">
                                <span>{group.icon}</span>
                                <span>{group.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Specific Profession Dropdown */}
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Métier spécifique *</Label>
                      <Select
                        value={formData.profession}
                        onValueChange={(value) => setFormData({ ...formData, profession: value })}
                        disabled={!professionGroup}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder={professionGroup ? "Sélectionnez votre métier" : "Choisissez d'abord un groupe"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[300px]">
                          {availableProfessions.map((profession) => (
                            <SelectItem key={profession.id} value={profession.id} className="rounded-lg">
                              {profession.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Years of Experience */}
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Années d'expérience *</Label>
                      <Select
                        value={formData.years_experience}
                        onValueChange={(value) => setFormData({ ...formData, years_experience: value })}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Sélectionnez vos années d'expérience" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="0-1" className="rounded-lg">Moins d'1 an</SelectItem>
                          <SelectItem value="1-2" className="rounded-lg">1 - 2 ans</SelectItem>
                          <SelectItem value="2-5" className="rounded-lg">2 - 5 ans</SelectItem>
                          <SelectItem value="5-10" className="rounded-lg">5 - 10 ans</SelectItem>
                          <SelectItem value="10-15" className="rounded-lg">10 - 15 ans</SelectItem>
                          <SelectItem value="15-20" className="rounded-lg">15 - 20 ans</SelectItem>
                          <SelectItem value="20+" className="rounded-lg">Plus de 20 ans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Location Section */}
                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-700 font-medium text-sm mb-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      Localisation
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Région *</Label>
                        <Select
                          value={formData.region}
                          onValueChange={(value) => setFormData({ ...formData, region: value })}
                        >
                          <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                            <SelectValue placeholder="Région" />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map((region) => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Ville *</Label>
                        <Select
                          value={formData.ville}
                          onValueChange={(value) => setFormData({ ...formData, ville: value })}
                          disabled={!formData.region}
                        >
                          <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                            <SelectValue placeholder="Ville" />
                          </SelectTrigger>
                          <SelectContent>
                            {villes.map((ville) => (
                              <SelectItem key={ville.id} value={ville.id}>
                                {ville.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Commune *</Label>
                        <Select
                          value={formData.commune}
                          onValueChange={(value) => setFormData({ ...formData, commune: value })}
                          disabled={!formData.ville}
                        >
                          <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                            <SelectValue placeholder="Commune" />
                          </SelectTrigger>
                          <SelectContent>
                            {communes.map((commune) => (
                              <SelectItem key={commune.id} value={commune.id}>
                                {commune.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Quartier</Label>
                        <Input
                          type="text"
                          value={formData.quartier}
                          onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                          placeholder="Entrez votre quartier"
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number" className="text-slate-700 font-medium text-sm">
                      Numéro de Téléphone *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="phone_number"
                        name="phone_number"
                        data-testid="auth-phone-input"
                        value={formData.phone_number}
                        onChange={handleChange}
                        className="h-12 pl-10 rounded-xl border-slate-200 font-mono"
                        placeholder="+224 620 00 00 00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                      Mot de Passe *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        data-testid="auth-password-input"
                        value={formData.password}
                        onChange={handleChange}
                        className="h-12 pl-10 pr-12 rounded-xl border-slate-200"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Checkbox 
                      id="terms-provider"
                      checked={termsAccepted}
                      onCheckedChange={setTermsAccepted}
                      className="mt-0.5 border-orange-500 data-[state=checked]:bg-orange-500"
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor="terms-provider" 
                        className="text-sm text-slate-700 cursor-pointer"
                      >
                        J'accepte les{' '}
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-orange-600 hover:text-orange-700 underline font-medium inline-flex items-center gap-1"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Conditions Générales d'Utilisation
                        </button>
                      </label>
                      <p className="text-xs text-slate-500 mt-1">
                        Vous devez accepter les CGU pour créer votre compte
                      </p>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    onClick={handleNextStep}
                    className="w-full h-12 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-500/30"
                  >
                    <span className="flex items-center gap-2">
                      Continuer
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </Button>
                </>
              )}

              {/* REGISTRATION STEP 2 */}
              {!isLogin && registrationStep === 2 && (
                <>
                  {/* Profile Photo Upload */}
                  <div className="space-y-3">
                    <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
                      <Image className="h-4 w-4 text-orange-500" />
                      Photo de profil (optionnel)
                    </Label>
                    
                    {profilePhoto ? (
                      <div className="relative w-24 h-24 mx-auto">
                        <img 
                          src={URL.createObjectURL(profilePhoto)} 
                          alt="Profile preview" 
                          className="w-24 h-24 rounded-full object-cover border-4 border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={removeProfilePhoto}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-24 h-24 mx-auto rounded-full border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                        <User className="h-8 w-8 text-slate-400" />
                        <span className="text-xs text-slate-500 mt-1">Ajouter</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* About Section */}
                  <div className="space-y-2">
                    <Label htmlFor="about" className="text-slate-700 font-medium text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-500" />
                      À propos de vous
                    </Label>
                    <Textarea
                      id="about"
                      name="about"
                      value={formData.about}
                      onChange={handleChange}
                      className="min-h-[120px] rounded-xl border-slate-200 resize-none"
                      placeholder="Décrivez votre expérience, vos compétences et vos services..."
                    />
                    <p className="text-xs text-slate-500">
                      Une bonne description augmente vos chances d'être contacté
                    </p>
                  </div>

                  {/* Documents Upload */}
                  <div className="space-y-3">
                    <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
                      <Upload className="h-4 w-4 text-orange-500" />
                      Documents justificatifs (optionnel)
                    </Label>
                    <p className="text-xs text-slate-500">
                      Ajoutez des certificats, diplômes ou attestations pour renforcer votre crédibilité
                    </p>
                    
                    {/* Upload Zone */}
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-600 font-medium">Cliquez pour ajouter des documents</span>
                      <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (max 5MB par fichier)</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleDocumentUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Uploaded Documents List */}
                    {documents.length > 0 && (
                      <div className="space-y-2">
                        {documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <FileText className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700 truncate max-w-[180px]">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {(doc.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocument(index)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handlePreviousStep}
                      className="flex-1 h-12 font-heading font-bold text-base rounded-xl"
                    >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      Retour
                    </Button>
                    <Button 
                      type="submit"
                      data-testid="auth-submit-button"
                      className="flex-1 h-12 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-500/30"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Création...
                        </div>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Créer mon compte
                        </span>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>

            {/* Footer links - Only in Login or Step 1 */}
            {(isLogin || registrationStep === 1) && (
              <>
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500">
                    {isLogin ? "Pas encore inscrit ?" : "Déjà inscrit ?"}
                    <button
                      type="button"
                      data-testid="auth-toggle-button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        resetForm();
                      }}
                      className="ml-1 text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {isLogin ? "Créez un compte" : "Connectez-vous"}
                    </button>
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-500">
                    Vous êtes un client ?
                    <button
                      type="button"
                      onClick={() => navigate('/customer/auth')}
                      className="ml-1 text-green-600 hover:text-green-700 font-medium"
                    >
                      Espace Client
                    </button>
                  </p>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      <TermsConditionsModal 
        open={showTermsModal}
        onOpenChange={setShowTermsModal}
        onAccept={() => setTermsAccepted(true)}
      />
    </div>
  );
};

export default AuthPage;
