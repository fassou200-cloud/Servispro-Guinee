import { useState, useEffect } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, User, Phone, Lock, Eye, EyeOff, Sparkles, Shield, CheckCircle, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getRegions, getVillesByRegion, getCommunesByVille, getQuartiersByCommune } from '@/data/guineaLocations';
import ForgotPassword from '@/components/ForgotPassword';
import TermsConditionsModal from '@/components/TermsConditionsModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerAuth = ({ setIsCustomerAuthenticated }) => {
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
    region: '',
    ville: '',
    commune: '',
    quartier: ''
  });

  // Location options based on selections
  const [villes, setVilles] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [quartiers, setQuartiers] = useState([]);

  // Update villes when region changes
  useEffect(() => {
    if (formData.region) {
      setVilles(getVillesByRegion(formData.region));
      setFormData(prev => ({ ...prev, ville: '', commune: '', quartier: '' }));
      setCommunes([]);
      setQuartiers([]);
    }
  }, [formData.region]);

  // Update communes when ville changes
  useEffect(() => {
    if (formData.region && formData.ville) {
      setCommunes(getCommunesByVille(formData.region, formData.ville));
      setFormData(prev => ({ ...prev, commune: '', quartier: '' }));
      setQuartiers([]);
    }
  }, [formData.ville]);

  // Update quartiers when commune changes
  useEffect(() => {
    if (formData.region && formData.ville && formData.commune) {
      setQuartiers(getQuartiersByCommune(formData.region, formData.ville, formData.commune));
      setFormData(prev => ({ ...prev, quartier: '' }));
    }
  }, [formData.commune]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check terms acceptance for registration
    if (!isLogin && !termsAccepted) {
      toast.error('Vous devez accepter les Conditions Générales d\'Utilisation pour créer un compte');
      return;
    }
    
    setLoading(true);

    try {
      let response;
      
      if (isLogin) {
        response = await axios.post(`${API}/auth/login`, {
          phone_number: formData.phone_number,
          password: formData.password,
          user_type: 'customer'
        });
      } else {
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

        response = await axios.post(`${API}/auth/customer/register`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number,
          password: formData.password,
          location: locationParts.join(', '),
          region: formData.region,
          ville: formData.ville,
          commune: formData.commune,
          quartier: formData.quartier
        });
      }
      
      localStorage.setItem('customerToken', response.data.token);
      localStorage.setItem('customer', JSON.stringify(response.data.user));
      
      if (setIsCustomerAuthenticated) {
        setIsCustomerAuthenticated(true);
      }
      
      toast.success(isLogin ? `Bienvenue ${response.data.user.first_name} !` : `Compte créé avec succès, bienvenue ${response.data.user.first_name} !`);
      navigate('/customer/dashboard');
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
    { icon: Shield, text: 'Prestataires vérifiés' },
    { icon: CheckCircle, text: 'Service garanti' },
    { icon: Sparkles, text: 'Réponse rapide' }
  ];

  const regions = getRegions();

  // Show Forgot Password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <ForgotPassword 
          userType="customer" 
          onBack={() => setShowForgotPassword(false)}
          onSuccess={() => setShowForgotPassword(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-3xl font-bold">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">ServisPro</h1>
              <p className="text-sm text-green-100">Guinée 🇬🇳</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-heading font-bold mb-6">
            Bienvenue sur ServisPro
          </h2>
          <p className="text-xl text-green-100 mb-10 leading-relaxed">
            Connectez-vous avec les meilleurs prestataires de services en Guinée. Électriciens, plombiers, mécaniciens et bien plus encore.
          </p>
          
          <div className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-lg font-medium">{feature.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="font-heading font-bold">ServisPro</span>
            </div>
            <div className="w-10" />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-md my-8">
            <div className="hidden lg:block mb-8">
              <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 text-gray-600 mb-6">
                <ArrowLeft className="h-4 w-4" />
                Retour à l'accueil
              </Button>
            </div>

            <Card className="p-8 rounded-3xl shadow-xl border-0">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-heading font-bold text-gray-900 mb-2">
                  {isLogin ? 'Connexion Client' : 'Créer un Compte'}
                </h2>
                <p className="text-gray-600">
                  {isLogin ? 'Accédez à votre espace client' : 'Rejoignez ServisPro Guinée'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                          Prénom *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required={!isLogin}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                            placeholder="Jean"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                          Nom *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required={!isLogin}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                            placeholder="Dupont"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-700 font-medium text-sm mb-2">
                        <MapPin className="h-4 w-4 text-green-500" />
                        Localisation
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Region */}
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Région *</Label>
                          <Select
                            value={formData.region}
                            onValueChange={(value) => setFormData({ ...formData, region: value })}
                            required={!isLogin}
                          >
                            <SelectTrigger className="h-10 rounded-lg border-gray-200 text-sm">
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
                          <Label className="text-xs text-gray-500">Ville *</Label>
                          <Select
                            value={formData.ville}
                            onValueChange={(value) => setFormData({ ...formData, ville: value })}
                            disabled={!formData.region}
                            required={!isLogin}
                          >
                            <SelectTrigger className="h-10 rounded-lg border-gray-200 text-sm">
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
                          <Label className="text-xs text-gray-500">Commune *</Label>
                          <Select
                            value={formData.commune}
                            onValueChange={(value) => setFormData({ ...formData, commune: value })}
                            disabled={!formData.ville}
                            required={!isLogin}
                          >
                            <SelectTrigger className="h-10 rounded-lg border-gray-200 text-sm">
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
                          <Label className="text-xs text-gray-500">Quartier</Label>
                          <Input
                            type="text"
                            value={formData.quartier}
                            onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                            placeholder="Entrez votre quartier"
                            className="h-10 rounded-lg border-gray-200 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-sm font-medium text-gray-700">
                    Numéro de téléphone *
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      value={formData.phone_number}
                      onChange={handleChange}
                      required
                      className="pl-10 h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                      placeholder="+224 6XX XXX XXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Mot de passe *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-green-600 hover:text-green-700 hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                {/* Terms and Conditions for Registration */}
                {!isLogin && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <Checkbox 
                      id="terms-customer"
                      checked={termsAccepted}
                      onCheckedChange={setTermsAccepted}
                      className="mt-0.5 border-green-500 data-[state=checked]:bg-green-500"
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor="terms-customer" 
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        J'accepte les{' '}
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-green-600 hover:text-green-700 underline font-medium inline-flex items-center gap-1"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Conditions Générales d'Utilisation
                        </button>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Vous devez accepter les CGU pour créer votre compte
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || (!isLogin && !termsAccepted)}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg shadow-lg shadow-green-500/25"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    isLogin ? 'Se Connecter' : 'Créer mon Compte'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setTermsAccepted(false);
                      setFormData({ first_name: '', last_name: '', phone_number: '', password: '', region: '', ville: '', commune: '', quartier: '' });
                    }}
                    className="ml-1 text-green-600 hover:text-green-700 font-semibold"
                  >
                    {isLogin ? "Créez-en un" : "Connectez-vous"}
                  </button>
                </p>
              </div>

              {/* Link to Provider Auth */}
              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Vous êtes un prestataire ?
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="ml-1 text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Espace Prestataire
                  </button>
                </p>
              </div>
            </Card>
          </div>
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

export default CustomerAuth;
