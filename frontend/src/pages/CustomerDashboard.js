import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Home, LogOut, Search, Building, User, CheckCircle, Clock, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Traduction des professions
const translateProfession = (profession) => {
  const translations = {
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Logistics': 'Logistique',
    'Other': 'Autres'
  };
  return translations[profession] || profession;
};

const CustomerDashboard = ({ setIsCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
    fetchPendingJobs();
  }, []);

  const fetchPendingJobs = async () => {
    try {
      const response = await axios.get(`${API}/customer/jobs`);
      setPendingJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleConfirmComplete = async (jobId) => {
    try {
      await axios.put(`${API}/jobs/${jobId}/customer-confirm`);
      toast.success('Service confirmé comme terminé ! Merci.');
      fetchPendingJobs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la confirmation');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    setIsCustomerAuthenticated(false);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                data-testid="home-button"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Accueil
              </Button>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                ServisPro Guinée
              </h1>
            </div>
            <Button
              variant="ghost"
              data-testid="logout-button"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Welcome Card */}
        <Card className="p-8 mb-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarFallback className="text-3xl font-heading bg-primary text-primary-foreground">
                {customer.first_name[0]}{customer.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg text-muted-foreground mb-1">Bienvenue sur ServisPro</p>
              <h2 className="text-4xl font-heading font-bold text-foreground mb-2">
                {customer.first_name} {customer.last_name}
              </h2>
              <p className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Client ServisPro
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
          Que souhaitez-vous faire ?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Browse Providers */}
          <Card 
            className="p-8 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate('/browse')}
          >
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-xl bg-primary/10">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h4 className="text-xl font-heading font-bold text-foreground mb-2">
                  Trouver un Prestataire
                </h4>
                <p className="text-muted-foreground mb-4">
                  Parcourez notre liste d'électriciens, mécaniciens, plombiers et autres professionnels vérifiés en Guinée.
                </p>
                <Button className="gap-2">
                  <Search className="h-4 w-4" />
                  Parcourir les Prestataires
                </Button>
              </div>
            </div>
          </Card>

          {/* Browse Rentals */}
          <Card 
            className="p-8 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate('/rentals')}
          >
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-xl bg-secondary/10">
                <Building className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h4 className="text-xl font-heading font-bold text-foreground mb-2">
                  Voir les Locations
                </h4>
                <p className="text-muted-foreground mb-4">
                  Découvrez les appartements et maisons disponibles à louer à Conakry et partout en Guinée.
                </p>
                <Button variant="outline" className="gap-2 border-secondary text-secondary hover:bg-secondary hover:text-white">
                  <Building className="h-4 w-4" />
                  Voir les Locations
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="p-6 mt-8 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-blue-900 mb-1">
                Votre Espace Client
              </h4>
              <p className="text-sm text-blue-700">
                En tant que client connecté, vous pouvez demander des services auprès de nos prestataires vérifiés. 
                Vos informations sont pré-remplies pour faciliter vos demandes.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CustomerDashboard;
