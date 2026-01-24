import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, MapPin, Zap, Wrench, Droplet, Settings, Home, Heart,
  MessageCircle, ClipboardList, User, Building, Hammer
} from 'lucide-react';

const CustomerHome = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Categories for quick access - exactly 5 as specified
  const categories = [
    { 
      id: 'Electromecanicien', 
      name: 'Électricien', 
      icon: Zap, 
      emoji: '⚡'
    },
    { 
      id: 'Plombier', 
      name: 'Plombier', 
      icon: Droplet, 
      emoji: '🚿'
    },
    { 
      id: 'Mecanicien', 
      name: 'Mécanicien', 
      icon: Wrench, 
      emoji: '🔧'
    },
    { 
      id: 'Autres', 
      name: 'Handyman', 
      icon: Settings, 
      emoji: '🛠️'
    },
    { 
      id: 'location', 
      name: 'Location', 
      icon: Home, 
      emoji: '🏠'
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Clean and Simple */}
      <header className="bg-white shadow-sm px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo ServisPro */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-xl text-gray-900">ServisPro</span>
          </div>

          {/* Location Icon */}
          <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">📍 Conakry</span>
          </div>
        </div>
      </header>

      {/* Main Content - No Scrolling Design */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un service ou un logement…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-gray-200 bg-white focus:border-green-500 text-base shadow-sm"
              />
            </div>
          </form>

          {/* Two Main Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => navigate('/browse')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">✅ Trouver un professionnel</h3>
                  <p className="text-green-100 text-sm">Électriciens, plombiers, mécaniciens...</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/rentals')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">✅ Trouver une maison/appartement</h3>
                  <p className="text-blue-100 text-sm">Locations et ventes immobilières</p>
                </div>
              </div>
            </button>
          </div>

          {/* Categories - Round Icons */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Catégories</h2>
            <div className="flex justify-center gap-6">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 shadow-md">
                      <span className="text-2xl">{category.emoji}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Navigation - Mobile Menu */}
      <nav className="bg-white border-t border-gray-200 px-4 py-2 sticky bottom-0 z-50 shadow-lg">
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
