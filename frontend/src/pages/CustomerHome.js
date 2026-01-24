import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Users, Star, Shield, Clock, ChevronRight, User, Building,
  Zap, Droplet, Wrench, Hammer, Home
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="font-bold text-xl text-gray-900">ServisPro</span>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => navigate('/browse')}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Professionnels
            </button>
            <button 
              onClick={() => navigate('/rentals')}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Locations
            </button>
            <button 
              onClick={() => navigate('/property-sales')}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Ventes
            </button>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 text-gray-600">
              <MapPin className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Conakry</span>
            </div>
            
            {!isCustomerAuthenticated ? (
              <>
                <button 
                  onClick={() => navigate('/customer/auth')}
                  className="hidden md:block text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Se connecter
                </button>
                <button 
                  onClick={() => navigate('/customer/auth')}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  S'inscrire
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/customer/dashboard')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Mon compte
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
                Trouvez le <span className="text-green-500">professionnel</span>
                <br />
                idéal près de chez vous
              </h1>
              <p className="text-gray-600 text-base md:text-lg mb-8 max-w-xl mx-auto lg:mx-0">
                Des milliers de professionnels vérifiés en Guinée. Électriciens, plombiers, mécaniciens et plus encore.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="mb-8 max-w-xl mx-auto lg:mx-0">
                <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center flex-1 px-4">
                    <Search className="h-5 w-5 text-gray-400 mr-3" />
                    <input
                      type="text"
                      placeholder="Rechercher un service ou un logement..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 h-12 md:h-14 bg-transparent border-0 focus:outline-none text-gray-900 text-sm md:text-base placeholder-gray-400"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 md:py-4 font-medium transition-colors"
                  >
                    Rechercher
                  </button>
                </div>
              </form>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 md:gap-8">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  <div>
                    <span className="font-bold text-gray-900">500+</span>
                    <p className="text-xs text-gray-500">Professionnels</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-green-500" />
                  <div>
                    <span className="font-bold text-gray-900">4.8</span>
                    <p className="text-xs text-gray-500">Note moyenne</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <span className="font-bold text-gray-900">100%</span>
                    <p className="text-xs text-gray-500">Vérifiés</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <span className="font-bold text-gray-900">24h</span>
                    <p className="text-xs text-gray-500">Réponse rapide</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Illustration */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-200 to-blue-200 rounded-3xl blur-2xl opacity-50"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl p-6 md:p-8">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_servispro-guinea-3/artifacts/26crrdv7_image.png"
                    alt="Équipe de professionnels ServisPro - Électricien, Plombier, Mécanicien"
                    className="w-full max-w-sm md:max-w-lg h-auto object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-10 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-8">
            Catégories populaires
          </h2>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            <button
              onClick={() => navigate('/browse?category=Electromecanicien')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-16 w-16 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Électricien</span>
            </button>
            <button
              onClick={() => navigate('/browse?category=Plombier')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Droplet className="h-7 w-7 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Plombier</span>
            </button>
            <button
              onClick={() => navigate('/browse?category=Mecanicien')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-16 w-16 rounded-full bg-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Wrench className="h-7 w-7 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Mécanicien</span>
            </button>
            <button
              onClick={() => navigate('/browse?category=Macon')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-16 w-16 rounded-full bg-amber-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Hammer className="h-7 w-7 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Maçon</span>
            </button>
            <button
              onClick={() => navigate('/rentals')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Home className="h-7 w-7 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Location</span>
            </button>
          </div>
        </div>
      </section>

      {/* What are you looking for Section */}
      <section className="py-12 md:py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 md:mb-12">
            Que recherchez-vous ?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Find Professional Card */}
            <button
              onClick={() => navigate('/browse')}
              data-testid="find-professional-card"
              className="group relative bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 md:p-8 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                Trouver un professionnel
              </h3>
              <p className="text-green-100 text-sm md:text-base">
                Électriciens, plombiers, mécaniciens...
              </p>
              <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-white/70 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Find House Card */}
            <button
              onClick={() => navigate('/rentals')}
              data-testid="find-house-card"
              className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 md:p-8 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Building className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                Trouver une maison
              </h3>
              <p className="text-blue-100 text-sm md:text-base">
                Locations et ventes immobilières
              </p>
              <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-white/70 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-center md:justify-end">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="h-6 w-6 rounded-lg bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span>Made by ServisPro</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerHome;
