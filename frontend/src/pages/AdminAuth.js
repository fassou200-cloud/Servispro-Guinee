import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminAuth = ({ setIsAdminAuthenticated }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/login`, formData);
      
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('admin', JSON.stringify(response.data.user));
      
      if (setIsAdminAuthenticated) {
        setIsAdminAuthenticated(true);
      }
      
      toast.success('Connexion admin réussie !');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4 gap-2 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'Accueil
        </Button>

        <Card className="p-8 bg-slate-800 border-slate-700">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              Administration
            </h1>
            <p className="text-slate-400">
              Connectez-vous pour accéder au panneau d'administration
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300 font-heading text-xs uppercase tracking-wide">
                Nom d'utilisateur
              </Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="h-12 bg-slate-700 border-slate-600 text-white"
                placeholder="admin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 font-heading text-xs uppercase tracking-wide">
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="h-12 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 font-heading font-bold text-base bg-amber-600 hover:bg-amber-700"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se Connecter'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuth;
