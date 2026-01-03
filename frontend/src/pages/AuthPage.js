import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Lock, Eye, EyeOff, Briefcase, Award, TrendingUp, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthPage = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    profession: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
      const payload = isLogin 
        ? { phone_number: formData.phone_number, password: formData.password, user_type: 'provider' }
        : formData;

      const response = await axios.post(endpoint, payload);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success(isLogin ? `Bienvenue ${response.data.user.first_name} !` : `Compte créé avec succès, bienvenue ${response.data.user.first_name} !`);
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const features = [
    { icon: Award, text: 'Profil professionnel vérifié' },
    { icon: TrendingUp, text: 'Augmentez votre clientèle' },
    { icon: Star, text: 'Recevez des avis clients' }
  ];

  const professions = [
    { value: 'Logisticien', label: 'Logisticien' },
    { value: 'Electromecanicien', label: 'Électromécanicien' },
    { value: 'Mecanicien', label: 'Mécanicien' },
    { value: 'Plombier', label: 'Plombier' },
    { value: 'Macon', label: 'Maçon' },
    { value: 'Menuisier', label: 'Menuisier' },
    { value: 'AgentImmobilier', label: 'Agent Immobilier' },
    { value: 'Soudeur', label: 'Soudeur' },
    { value: 'Autres', label: 'Autres Métiers' }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding with Background Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img 
          src="https://images.pexels.com/photos/8482816/pexels-photo-8482816.jpeg"
          alt="Professional craftsman"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/90 via-purple-600/85 to-indigo-700/90" />
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
              <p className="text-sm text-purple-200">Guinée 🇬🇳</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-heading font-bold mb-6">
            Développez votre Activité
          </h2>
          <p className="text-xl text-purple-200 mb-10 leading-relaxed">
            Rejoignez la plateforme #1 des prestataires de services en Guinée. Recevez des demandes de clients et développez votre business.
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="font-heading font-bold">ServisPro</span>
            </div>
            <div className="w-10" />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="hidden lg:block mb-8">
              <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 text-gray-600 mb-6">
                <ArrowLeft className="h-4 w-4" />
                Retour à l'accueil
              </Button>
            </div>

            <Card className="p-8 rounded-3xl shadow-xl border-0">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-heading font-bold text-gray-900 mb-2">
                  {isLogin ? 'Espace Prestataire' : 'Devenir Prestataire'}
                </h2>
                <p className="text-gray-600">
                  {isLogin ? 'Accédez à votre tableau de bord' : 'Créez votre profil professionnel'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                          Prénom
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="first_name"
                            name="first_name"
                            data-testid="register-first-name-input"
                            value={formData.first_name}
                            onChange={handleChange}
                            required={!isLogin}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                            placeholder="Mamadou"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                          Nom
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            id="last_name"
                            name="last_name"
                            data-testid="register-last-name-input"
                            value={formData.last_name}
                            onChange={handleChange}
                            required={!isLogin}
                            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                            placeholder="Camara"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profession" className="text-sm font-medium text-gray-700">
                        Profession
                      </Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                        <Select
                          value={formData.profession}
                          onValueChange={(value) => setFormData({ ...formData, profession: value })}
                          required={!isLogin}
                        >
                          <SelectTrigger data-testid="register-profession-select" className="pl-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500">
                            <SelectValue placeholder="Sélectionnez votre profession" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {professions.map((prof) => (
                              <SelectItem key={prof.value} value={prof.value} className="rounded-lg">
                                {prof.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-sm font-medium text-gray-700">
                    Numéro de téléphone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      data-testid="auth-phone-input"
                      value={formData.phone_number}
                      onChange={handleChange}
                      required
                      className="pl-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                      placeholder="+224 6XX XXX XXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      data-testid="auth-password-input"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
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

                <Button
                  type="submit"
                  data-testid="auth-submit-button"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-lg shadow-lg shadow-purple-500/25"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    isLogin ? 'Se Connecter' : "S'inscrire"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  {isLogin ? "Pas encore inscrit ?" : "Déjà un compte ?"}
                  <button
                    type="button"
                    data-testid="auth-toggle-button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setFormData({ first_name: '', last_name: '', phone_number: '', password: '', profession: '' });
                    }}
                    className="ml-2 text-purple-600 font-semibold hover:text-purple-700 transition-colors"
                  >
                    {isLogin ? "Créez un compte" : "Connectez-vous"}
                  </button>
                </p>
              </div>

              {isLogin && (
                <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                  <p className="text-sm text-gray-500 mb-3">Vous êtes client ?</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/customer/auth')}
                    className="w-full rounded-xl border-2"
                  >
                    Espace Client
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
