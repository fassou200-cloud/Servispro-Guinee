import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, User, Phone, Lock, Eye, EyeOff, Briefcase, Shield, 
  Sparkles, Wrench, Home, Zap, Settings, MapPin, FileText
} from 'lucide-react';
// Note: Truck import removed as Logisticien category was removed
import { toast } from 'sonner';
import axios from 'axios';
import { getRegions, getVillesByRegion, getCommunesByVille } from '@/data/guineaLocations';
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
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    profession: '',
    custom_profession: '',
    region: '',
    ville: '',
    commune: '',
    quartier: ''
  });

  // Location options based on selections
  const [villes, setVilles] = useState([]);
  const [communes, setCommunes] = useState([]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check terms acceptance for registration
    if (!isLogin && !termsAccepted) {
      toast.error('Vous devez accepter les Conditions Générales d\'Utilisation pour créer un compte');
      return;
    }
    
    setLoading(true);

    try {
      const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
      
      // Build location string for registration
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
      
      const payload = isLogin 
        ? { phone_number: formData.phone_number, password: formData.password, user_type: 'provider' }
        : {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone_number: formData.phone_number,
            password: formData.password,
            profession: formData.profession,
            custom_profession: formData.profession === 'Autres' ? formData.custom_profession : '',
            location: locationParts.join(', '),
            region: formData.region,
            ville: formData.ville,
            commune: formData.commune,
            quartier: formData.quartier
          };

      const response = await axios.post(endpoint, payload);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success(isLogin ? `Bienvenue ${response.data.user.first_name} !` : 'Inscription réussie !');
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

  const professions = [
    { value: 'Electromecanicien', label: 'Électromécanicien', icon: Settings },
    { value: 'Mecanicien', label: 'Mécanicien', icon: Wrench },
    { value: 'Plombier', label: 'Plombier', icon: Zap },
    { value: 'Macon', label: 'Maçon', icon: Home },
    { value: 'Menuisier', label: 'Menuisier', icon: Home },
    { value: 'AgentImmobilier', label: 'Propriétaire immobilier', icon: Home },
    { value: 'Soudeur', label: 'Soudeur', icon: Zap },
    { value: 'Autres', label: 'Autres Métiers', icon: Briefcase },
  ];

  const features = [
    { icon: Briefcase, text: 'Gérez vos demandes de service' },
    { icon: Shield, text: 'Profil professionnel vérifié' },
    { icon: Sparkles, text: 'Augmentez votre visibilité' }
  ];

  const regions = getRegions();

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

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${
        formData.profession === 'AgentImmobilier' 
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
            {formData.profession === 'AgentImmobilier' ? 'Espace Propriétaire Immobilier' : 'Espace Prestataire'}
          </h2>
          <p className="text-xl opacity-90 mb-10 leading-relaxed">
            {formData.profession === 'AgentImmobilier' 
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
                {isLogin ? 'Connexion' : 'Inscription'}
              </h1>
              <p className="text-slate-500">
                {isLogin ? 'Accédez à votre espace prestataire' : 'Créez votre profil professionnel'}
              </p>
            </div>

            {/* Toggle Login/Register */}
            <div className="flex gap-2 mb-8 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
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
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  !isLogin 
                    ? 'bg-white text-slate-900 shadow-md' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Inscription
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
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
                          required={!isLogin}
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
                          required={!isLogin}
                          className="h-12 pl-10 rounded-xl border-slate-200"
                          placeholder="Dupont"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profession" className="text-slate-700 font-medium text-sm">
                      Profession *
                    </Label>
                    <Select
                      value={formData.profession}
                      onValueChange={(value) => setFormData({ ...formData, profession: value, custom_profession: '' })}
                      required={!isLogin}
                    >
                      <SelectTrigger data-testid="register-profession-select" className="h-12 rounded-xl border-slate-200">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-slate-400" />
                          <SelectValue placeholder="Sélectionnez votre profession" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {professions.map((profession) => {
                          const Icon = profession.icon;
                          return (
                            <SelectItem key={profession.value} value={profession.value} className="rounded-lg">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {profession.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Profession Field - Only shows when "Autres" is selected */}
                  {formData.profession === 'Autres' && (
                    <div className="space-y-2">
                      <Label htmlFor="custom_profession" className="text-slate-700 font-medium text-sm">
                        Précisez votre métier *
                      </Label>
                      <Input
                        id="custom_profession"
                        name="custom_profession"
                        value={formData.custom_profession}
                        onChange={(e) => setFormData({ ...formData, custom_profession: e.target.value })}
                        required
                        className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                        placeholder="Ex: Coiffeur, Photographe, Peintre..."
                      />
                    </div>
                  )}

                  {/* Location Section */}
                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-700 font-medium text-sm mb-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      Localisation
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Region */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Région *</Label>
                        <Select
                          value={formData.region}
                          onValueChange={(value) => setFormData({ ...formData, region: value })}
                          required={!isLogin}
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

                      {/* Ville */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Ville *</Label>
                        <Select
                          value={formData.ville}
                          onValueChange={(value) => setFormData({ ...formData, ville: value })}
                          disabled={!formData.region}
                          required={!isLogin}
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

                      {/* Commune */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Commune *</Label>
                        <Select
                          value={formData.commune}
                          onValueChange={(value) => setFormData({ ...formData, commune: value })}
                          disabled={!formData.ville}
                          required={!isLogin}
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

                      {/* Quartier - Plain text input */}
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
                </>
              )}

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
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>

              {/* Terms and Conditions for Registration */}
              {!isLogin && (
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
              )}

              <Button 
                type="submit" 
                data-testid="auth-submit-button"
                className="w-full h-12 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-500/30"
                disabled={loading || (!isLogin && !termsAccepted)}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Veuillez patienter...
                  </div>
                ) : (
                  isLogin ? 'Se Connecter' : 'Créer mon Compte'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                {isLogin ? "Pas encore inscrit ?" : "Déjà inscrit ?"}
                <button
                  type="button"
                  data-testid="auth-toggle-button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setTermsAccepted(false);
                    setFormData({ first_name: '', last_name: '', phone_number: '', password: '', profession: '', custom_profession: '', region: '', ville: '', commune: '', quartier: '' });
                  }}
                  className="ml-1 text-orange-600 hover:text-orange-700 font-medium"
                >
                  {isLogin ? "Créez un compte" : "Connectez-vous"}
                </button>
              </p>
            </div>

            {/* Link to Customer Auth */}
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
