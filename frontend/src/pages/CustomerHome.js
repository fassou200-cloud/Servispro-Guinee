import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { 
  Search, MapPin, Zap, Wrench, Droplet, Home, Heart,
  MessageCircle, ClipboardList, User, Building, Hammer, ChevronRight
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
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="font-bold text-xl text-gray-900">ServisPro</span>
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
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full">
        {/* Hero Section - Centered */}
        <div className="bg-gradient-to-b from-green-50 to-white rounded-2xl md:rounded-3xl mb-6 md:mb-8">
          <div className="text-center pt-6 md:pt-8 px-4">
            <h1 className="text-gray-900 font-bold text-xl md:text-3xl mb-2">Des experts à votre service</h1>
            <p className="text-gray-600 text-sm md:text-base">Électriciens, plombiers, mécaniciens...</p>
          </div>
          <div className="flex justify-center px-4 py-4 md:py-6">
            <img 
              src="https://customer-assets.emergentagent.com/job_servispro-guinea-3/artifacts/26crrdv7_image.png"
              alt="Équipe de professionnels ServisPro - Électricien, Plombier, Mécanicien"
              className="w-full max-w-xs md:max-w-md h-44 md:h-64 object-contain"
            />
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6 md:mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 md:h-14 pl-12 pr-4 rounded-xl border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 text-base"
            />
          </div>
        </form>

        {/* Two Main Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-10">
          <button
            onClick={() => navigate('/browse')}
            data-testid="find-professional-btn"
            className="w-full flex items-center gap-4 p-4 md:p-5 bg-green-600 hover:bg-green-700 rounded-xl md:rounded-2xl transition-all active:scale-[0.98]"
          >
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-lg md:rounded-xl bg-white/20 flex items-center justify-center">
              <User className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-base md:text-lg font-bold text-white">Trouver un professionnel</h3>
              <p className="text-green-100 text-sm">Électriciens, plombiers...</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/70" />
          </button>

          <button
            onClick={() => navigate('/rentals')}
            data-testid="find-house-btn"
            className="w-full flex items-center gap-4 p-4 md:p-5 bg-blue-600 hover:bg-blue-700 rounded-xl md:rounded-2xl transition-all active:scale-[0.98]"
          >
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-lg md:rounded-xl bg-white/20 flex items-center justify-center">
              <Building className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-base md:text-lg font-bold text-white">Trouver une maison</h3>
              <p className="text-blue-100 text-sm">Locations et appartements</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {/* Categories Section */}
        <div className="mb-8 md:mb-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Catégories</h2>
          <div className="flex justify-between md:justify-center md:gap-12">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  data-testid={`category-${category.id}-btn`}
                  className="flex flex-col items-center gap-2 md:gap-3 group"
                >
                  <div className={`h-14 w-14 md:h-18 md:w-18 rounded-full ${category.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-active:scale-95 transition-transform`}>
                    <Icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-gray-700">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign Up CTA */}
        {!isCustomerAuthenticated && (
          <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-1 md:text-lg">Créez votre compte</h3>
            <p className="text-gray-600 text-sm md:text-base mb-3 md:mb-4">
              Suivez vos demandes et enregistrez vos favoris
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/customer/auth')}
                data-testid="signup-btn"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 md:py-3 rounded-lg md:rounded-xl transition-colors text-sm md:text-base"
              >
                S'inscrire
              </button>
              <button 
                onClick={() => navigate('/customer/auth')}
                data-testid="login-btn"
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 md:py-3 rounded-lg md:rounded-xl hover:bg-gray-100 transition-colors text-sm md:text-base"
              >
                Se connecter
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 px-4 py-3 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
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
    </div>
  );
};

export default CustomerHome;
