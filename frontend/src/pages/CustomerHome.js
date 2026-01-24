import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, MapPin, Zap, Wrench, Droplet, Settings, Home, Heart,
  MessageCircle, ClipboardList, User, ChevronRight, Building, Hammer
} from 'lucide-react';
import axios from 'axios';

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
      bgColor: 'bg-yellow-50'
    },
    { 
      id: 'Plombier', 
      name: 'Plombier', 
      icon: Droplet, 
      color: 'from-blue-400 to-cyan-500',
      bgColor: 'bg-blue-50'
    },
    { 
      id: 'Mecanicien', 
      name: 'Mécanicien', 
      icon: Wrench, 
      color: 'from-orange-400 to-red-500',
      bgColor: 'bg-orange-50'
    },
    { 
      id: 'Macon', 
      name: 'Maçon', 
      icon: Hammer, 
      color: 'from-amber-400 to-yellow-600',
      bgColor: 'bg-amber-50'
    },
    { 
      id: 'location', 
      name: 'Location', 
      icon: Home, 
      color: 'from-emerald-400 to-green-500',
      bgColor: 'bg-emerald-50'
    },
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
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-xl text-gray-900">ServisPro</span>
          </div>
          
          {/* Location */}
          <div className="flex items-center gap-1 text-gray-600">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Conakry</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Greeting */}
        {customer && (
          <div className="mb-6">
            <p className="text-gray-500 text-sm">Bonjour,</p>
            <h1 className="text-2xl font-bold text-gray-900">{customer.first_name} 👋</h1>
          </div>
        )}
        {!customer && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenue sur ServisPro 👋</h1>
            <p className="text-gray-500">Trouvez des professionnels près de chez vous</p>
          </div>
        )}

        {/* Hero Image */}
        <div className="mb-6 rounded-2xl overflow-hidden">
          <img 
            src="https://static.prod-images.emergentagent.com/jobs/441dacbc-64b6-4a94-a0a0-6c203d92259e/images/7f16a3034102b625ef7dda2cd3f9a1bfd56294a004a7358179ce0a82240b54e8.png" 
            alt="Professionnels ServisPro" 
            className="w-full h-40 object-cover object-top rounded-2xl"
          />
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
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

        {/* Two Main Action Buttons */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <button
            onClick={() => navigate('/browse')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Trouver un professionnel</h3>
                  <p className="text-green-100 text-sm">Électriciens, plombiers, mécaniciens...</p>
                </div>
                <ChevronRight className="h-6 w-6 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/rentals')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Trouver une maison</h3>
                  <p className="text-blue-100 text-sm">Locations et ventes immobilières</p>
                </div>
                <ChevronRight className="h-6 w-6 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>

        {/* Categories Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Catégories</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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
        </div>

        {/* Quick Actions for Non-Authenticated Users */}
        {!isCustomerAuthenticated && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 mb-6">
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
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 px-4 py-2 sticky bottom-0 z-50">
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
