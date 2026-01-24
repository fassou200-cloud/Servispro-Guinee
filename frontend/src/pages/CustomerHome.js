import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { 
  Search, MapPin, Zap, Wrench, Droplet, Home, Heart,
  MessageCircle, ClipboardList, User, Building, Hammer, ChevronRight, Star, Shield, Clock
} from 'lucide-react';

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

  // Categories
  const categories = [
    { id: 'Electromecanicien', name: 'Électricien', icon: Zap, color: 'bg-yellow-500' },
    { id: 'Plombier', name: 'Plombier', icon: Droplet, color: 'bg-blue-500' },
    { id: 'Mecanicien', name: 'Mécanicien', icon: Wrench, color: 'bg-orange-500' },
    { id: 'Macon', name: 'Maçon', icon: Hammer, color: 'bg-amber-600' },
    { id: 'location', name: 'Location', icon: Home, color: 'bg-green-500' },
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
      <header className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="font-bold text-xl text-gray-900">ServisPro</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('/browse')} className="text-gray-600 hover:text-green-600 font-medium transition-colors">
              Professionnels
            </button>
            <button onClick={() => navigate('/rentals')} className="text-gray-600 hover:text-green-600 font-medium transition-colors">
              Locations
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Conakry</span>
            </div>
            {!isCustomerAuthenticated && (
              <button 
                onClick={() => navigate('/customer/auth')}
                className="hidden md:block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section - Desktop */}
        <div className="hidden md:block relative bg-gradient-to-br from-green-600 to-green-700 overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 py-16 flex items-center gap-12">
            {/* Left Content */}
            <div className="flex-1 text-white z-10">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Des experts à votre service en Guinée
              </h1>
              <p className="text-lg text-green-100 mb-8 max-w-lg">
                Trouvez rapidement des professionnels qualifiés : électriciens, plombiers, mécaniciens et bien plus encore.
              </p>
              
              {/* Search Bar Desktop */}
              <form onSubmit={handleSearch} className="mb-8">
                <div className="relative max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher un service ou un logement…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-14 pl-12 pr-32 rounded-xl border-0 bg-white text-gray-900 text-base shadow-lg"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    Rechercher
                  </button>
                </div>
              </form>

              {/* Stats */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">500+ Professionnels</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-300" />
                  <span className="font-semibold">Vérifiés</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-300" />
                  <span className="font-semibold">Disponibles 24/7</span>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="flex-1 relative">
              <img 
                src="https://images.unsplash.com/photo-1622611935038-1c4caa0db5d2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwyfHxkaXZlcnNlJTIwdGVhbSUyMHdvcmtlcnMlMjBwcm9mZXNzaW9uYWxzJTIwY29uc3RydWN0aW9uJTIwZWxlY3RyaWNpYW4lMjBwbHVtYmVyJTIwdG9nZXRoZXJ8ZW58MHx8fHwxNzY5Mjg1MDMyfDA&ixlib=rb-4.1.0&q=85&w=800"
                alt="Équipe de professionnels ServisPro"
                className="w-full h-80 object-cover rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">+1000</p>
                    <p className="text-sm text-gray-500">Clients satisfaits</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-green-500 opacity-20 rounded-l-full"></div>
        </div>

        {/* Hero Section - Mobile */}
        <div className="md:hidden">
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1622611935038-1c4caa0db5d2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwyfHxkaXZlcnNlJTIwdGVhbSUyMHdvcmtlcnMlMjBwcm9mZXNzaW9uYWxzJTIwY29uc3RydWN0aW9uJTIwZWxlY3RyaWNpYW4lMjBwbHVtYmVyJTIwdG9nZXRoZXJ8ZW58MHx8fHwxNzY5Mjg1MDMyfDA&ixlib=rb-4.1.0&q=85&w=800"
              alt="Équipe de professionnels ServisPro"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end p-4">
              <div>
                <h1 className="text-white font-bold text-xl">Des experts à votre service</h1>
                <p className="text-white/80 text-sm">Électriciens, plombiers, mécaniciens...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="md:hidden px-4 py-6">
          {/* Search Bar Mobile */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un service…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 text-base"
              />
            </div>
          </form>

          {/* Two Main Buttons - Mobile */}
          <div className="space-y-3 mb-8">
            <button
              onClick={() => navigate('/browse')}
              data-testid="find-professional-btn"
              className="w-full flex items-center gap-4 p-4 bg-green-600 hover:bg-green-700 rounded-xl transition-all active:scale-[0.98]"
            >
              <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-base font-bold text-white">Trouver un professionnel</h3>
                <p className="text-green-100 text-sm">Électriciens, plombiers...</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70" />
            </button>

            <button
              onClick={() => navigate('/rentals')}
              data-testid="find-house-btn"
              className="w-full flex items-center gap-4 p-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all active:scale-[0.98]"
            >
              <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-base font-bold text-white">Trouver une maison</h3>
                <p className="text-blue-100 text-sm">Locations et appartements</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70" />
            </button>
          </div>

          {/* Categories Mobile */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Catégories</h2>
            <div className="flex justify-between">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    data-testid={`category-${category.id}-btn`}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`h-14 w-14 rounded-full ${category.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-active:scale-95 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sign Up CTA Mobile */}
          {!isCustomerAuthenticated && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-1">Créez votre compte</h3>
              <p className="text-gray-600 text-sm mb-3">
                Suivez vos demandes et enregistrez vos favoris
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate('/customer/auth')}
                  data-testid="signup-btn"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                >
                  S'inscrire
                </button>
                <button 
                  onClick={() => navigate('/customer/auth')}
                  data-testid="login-btn"
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  Se connecter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Content */}
        <div className="hidden md:block py-16">
          <div className="max-w-6xl mx-auto px-6">
            {/* Services Section */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Nos Services</h2>
              <p className="text-gray-500 text-center mb-8">Trouvez le professionnel qu'il vous faut</p>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Find Professional Card */}
                <button
                  onClick={() => navigate('/browse')}
                  data-testid="desktop-find-professional-btn"
                  className="group bg-white border-2 border-gray-100 hover:border-green-500 rounded-2xl p-6 text-left transition-all hover:shadow-lg"
                >
                  <div className="h-14 w-14 rounded-xl bg-green-100 flex items-center justify-center mb-4 group-hover:bg-green-500 transition-colors">
                    <User className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Professionnels</h3>
                  <p className="text-sm text-gray-500">Électriciens, plombiers, mécaniciens...</p>
                </button>

                {/* Find House Card */}
                <button
                  onClick={() => navigate('/rentals')}
                  data-testid="desktop-find-house-btn"
                  className="group bg-white border-2 border-gray-100 hover:border-blue-500 rounded-2xl p-6 text-left transition-all hover:shadow-lg"
                >
                  <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                    <Building className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Immobilier</h3>
                  <p className="text-sm text-gray-500">Locations et appartements</p>
                </button>

                {/* My Requests Card */}
                <button
                  onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=requests') : navigate('/customer/auth')}
                  data-testid="desktop-requests-btn"
                  className="group bg-white border-2 border-gray-100 hover:border-purple-500 rounded-2xl p-6 text-left transition-all hover:shadow-lg"
                >
                  <div className="h-14 w-14 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                    <ClipboardList className="h-7 w-7 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Mes demandes</h3>
                  <p className="text-sm text-gray-500">Suivez vos demandes en cours</p>
                </button>

                {/* Messages Card */}
                <button
                  onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=messages') : navigate('/customer/auth')}
                  data-testid="desktop-messages-btn"
                  className="group bg-white border-2 border-gray-100 hover:border-orange-500 rounded-2xl p-6 text-left transition-all hover:shadow-lg"
                >
                  <div className="h-14 w-14 rounded-xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-orange-500 transition-colors">
                    <MessageCircle className="h-7 w-7 text-orange-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Messages</h3>
                  <p className="text-sm text-gray-500">Communiquez avec vos prestataires</p>
                </button>
              </div>
            </div>

            {/* Categories Section Desktop */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Catégories populaires</h2>
              <p className="text-gray-500 text-center mb-8">Les services les plus demandés</p>
              
              <div className="flex justify-center gap-8">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      data-testid={`desktop-category-${category.id}-btn`}
                      className="flex flex-col items-center gap-3 group"
                    >
                      <div className={`h-20 w-20 rounded-2xl ${category.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="h-9 w-9 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA Section Desktop */}
            {!isCustomerAuthenticated && (
              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-center text-white">
                <h2 className="text-2xl font-bold mb-2">Rejoignez ServisPro</h2>
                <p className="text-green-100 mb-6 max-w-lg mx-auto">
                  Créez votre compte gratuit et accédez à tous nos services professionnels
                </p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => navigate('/customer/auth')}
                    data-testid="desktop-signup-btn"
                    className="bg-white text-green-600 hover:bg-green-50 font-semibold px-8 py-3 rounded-xl transition-colors"
                  >
                    Créer un compte
                  </button>
                  <button 
                    onClick={() => navigate('/customer/auth')}
                    data-testid="desktop-login-btn"
                    className="border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-xl transition-colors"
                  >
                    Se connecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden bg-white border-t border-gray-200 px-4 py-3 sticky bottom-0">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/')}
            data-testid="nav-home-btn"
            className="flex flex-col items-center gap-1 text-green-600"
          >
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium">Accueil</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=requests') : navigate('/customer/auth')}
            data-testid="nav-requests-btn"
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600"
          >
            <ClipboardList className="h-6 w-6" />
            <span className="text-xs font-medium">Demandes</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=messages') : navigate('/customer/auth')}
            data-testid="nav-messages-btn"
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs font-medium">Messages</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=favorites') : navigate('/customer/auth')}
            data-testid="nav-favorites-btn"
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600"
          >
            <Heart className="h-6 w-6" />
            <span className="text-xs font-medium">Favoris</span>
          </button>
        </div>
      </nav>

      {/* Footer - Desktop Only */}
      <footer className="hidden md:block bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="font-bold text-gray-900">ServisPro</span>
            </div>
            <p className="text-gray-500 text-sm">© 2025 ServisPro Guinée. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerHome;
