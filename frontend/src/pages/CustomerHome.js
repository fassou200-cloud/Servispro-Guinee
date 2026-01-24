import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, MapPin, Zap, Wrench, Droplet, Settings, Home, Heart,
  MessageCircle, ClipboardList, User, Building, Hammer
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerHome = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (isCustomerAuthenticated) {
      const storedCustomer = localStorage.getItem('customer');
      if (storedCustomer) {
        setCustomer(JSON.parse(storedCustomer));
      }
    }
  }, [isCustomerAuthenticated]);

  // Categories for quick access
  const categories = [
    { 
      id: 'Electromecanicien', 
      name: 'Électricien', 
      icon: Zap, 
      color: 'from-yellow-400 to-orange-500',
      bgColor: 'bg-yellow-50',
      description: 'Installation & dépannage électrique'
    },
    { 
      id: 'Plombier', 
      name: 'Plombier', 
      icon: Droplet, 
      color: 'from-blue-400 to-cyan-500',
      bgColor: 'bg-blue-50',
      description: 'Réparation & installation sanitaire'
    },
    { 
      id: 'Mecanicien', 
      name: 'Mécanicien', 
      icon: Wrench, 
      color: 'from-orange-400 to-red-500',
      bgColor: 'bg-orange-50',
      description: 'Réparation automobile'
    },
    { 
      id: 'Macon', 
      name: 'Maçon', 
      icon: Hammer, 
      color: 'from-amber-400 to-yellow-600',
      bgColor: 'bg-amber-50',
      description: 'Construction & rénovation'
    },
    { 
      id: 'Menuisier', 
      name: 'Menuisier', 
      icon: Settings, 
      color: 'from-emerald-400 to-teal-500',
      bgColor: 'bg-emerald-50',
      description: 'Travaux de bois'
    },
    { 
      id: 'location', 
      name: 'Location', 
      icon: Home, 
      color: 'from-purple-400 to-indigo-500',
      bgColor: 'bg-purple-50',
      description: 'Maisons & appartements'
    },
  ];

  const stats = [
    { icon: Users, value: '500+', label: 'Professionnels' },
    { icon: Star, value: '4.8', label: 'Note moyenne' },
    { icon: Shield, value: '100%', label: 'Vérifiés' },
    { icon: Clock, value: '24h', label: 'Réponse rapide' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCategoryClick = (categoryId) => {
    if (categoryId === 'location') {
      navigate('/rentals');
    } else {
      navigate(`/browse?category=${categoryId}`);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 lg:px-8 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-xl text-gray-900">ServisPro</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="/browse" className="text-gray-600 hover:text-green-600 font-medium transition-colors">
              Professionnels
            </a>
            <a href="/rentals" className="text-gray-600 hover:text-green-600 font-medium transition-colors">
              Locations
            </a>
            <a href="/old-landing" className="text-gray-600 hover:text-green-600 font-medium transition-colors">
              Ventes
            </a>
          </nav>
          
          {/* Location + Auth */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Conakry</span>
            </div>
            
            {!isCustomerAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <Button 
                  variant="ghost"
                  onClick={() => navigate('/customer/auth')}
                  className="text-gray-700"
                >
                  Se connecter
                </Button>
                <Button 
                  onClick={() => navigate('/customer/auth')}
                  className="bg-green-600 hover:bg-green-700 rounded-xl"
                >
                  S'inscrire
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => navigate('/customer/dashboard')}
                className="bg-green-600 hover:bg-green-700 rounded-xl"
              >
                Mon compte
              </Button>
            )}

            {/* Mobile Location */}
            <div className="flex sm:hidden items-center gap-1 text-gray-600">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Conakry</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section - Desktop */}
        <section className="hidden lg:block bg-gradient-to-br from-green-50 via-white to-blue-50 py-16">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
                  Trouvez le <span className="text-green-600">professionnel</span> idéal près de chez vous
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  Des milliers de professionnels vérifiés en Guinée. Électriciens, plombiers, mécaniciens et plus encore.
                </p>

                {/* Search Bar - Desktop */}
                <form onSubmit={handleSearch} className="mb-8">
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Rechercher un service ou un logement..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-gray-200 bg-white focus:border-green-500 text-base"
                      />
                    </div>
                    <Button 
                      type="submit"
                      className="h-14 px-8 bg-green-600 hover:bg-green-700 rounded-xl text-base font-medium"
                    >
                      Rechercher
                    </Button>
                  </div>
                </form>

                {/* Stats */}
                <div className="flex gap-8">
                  {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div key={idx} className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Icon className="h-5 w-5 text-green-600" />
                          <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                        </div>
                        <span className="text-sm text-gray-500">{stat.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Image */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-3xl blur-3xl"></div>
                <img 
                  src="https://static.prod-images.emergentagent.com/jobs/441dacbc-64b6-4a94-a0a0-6c203d92259e/images/7f16a3034102b625ef7dda2cd3f9a1bfd56294a004a7358179ce0a82240b54e8.png" 
                  alt="Professionnels ServisPro" 
                  className="relative w-full h-auto rounded-3xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Hero Section - Mobile */}
        <section className="lg:hidden px-4 py-6">
          {/* Greeting */}
          {customer && (
            <div className="mb-4">
              <p className="text-gray-500 text-sm">Bonjour,</p>
              <h1 className="text-2xl font-bold text-gray-900">{customer.first_name} 👋</h1>
            </div>
          )}
          {!customer && (
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Bienvenue sur ServisPro 👋</h1>
              <p className="text-gray-500">Trouvez des professionnels près de chez vous</p>
            </div>
          )}

          {/* Hero Image - Mobile */}
          <div className="mb-4 rounded-2xl overflow-hidden">
            <img 
              src="https://static.prod-images.emergentagent.com/jobs/441dacbc-64b6-4a94-a0a0-6c203d92259e/images/7f16a3034102b625ef7dda2cd3f9a1bfd56294a004a7358179ce0a82240b54e8.png" 
              alt="Professionnels ServisPro" 
              className="w-full h-40 object-cover object-top rounded-2xl"
            />
          </div>

          {/* Search Bar - Mobile */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un service ou un logement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-green-500 text-base"
              />
            </div>
          </form>
        </section>

        {/* Two Main Action Buttons */}
        <section className="px-4 lg:px-8 py-6 lg:py-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="hidden lg:block text-3xl font-bold text-gray-900 text-center mb-8">
              Que recherchez-vous ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 max-w-4xl mx-auto">
              <button
                onClick={() => navigate('/browse')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 lg:p-8 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 lg:w-48 lg:h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-xl bg-white/20 flex items-center justify-center mb-3 lg:mb-4">
                        <User className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                      </div>
                      <h3 className="text-xl lg:text-2xl font-bold text-white mb-1 lg:mb-2">Trouver un professionnel</h3>
                      <p className="text-green-100 text-sm lg:text-base">Électriciens, plombiers, mécaniciens...</p>
                    </div>
                    <ArrowRight className="h-6 w-6 lg:h-8 lg:w-8 text-white/70 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/rentals')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-6 lg:p-8 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 lg:w-48 lg:h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-12 w-12 lg:h-16 lg:w-16 rounded-xl bg-white/20 flex items-center justify-center mb-3 lg:mb-4">
                        <Building className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                      </div>
                      <h3 className="text-xl lg:text-2xl font-bold text-white mb-1 lg:mb-2">Trouver une maison</h3>
                      <p className="text-blue-100 text-sm lg:text-base">Locations et ventes immobilières</p>
                    </div>
                    <ArrowRight className="h-6 w-6 lg:h-8 lg:w-8 text-white/70 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="px-4 lg:px-8 py-6 lg:py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h2 className="text-lg lg:text-3xl font-bold text-gray-900">Catégories</h2>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/browse')}
                className="text-green-600 hover:text-green-700 hidden lg:flex"
              >
                Voir tout <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            {/* Mobile Categories - Horizontal Scroll */}
            <div className="flex lg:hidden gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className="flex flex-col items-center gap-2 min-w-[72px] group"
                  >
                    <div className={`h-16 w-16 rounded-2xl ${category.bgColor} flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95`}>
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center">{category.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Categories - Grid */}
            <div className="hidden lg:grid grid-cols-3 xl:grid-cols-6 gap-4">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`group p-6 rounded-2xl ${category.bgColor} border-2 border-transparent hover:border-gray-200 transition-all hover:shadow-lg`}
                  >
                    <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section - Desktop Only */}
        <section className="hidden lg:block px-8 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Vous êtes un professionnel ?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Rejoignez ServisPro et développez votre activité. Recevez des demandes de clients près de chez vous.
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-green-600 hover:bg-green-700 rounded-xl h-12 px-8 text-base"
              >
                Devenir prestataire
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/auth')}
                className="rounded-xl h-12 px-8 text-base border-gray-300"
              >
                En savoir plus
              </Button>
            </div>
          </div>
        </section>

        {/* Quick Actions for Non-Authenticated Users - Mobile */}
        {!isCustomerAuthenticated && (
          <section className="lg:hidden px-4 pb-6">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-2">Créez votre compte</h3>
              <p className="text-gray-600 text-sm mb-4">
                Enregistrez vos favoris et suivez vos demandes facilement
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => navigate('/customer/auth')}
                  className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl h-12"
                >
                  S'inscrire
                </Button>
                <Button 
                  onClick={() => navigate('/customer/auth')}
                  variant="outline"
                  className="flex-1 border-gray-300 rounded-xl h-12"
                >
                  Se connecter
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer - Desktop */}
      <footer className="hidden lg:block bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="font-bold text-xl">ServisPro</span>
              </div>
              <p className="text-gray-400 text-sm">
                La plateforme de services de confiance en Guinée.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/browse" className="hover:text-white">Trouver un professionnel</a></li>
                <li><a href="/rentals" className="hover:text-white">Locations</a></li>
                <li><a href="/old-landing" className="hover:text-white">Ventes immobilières</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Professionnels</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/auth" className="hover:text-white">Devenir prestataire</a></li>
                <li><a href="/auth" className="hover:text-white">Se connecter</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>📍 Conakry, Guinée</li>
                <li>📞 +224 XXX XXX XXX</li>
                <li>✉️ contact@servispro.gn</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            © 2024 ServisPro. Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden bg-white border-t border-gray-100 px-4 py-2 sticky bottom-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <button 
            onClick={() => navigate('/')}
            className="flex flex-col items-center gap-1 py-2 px-4 text-green-600"
          >
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium">Accueil</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=requests') : navigate('/customer/auth')}
            className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400 hover:text-gray-600"
          >
            <ClipboardList className="h-6 w-6" />
            <span className="text-xs font-medium">Demandes</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=messages') : navigate('/customer/auth')}
            className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400 hover:text-gray-600"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs font-medium">Messages</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=favorites') : navigate('/customer/auth')}
            className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400 hover:text-gray-600"
          >
            <Heart className="h-6 w-6" />
            <span className="text-xs font-medium">Favoris</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CustomerHome;
