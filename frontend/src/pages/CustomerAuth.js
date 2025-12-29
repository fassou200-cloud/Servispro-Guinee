import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerAuth = ({ setIsCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        response = await axios.post(`${API}/auth/customer/register`, formData);
      }
      
      localStorage.setItem('customerToken', response.data.token);
      localStorage.setItem('customer', JSON.stringify(response.data.user));
      
      if (setIsCustomerAuthenticated) {
        setIsCustomerAuthenticated(true);
      }
      
      toast.success(isLogin ? `Bienvenue ${response.data.user.first_name} !` : `Compte créé avec succès, bienvenue ${response.data.user.first_name} !`);
      navigate('/customer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-red-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4 gap-2"
          data-testid="back-to-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'Accueil
        </Button>

        <Card className="p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent mb-4">
              <span className="text-3xl font-bold text-white">S</span>
            </div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              {isLogin ? 'Connexion Client' : 'Inscription Client'}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? 'Bon retour ! Connectez-vous pour continuer' : 'Créez votre compte pour commencer'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="font-heading text-xs uppercase tracking-wide">
                      Prénom *
                    </Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      data-testid="customer-first-name-input"
                      value={formData.first_name}
                      onChange={handleChange}
                      required={!isLogin}
                      className="h-12"
                      placeholder="Mamadou"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="font-heading text-xs uppercase tracking-wide">
                      Nom *
                    </Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      data-testid="customer-last-name-input"
                      value={formData.last_name}
                      onChange={handleChange}
                      required={!isLogin}
                      className="h-12"
                      placeholder="Diallo"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone_number" className="font-heading text-xs uppercase tracking-wide">
                Numéro de Téléphone *
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                data-testid="customer-phone-input"
                value={formData.phone_number}
                onChange={handleChange}
                required
                className="h-12 font-mono"
                placeholder="+224 620 00 00 00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-heading text-xs uppercase tracking-wide">
                Mot de Passe *
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                data-testid="customer-password-input"
                value={formData.password}
                onChange={handleChange}
                required
                className="h-12"
              />
            </div>

            <Button 
              type="submit" 
              data-testid="customer-auth-submit"
              className="w-full h-12 font-heading font-bold text-base bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? 'Veuillez patienter...' : (isLogin ? 'Se Connecter' : 'Créer un Compte')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="customer-auth-toggle"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ first_name: '', last_name: '', phone_number: '', password: '' });
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isLogin ? "Pas encore de compte ? Inscrivez-vous" : 'Déjà un compte ? Connectez-vous'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-2">Êtes-vous un prestataire de services ?</p>
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
              className="border-primary text-primary hover:bg-primary hover:text-white"
            >
              Connexion Prestataire
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CustomerAuth;