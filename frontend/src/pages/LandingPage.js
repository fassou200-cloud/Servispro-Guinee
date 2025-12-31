import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Zap, Wrench, Droplet, Truck, Home, ArrowRight, Shield, Clock, Star, User, LogOut } from 'lucide-react';

const LandingPage = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
  }, []);

  const handleCustomerLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    setCustomer(null);
    window.location.reload();
  };

  const categories = [
    {
      name: 'Électricien',
      icon: Zap,
      description: 'Services électriques professionnels pour votre maison et entreprise en Guinée',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
      link: '/browse?category=Electrician'
    },
    {
      name: 'Mécanicien',
      icon: Wrench,
      description: 'Réparation automobile et services d\'entretien experts à Conakry et environs',
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80',
      link: '/browse?category=Mechanic'
    },
    {
      name: 'Plombier',
      icon: Droplet,
      description: 'Solutions de plomberie fiables pour tous vos besoins',
      image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80',
      link: '/browse?category=Plumber'
    },
    {
      name: 'Logistique',
      icon: Truck,
      description: 'Services de livraison et logistique rapides et fiables en Guinée',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
      link: '/browse?category=Logistics'
    }
  ];

  const features = [
    {
      icon: Shield,
      title: 'Professionnels Vérifiés',
      description: 'Tous les prestataires sont vérifiés pour votre sécurité'
    },
    {
      icon: Clock,
      title: 'Réponse Rapide',
      description: 'Obtenez des réponses rapides des prestataires disponibles'
    },
    {
      icon: Star,
      title: 'Service de Qualité',
      description: 'Professionnels expérimentés prêts à vous aider'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                ServisPro Guinée
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {customer ? (
                <>
                  <Button
                    variant="outline"
                    data-testid="customer-dashboard-button"
                    onClick={() => navigate('/customer/dashboard')}
                    className="border-primary text-primary hover:bg-primary hover:text-white gap-2"
                  >
                    <User className="h-4 w-4" />
                    {customer.first_name}
                  </Button>
                  <Button
                    variant="ghost"
                    data-testid="customer-logout-button"
                    onClick={handleCustomerLogout}
                    className="text-muted-foreground hover:text-foreground gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    data-testid="customer-login-button"
                    onClick={() => navigate('/customer/auth')}
                    className="border-primary text-primary hover:bg-primary hover:text-white"
                  >
                    Connexion Client
                  </Button>
                  <Button
                    variant="ghost"
                    data-testid="provider-login-button"
                    onClick={() => navigate('/auth')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Connexion Prestataire
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-br from-green-50 via-yellow-50 to-red-50 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-accent rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-heading font-bold text-foreground mb-6 leading-tight">
              Service de Qualité à Conakry
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed max-w-3xl mx-auto">
              Connectez-vous avec des électriciens, mécaniciens, plombiers et prestataires logistiques vérifiés partout en Guinée.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                data-testid="browse-services-button"
                onClick={() => navigate('/browse')}
                className="h-16 px-10 text-lg font-heading font-bold bg-primary hover:bg-primary/90 text-white shadow-lg"
              >
                Parcourir les Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/rentals')}
                className="h-16 px-10 text-lg font-heading font-bold border-2 border-primary text-primary hover:bg-primary hover:text-white"
              >
                <Home className="mr-2 h-5 w-5" />
                Voir les Locations
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Catégories de Services
            </h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choisissez parmi notre gamme de services professionnels disponibles en Guinée
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.name}
                  className="group overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer border-2 hover:border-primary transform hover:-translate-y-2"
                  data-testid={`category-card-${category.name.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => navigate(category.link)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="h-10 w-10" />
                      </div>
                      <h4 className="text-2xl font-heading font-bold mb-2">{category.name}</h4>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <p className="text-muted-foreground mb-4 text-center">{category.description}</p>
                    <Button
                      variant="ghost"
                      className="w-full gap-2 font-heading text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(category.link);
                      }}
                    >
                      Voir les Prestataires
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-muted/50 to-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h3 className="text-4xl font-heading font-bold text-foreground mb-16 text-center">
            Pourquoi Choisir ServisPro Guinée
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="text-center group">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <Icon className="h-10 w-10" />
                  </div>
                  <h4 className="text-2xl font-heading font-bold text-foreground mb-3">
                    {feature.title}
                  </h4>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
              <div>
                <p className="font-heading font-bold text-lg text-foreground">ServisPro Guinée</p>
                <p className="text-sm text-muted-foreground">Plateforme de Services Professionnels</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ServisPro Guinée. Tous droits réservés.
            </p>
            <Button
              variant="link"
              onClick={() => navigate('/auth')}
              className="text-primary hover:text-primary/80"
            >
              Vous êtes prestataire ? Rejoignez-nous →
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
