import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Zap, Wrench, Droplet, Home, Heart,
  MessageCircle, ClipboardList, User, Building, Hammer, ChevronRight, Star, Shield, Clock, Briefcase
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
      <header className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-lg text-gray-900">ServisPro</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/auth')}
              className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors"
            >
              Devenir prestataire
            </button>
            <button 
              onClick={() => navigate('/company/auth')}
              className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors"
            >
              Entreprise
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
              <MapPin className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium">Conakry</span>
            </div>
            {!isCustomerAuthenticated && (
              <button 
                onClick={() => navigate('/customer/auth')}
                className="hidden md:block bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Green Hero Section - Compact */}
        <div className="bg-green-600">
          <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-center md:gap-8">
              {/* Left: Text + Search */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-white font-bold text-xl md:text-3xl mb-2 leading-tight">
                  Des experts à votre service en Guinée
                </h1>
                <p className="text-green-100 text-sm md:text-base mb-4 max-w-lg mx-auto md:mx-0">
                  Trouvez rapidement des professionnels qualifiés : électriciens, plombiers, mécaniciens et bien plus encore.
                </p>
                
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="mb-4">
                  <div className="relative bg-white rounded-xl p-1 shadow-lg max-w-lg mx-auto md:mx-0">
                    <div className="flex items-center">
                      <Search className="ml-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 h-9 md:h-10 px-3 bg-transparent border-0 focus:outline-none text-gray-900 text-sm placeholder-gray-400"
                      />
                      <button 
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        Rechercher
                      </button>
                    </div>
                  </div>
                </form>

                {/* Stats */}
                <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap text-white">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium text-xs md:text-sm">500+ Pros</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-green-300" />
                    <span className="font-medium text-xs md:text-sm">Vérifiés</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-green-300" />
                    <span className="font-medium text-xs md:text-sm">24/7</span>
                  </div>
                </div>
              </div>

              {/* Right: Illustration */}
              <div className="hidden md:block flex-shrink-0">
                <img 
                  src="https://customer-assets.emergentagent.com/job_servispro-guinea-3/artifacts/26crrdv7_image.png"
                  alt="Équipe de professionnels ServisPro"
                  className="w-64 h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Illustration - Small */}
        <div className="md:hidden bg-gradient-to-b from-green-50 to-white py-4">
          <div className="flex justify-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_servispro-guinea-3/artifacts/26crrdv7_image.png"
              alt="Équipe de professionnels ServisPro"
              className="w-48 h-auto object-contain"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => navigate('/browse')}
              data-testid="find-professional-btn"
              className="flex items-center gap-3 p-3 md:p-4 bg-green-600 hover:bg-green-700 rounded-xl transition-all active:scale-[0.98]"
            >
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-white/20 flex items-center justify-center">
                <User className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm md:text-base font-bold text-white truncate">Trouver un pro</h3>
                <p className="text-green-100 text-xs truncate">Électriciens, plombiers...</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/rentals')}
              data-testid="find-house-btn"
              className="flex items-center gap-3 p-3 md:p-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all active:scale-[0.98]"
            >
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-white/20 flex items-center justify-center">
                <Building className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm md:text-base font-bold text-white truncate">Trouver une maison</h3>
                <p className="text-blue-100 text-xs truncate">Locations</p>
              </div>
            </button>
          </div>

          {/* Categories Section */}
          <div className="mb-6">
            <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3">Catégories</h2>
            <div className="flex justify-between md:justify-start md:gap-8">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    data-testid={`category-${category.id}-btn`}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className={`h-12 w-12 md:h-14 md:w-14 rounded-full ${category.color} flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-transform`}>
                      <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-gray-700">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider/Company Links - Mobile Only */}
          <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-gray-900">Devenir prestataire</h3>
                <p className="text-[10px] text-gray-500">Rejoignez-nous</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/company/auth')}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-gray-900">Entreprise</h3>
                <p className="text-[10px] text-gray-500">Espace pro</p>
              </div>
            </button>
          </div>

          {/* Sign Up CTA */}
          {!isCustomerAuthenticated && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-bold text-gray-900 text-sm mb-1">Créez votre compte</h3>
              <p className="text-gray-600 text-xs mb-3">
                Suivez vos demandes et enregistrez vos favoris
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/customer/auth')}
                  data-testid="signup-btn"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
                >
                  S'inscrire
                </button>
                <button 
                  onClick={() => navigate('/customer/auth')}
                  data-testid="login-btn"
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  Se connecter
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 px-4 py-2 sticky bottom-0">
        <div className="max-w-5xl mx-auto flex items-center justify-around">
          <button 
            onClick={() => navigate('/')}
            data-testid="nav-home-btn"
            className="flex flex-col items-center gap-0.5 text-green-600"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Accueil</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=requests') : navigate('/customer/auth')}
            data-testid="nav-requests-btn"
            className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600"
          >
            <ClipboardList className="h-5 w-5" />
            <span className="text-[10px] font-medium">Demandes</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=messages') : navigate('/customer/auth')}
            data-testid="nav-messages-btn"
            className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium">Messages</span>
          </button>
          
          <button 
            onClick={() => isCustomerAuthenticated ? navigate('/customer/dashboard?tab=favorites') : navigate('/customer/auth')}
            data-testid="nav-favorites-btn"
            className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600"
          >
            <Heart className="h-5 w-5" />
            <span className="text-[10px] font-medium">Favoris</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CustomerHome;
