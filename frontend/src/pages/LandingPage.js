import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Wrench, Droplet, Truck, Home, ArrowRight, Shield, Clock, Star, 
  User, LogOut, Hammer, Building, Settings, Flame, CheckCircle, 
  Phone, MapPin, Users, Award, ChevronRight, Play, Sparkles
} from 'lucide-react';

const LandingPage = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
  }, []);

  // Auto-rotate categories
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCategory((prev) => (prev + 1) % categories.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCustomerLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    setCustomer(null);
    window.location.reload();
  };

  const categories = [
    {
      name: 'Logisticien',
      icon: Truck,
      description: 'Services de transport et livraison rapides',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
      link: '/browse?category=Logisticien',
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Électromécanicien',
      icon: Settings,
      description: 'Maintenance et réparation électromécanique',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
      link: '/browse?category=Electromecanicien',
      color: 'from-purple-500 to-purple-600'
    },
    {
      name: 'Mécanicien',
      icon: Wrench,
      description: 'Réparation automobile et entretien',
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80',
      link: '/browse?category=Mecanicien',
      color: 'from-orange-500 to-orange-600'
    },
    {
      name: 'Plombier',
      icon: Droplet,
      description: 'Installation et réparation plomberie',
      image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80',
      link: '/browse?category=Plombier',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      name: 'Maçon',
      icon: Hammer,
      description: 'Construction et rénovation de qualité',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
      link: '/browse?category=Macon',
      color: 'from-amber-500 to-amber-600'
    },
    {
      name: 'Menuisier',
      icon: Hammer,
      description: 'Travaux de bois et menuiserie',
      image: 'https://images.unsplash.com/photo-1588854337115-1c67d9247e4d?w=800&q=80',
      link: '/browse?category=Menuisier',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      name: 'Agent Immobilier',
      icon: Building,
      description: 'Location et vente immobilière',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
      link: '/rentals',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      name: 'Soudeur',
      icon: Flame,
      description: 'Soudure et travaux métalliques',
      image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
      link: '/browse?category=Soudeur',
      color: 'from-red-500 to-red-600'
    },
    {
      name: 'Camionneur',
      icon: Truck,
      description: 'Location de camions courte et longue durée',
      image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80',
      link: '/browse?category=Camionneur',
      color: 'from-slate-500 to-slate-600'
    },
    {
      name: 'Tracteur',
      icon: Truck,
      description: 'Location de tracteurs agricoles',
      image: 'https://images.unsplash.com/photo-1530267981375-f0de937f5f13?w=800&q=80',
      link: '/browse?category=Tracteur',
      color: 'from-green-500 to-green-600'
    },
    {
      name: 'Voiture',
      icon: Truck,
      description: 'Location de voitures particulières',
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80',
      link: '/browse?category=Voiture',
      color: 'from-indigo-500 to-indigo-600'
    }
  ];

  const stats = [
    { value: '500+', label: 'Prestataires', icon: Users },
    { value: '2000+', label: 'Services Réalisés', icon: CheckCircle },
    { value: '4.8', label: 'Note Moyenne', icon: Star },
    { value: '24/7', label: 'Disponibilité', icon: Clock }
  ];

  const features = [
    {
      icon: Shield,
      title: 'Professionnels Vérifiés',
      description: 'Chaque prestataire est vérifié avec pièce d\'identité pour garantir votre sécurité',
      color: 'bg-green-500'
    },
    {
      icon: Clock,
      title: 'Réponse Instantanée',
      description: 'Recevez des réponses rapides des prestataires disponibles près de chez vous',
      color: 'bg-blue-500'
    },
    {
      icon: Star,
      title: 'Avis Authentiques',
      description: 'Consultez les avis vérifiés des clients pour faire le meilleur choix',
      color: 'bg-yellow-500'
    },
    {
      icon: Award,
      title: 'Garantie Qualité',
      description: 'Service client dédié pour assurer votre satisfaction à 100%',
      color: 'bg-purple-500'
    }
  ];

  const testimonials = [
    {
      name: 'Mamadou Diallo',
      role: 'Client à Conakry',
      text: 'Excellent service ! J\'ai trouvé un plombier en moins de 30 minutes. Travail impeccable.',
      rating: 5
    },
    {
      name: 'Fatou Camara',
      role: 'Cliente à Kaloum',
      text: 'Plateforme très pratique pour trouver des professionnels de confiance en Guinée.',
      rating: 5
    },
    {
      name: 'Ibrahim Barry',
      role: 'Client à Matam',
      text: 'Le mécanicien était ponctuel et compétent. Je recommande ServisPro !',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 via-yellow-500 to-red-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-gray-900">
                  ServisPro
                </h1>
                <p className="text-xs text-gray-500">Guinée 🇬🇳</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => navigate('/browse')} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Services
              </button>
              <button onClick={() => navigate('/rentals')} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Locations
              </button>
              <button onClick={() => navigate('/auth')} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Prestataires
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {customer ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/customer/dashboard')}
                    className="gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                      {customer.first_name[0]}
                    </div>
                    <span className="hidden sm:inline">{customer.first_name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCustomerLogout}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/customer/auth')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Connexion
                  </Button>
                  <Button
                    onClick={() => navigate('/browse')}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
                  >
                    Commencer
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-green-50/30" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-200 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-red-200 rounded-full blur-3xl opacity-20 animate-pulse" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                La plateforme #1 en Guinée
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-gray-900 mb-6 leading-tight">
                Trouvez le 
                <span className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 bg-clip-text text-transparent"> Prestataire Parfait </span>
                en Guinée
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Connectez-vous avec des professionnels vérifiés : électriciens, plombiers, mécaniciens, et plus encore. Service rapide et fiable à Conakry et partout en Guinée.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                <Button
                  size="lg"
                  onClick={() => navigate('/browse')}
                  className="h-14 px-8 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-xl shadow-green-500/30 rounded-xl"
                >
                  Trouver un Prestataire
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/rentals')}
                  className="h-14 px-8 text-lg font-bold border-2 border-gray-300 hover:border-gray-400 rounded-xl"
                >
                  <Building className="mr-2 h-5 w-5" />
                  Locations
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Category Cards */}
            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                {/* Center Circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-green-600">{categories.length}</p>
                      <p className="text-sm text-gray-600">Catégories</p>
                    </div>
                  </div>
                </div>
                
                {/* Orbiting Cards */}
                <TooltipProvider delayDuration={100}>
                  {categories.slice(0, 6).map((cat, index) => {
                    const Icon = cat.icon;
                    const angle = (index / 6) * 360;
                    const isActive = index === activeCategory % 6;
                    return (
                      <Tooltip key={cat.name}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute w-20 h-20 transition-all duration-500 cursor-pointer ${isActive ? 'scale-125 z-10' : 'scale-100'}`}
                            style={{
                              left: '50%',
                              top: '50%',
                              transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(180px) rotate(-${angle}deg)`
                            }}
                            onClick={() => navigate(cat.link)}
                          >
                            <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg ${isActive ? 'shadow-2xl' : ''}`}>
                              <Icon className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl border-0"
                        >
                          <p className="font-semibold text-sm">{cat.name}</p>
                          <p className="text-xs text-gray-300 mt-1">{cat.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 mb-4">
              Nos Services Professionnels
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Des experts qualifiés dans chaque domaine, prêts à intervenir rapidement
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.name}
                  className="group relative overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2"
                  onClick={() => navigate(category.link)}
                >
                  <div className="aspect-[4/5] relative">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-white mb-2">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-300 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {category.description}
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-white/80 group-hover:text-white transition-colors">
                        <span className="text-sm font-medium">Voir plus</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 mb-4">
              Pourquoi Choisir ServisPro ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              La plateforme de confiance pour tous vos besoins en services professionnels
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="group text-center p-8 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-2xl transition-all duration-300"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-heading font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-br from-green-600 to-emerald-700">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
              Ce Que Disent Nos Clients
            </h2>
            <p className="text-lg text-green-100 max-w-2xl mx-auto">
              Des milliers de clients satisfaits en Guinée
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-8 rounded-3xl bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-colors">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white text-lg mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white">{testimonial.name}</p>
                    <p className="text-sm text-green-200">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-6">
            Prêt à Commencer ?
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Rejoignez des milliers de clients satisfaits et trouvez le prestataire idéal pour vos besoins.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/browse')}
              className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-xl rounded-xl"
            >
              Trouver un Prestataire
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="h-14 px-10 text-lg font-bold border-2 border-white/30 text-white hover:bg-white/10 rounded-xl"
            >
              Devenir Prestataire
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/company/auth')}
              className="h-14 px-10 text-lg font-bold border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
            >
              Espace Entreprise
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 via-yellow-500 to-red-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">S</span>
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-white">ServisPro Guinée</h3>
                  <p className="text-sm text-gray-500">Plateforme de Services Professionnels</p>
                </div>
              </div>
              <p className="text-gray-400 max-w-md leading-relaxed">
                La première plateforme de mise en relation entre clients et prestataires de services professionnels en Guinée.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Services</h4>
              <ul className="space-y-3">
                <li><button onClick={() => navigate('/browse')} className="text-gray-400 hover:text-white transition-colors">Tous les Services</button></li>
                <li><button onClick={() => navigate('/rentals')} className="text-gray-400 hover:text-white transition-colors">Locations</button></li>
                <li><button onClick={() => navigate('/jobs')} className="text-gray-400 hover:text-white transition-colors">Offres d'Emploi</button></li>
                <li><button onClick={() => navigate('/auth')} className="text-gray-400 hover:text-white transition-colors">Devenir Prestataire</button></li>
                <li><button onClick={() => navigate('/company/auth')} className="text-gray-400 hover:text-white transition-colors">Espace Entreprise</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  Conakry, Guinée
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <Phone className="h-4 w-4" />
                  +224 XXX XXX XXX
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2024 ServisPro Guinée. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>🇬🇳 Made in Guinea with ❤️</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
