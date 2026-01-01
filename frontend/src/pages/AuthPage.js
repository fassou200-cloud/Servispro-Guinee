import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthPage = ({ setIsAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
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
      
      toast.success(isLogin ? 'Connexion réussie !' : 'Inscription réussie !');
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
              ServisPro Guinée
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? 'Espace Prestataire' : 'Créez votre profil professionnel'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="font-heading text-xs uppercase tracking-wide">
                    Prénom
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    data-testid="register-first-name-input"
                    value={formData.first_name}
                    onChange={handleChange}
                    required={!isLogin}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="font-heading text-xs uppercase tracking-wide">
                    Nom
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    data-testid="register-last-name-input"
                    value={formData.last_name}
                    onChange={handleChange}
                    required={!isLogin}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession" className="font-heading text-xs uppercase tracking-wide">
                    Profession
                  </Label>
                  <Select
                    value={formData.profession}
                    onValueChange={(value) => setFormData({ ...formData, profession: value })}
                    required={!isLogin}
                  >
                    <SelectTrigger data-testid="register-profession-select" className="h-12">
                      <SelectValue placeholder="Sélectionnez votre profession" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Logisticien">Logisticien</SelectItem>
                      <SelectItem value="Electromecanicien">Électromécanicien</SelectItem>
                      <SelectItem value="Mecanicien">Mécanicien</SelectItem>
                      <SelectItem value="Plombier">Plombier</SelectItem>
                      <SelectItem value="Macon">Maçon</SelectItem>
                      <SelectItem value="Menuisier">Menuisier</SelectItem>
                      <SelectItem value="AgentImmobilier">Agent Immobilier</SelectItem>
                      <SelectItem value="Soudeur">Soudeur</SelectItem>
                      <SelectItem value="Autres">Autres Métiers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone_number" className="font-heading text-xs uppercase tracking-wide">
                Numéro de Téléphone
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                data-testid="auth-phone-input"
                value={formData.phone_number}
                onChange={handleChange}
                required
                className="h-12 font-mono"
                placeholder="+224 620 00 00 00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-heading text-xs uppercase tracking-wide">
                Mot de Passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                data-testid="auth-password-input"
                value={formData.password}
                onChange={handleChange}
                required
                className="h-12"
              />
            </div>

            <Button 
              type="submit" 
              data-testid="auth-submit-button"
              className="w-full h-12 font-heading font-bold text-base"
              disabled={loading}
            >
              {loading ? 'Veuillez patienter...' : (isLogin ? 'Se Connecter' : 'S\'inscrire')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="auth-toggle-button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ first_name: '', last_name: '', phone_number: '', password: '', profession: '' });
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "Pas encore inscrit ? Créez un compte" : 'Déjà inscrit ? Connectez-vous'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
