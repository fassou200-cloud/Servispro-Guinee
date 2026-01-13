import { useState } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  Shield, ArrowLeft, UserPlus, LogIn, User, Lock, Eye, EyeOff, 
  Settings, BarChart3, Users, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminAuth = ({ setIsAdminAuthenticated }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post(`${API}/admin/login`, {
          username: formData.username,
          password: formData.password
        });
        
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('admin', JSON.stringify(response.data.user));
        
        if (setIsAdminAuthenticated) {
          setIsAdminAuthenticated(true);
        }
        
        toast.success(`Bienvenue ${response.data.user.username} !`);
        navigate('/admin/dashboard');
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API}/admin/register`, {
          username: formData.username,
          password: formData.password
        });
        
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('admin', JSON.stringify(response.data.user));
        
        if (setIsAdminAuthenticated) {
          setIsAdminAuthenticated(true);
        }
        
        toast.success('Compte admin créé avec succès !');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, text: 'Gérer les utilisateurs' },
    { icon: BarChart3, text: 'Tableau de bord complet' },
    { icon: Settings, text: 'Configuration avancée' }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">ServisPro</h1>
              <p className="text-sm text-slate-400">Administration</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-heading font-bold mb-6">
            Panneau d'Administration
          </h2>
          <p className="text-xl text-slate-400 mb-10 leading-relaxed">
            Accédez au tableau de bord administrateur pour gérer les prestataires, 
            clients, demandes de service et locations.
          </p>
          
          <div className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-amber-500" />
                  </div>
                  <span className="text-lg text-slate-300">{feature.text}</span>
                </div>
              );
            })}
          </div>

          {/* Security Note */}
          <div className="mt-12 p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Accès Sécurisé</h3>
                <p className="text-sm text-slate-400">
                  Cet espace est réservé aux administrateurs autorisés. 
                  Toutes les actions sont enregistrées.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-900">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 gap-2 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'Accueil
          </Button>

          <Card className="p-8 rounded-3xl shadow-2xl border-slate-700 bg-slate-800">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-heading font-bold text-white mb-2">
                Administration
              </h1>
              <p className="text-slate-400">
                {isLogin ? 'Connectez-vous pour accéder au panneau' : 'Créez un compte administrateur'}
              </p>
            </div>

            {/* Toggle Login/Register */}
            <div className="flex gap-2 mb-8 p-1 bg-slate-700 rounded-2xl">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  isLogin 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Connexion
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  !isLogin 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Inscription
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300 font-medium text-sm">
                  Nom d'utilisateur
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    className="h-12 pl-10 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    placeholder="admin"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 font-medium text-sm">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="h-12 pl-10 pr-12 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-300 font-medium text-sm">
                      Confirmer le mot de passe
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                        className="h-12 pl-10 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Chargement...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                    {isLogin ? 'Se Connecter' : 'Créer le Compte'}
                  </div>
                )}
              </Button>
            </form>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Shield className="h-4 w-4" />
              <span>Connexion sécurisée SSL</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
