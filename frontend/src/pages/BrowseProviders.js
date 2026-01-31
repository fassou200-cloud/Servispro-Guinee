import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, MapPin, ShieldCheck, Star, User, LogOut, Search, Filter,
  Truck, Settings, Wrench, Droplet, Hammer, Building, Flame, MoreHorizontal,
  CheckCircle, Clock, Phone, ChevronDown, X, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const translateProfession = (profession, customProfession = null) => {
  // If profession is "Autres" and custom_profession is provided, use it
  if (profession === 'Autres' && customProfession) {
    return customProfession;
  }
  
  const translations = {
    'Electromecanicien': 'Électromécanicien',
    'Mecanicien': 'Mécanicien',
    'Plombier': 'Plombier',
    'Macon': 'Maçon',
    'Menuisier': 'Menuisier',
    'AgentImmobilier': 'Propriétaire immobilier',
    'Soudeur': 'Soudeur',
    'Autres': 'Autres Métiers',
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Other': 'Autres'
  };
  return translations[profession] || profession;
};

const categoryIcons = {
  'Electromecanicien': Settings,
  'Mecanicien': Wrench,
  'Plombier': Droplet,
  'Macon': Hammer,
  'Menuisier': Hammer,
  'AgentImmobilier': Building,
  'Soudeur': Flame,
  'Autres': MoreHorizontal
};

const categoryColors = {
  'Electromecanicien': 'from-purple-500 to-purple-600',
  'Mecanicien': 'from-orange-500 to-orange-600',
  'Plombier': 'from-cyan-500 to-cyan-600',
  'Macon': 'from-amber-500 to-amber-600',
  'Menuisier': 'from-yellow-500 to-yellow-600',
  'AgentImmobilier': 'from-emerald-500 to-emerald-600',
  'Soudeur': 'from-red-500 to-red-600',
  'Autres': 'from-gray-500 to-gray-600'
};

const categories = [
  { value: 'All', label: 'Toutes', icon: Sparkles },
  { value: 'Electromecanicien', label: 'Électromécanicien', icon: Settings },
  { value: 'Mecanicien', label: 'Mécanicien', icon: Wrench },
  { value: 'Plombier', label: 'Plombier', icon: Droplet },
  { value: 'Macon', label: 'Maçon', icon: Hammer },
  { value: 'Menuisier', label: 'Menuisier', icon: Hammer },
  { value: 'AgentImmobilier', label: 'Propriétaire immobilier', icon: Building },
  { value: 'Soudeur', label: 'Soudeur', icon: Flame },
  { value: 'Autres', label: 'Autres', icon: MoreHorizontal }
];

const BrowseProviders = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [providerStats, setProviderStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, selectedCategory, searchQuery, showOnlineOnly]);

  const fetchProviders = async () => {
    try {
      const response = await axios.get(`${API}/providers`);
      setProviders(response.data);
      
      const statsPromises = response.data.map(provider => 
        axios.get(`${API}/reviews/${provider.id}/stats`)
          .then(res => ({ id: provider.id, stats: res.data }))
          .catch(() => ({ id: provider.id, stats: { total_reviews: 0, average_rating: 0 } }))
      );
      
      const stats = await Promise.all(statsPromises);
      const statsMap = {};
      stats.forEach(({ id, stats }) => {
        statsMap[id] = stats;
      });
      setProviderStats(statsMap);
    } catch (error) {
      toast.error('Échec du chargement des prestataires');
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    let filtered = providers;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.profession === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.first_name.toLowerCase().includes(query) ||
        p.last_name.toLowerCase().includes(query) ||
        translateProfession(p.profession).toLowerCase().includes(query)
      );
    }
    
    if (showOnlineOnly) {
      filtered = filtered.filter(p => p.online_status);
    }
    
    setFilteredProviders(filtered);
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    if (value !== 'All') {
      setSearchParams({ category: value });
    } else {
      setSearchParams({});
    }
  };

  const onlineCount = providers.filter(p => p.online_status).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des prestataires...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-heading font-bold text-gray-900">
                  Prestataires
                </h1>
                <p className="text-sm text-gray-500">
                  {filteredProviders.length} disponibles • {onlineCount} en ligne
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {customer ? (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/customer/dashboard')}
                  className="gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                    {customer.first_name[0]}
                  </div>
                  <span className="hidden sm:inline">{customer.first_name}</span>
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/customer/auth')}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                >
                  Connexion
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="bg-white border-b border-gray-100 sticky top-[73px] z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un prestataire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Online Filter */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setShowOnlineOnly(!showOnlineOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                showOnlineOnly 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${showOnlineOnly ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">En ligne uniquement</span>
            </button>
            
            <p className="text-sm text-gray-500">
              {filteredProviders.length} résultat{filteredProviders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {filteredProviders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun prestataire trouvé</h3>
            <p className="text-gray-600 mb-6">Essayez de modifier vos critères de recherche</p>
            <Button onClick={() => { setSelectedCategory('All'); setSearchQuery(''); setShowOnlineOnly(false); }}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => {
              const Icon = categoryIcons[provider.profession] || MoreHorizontal;
              const colorClass = categoryColors[provider.profession] || 'from-gray-500 to-gray-600';
              const stats = providerStats[provider.id];
              
              return (
                <Card
                  key={provider.id}
                  className="group overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white"
                  onClick={() => navigate(`/provider/${provider.id}`)}
                >
                  {/* Header with gradient */}
                  <div className={`h-24 bg-gradient-to-r ${colorClass} relative`}>
                    <div className="absolute -bottom-10 left-6">
                      <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
                        <AvatarImage
                          src={provider.profile_picture ? `${BACKEND_URL}${provider.profile_picture}` : undefined}
                          alt={`${provider.first_name} ${provider.last_name}`}
                        />
                        <AvatarFallback className="text-2xl font-bold bg-white text-gray-700">
                          {provider.first_name[0]}{provider.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      {provider.online_status ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          En ligne
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white/80">
                          <span className="w-2 h-2 rounded-full bg-gray-300" />
                          Hors ligne
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-14 px-6 pb-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                          {provider.first_name} {provider.last_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Icon className="h-4 w-4" />
                          {translateProfession(provider.profession, provider.custom_profession)}
                        </div>
                      </div>
                      
                      {provider.id_verification_picture && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">
                          <ShieldCheck className="h-3 w-3" />
                          Vérifié
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    {stats?.total_reviews > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-gray-900">{stats.average_rating}</span>
                        </div>
                        <span className="text-sm text-gray-500">({stats.total_reviews} avis)</span>
                      </div>
                    )}

                    {/* About */}
                    {provider.about_me && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {provider.about_me}
                      </p>
                    )}

                    {/* Location & Experience Info */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {provider.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs">
                          <MapPin className="h-3 w-3" />
                          {provider.ville || provider.location.split(',')[0]}
                        </span>
                      )}
                      {provider.quartier && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs">
                          {provider.quartier}
                        </span>
                      )}
                      {provider.years_experience && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs">
                          <Clock className="h-3 w-3" />
                          {provider.years_experience === '0-1' && "<1 an"}
                          {provider.years_experience === '1-2' && '1-2 ans'}
                          {provider.years_experience === '2-5' && '2-5 ans'}
                          {provider.years_experience === '5-10' && '5-10 ans'}
                          {provider.years_experience === '10-15' && '10-15 ans'}
                          {provider.years_experience === '15-20' && '15-20 ans'}
                          {provider.years_experience === '20+' && '20+ ans'}
                        </span>
                      )}
                    </div>

                    {/* Pricing - Not for Agent Immobilier */}
                    {provider.profession !== 'AgentImmobilier' && provider.price && (
                      <div className="flex items-center gap-4 mb-4 p-3 bg-amber-50 rounded-xl">
                        <div className="text-sm">
                          <span className="text-amber-700">Tarif: </span>
                          <span className="font-bold text-amber-900">{Number(provider.price).toLocaleString('fr-FR')} GNF</span>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    {provider.profession === 'AgentImmobilier' ? (
                      <Button
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/rentals');
                        }}
                      >
                        <Building className="h-4 w-4 mr-2" />
                        Voir les Locations
                      </Button>
                    ) : provider.online_status ? (
                      <Button
                        className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/provider/${provider.id}`);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Demander un Service
                      </Button>
                    ) : (
                      <Button
                        className="w-full rounded-xl"
                        variant="secondary"
                        disabled
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Indisponible
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseProviders;
