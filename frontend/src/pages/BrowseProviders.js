import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, MapPin, ShieldCheck, Star, User, LogOut, Search, Filter,
  Truck, Settings, Wrench, Droplet, Hammer, Building, Flame, MoreHorizontal,
  CheckCircle, Clock, Phone, ChevronDown, X, Sparkles, Zap, Home, Briefcase, Calendar,
  Car, Paintbrush
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/imageUrl';
import { professionGroups } from '@/data/professions';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper function to capitalize first letter
const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Options d'expérience
const experienceOptions = [
  { value: '', label: 'Toutes' },
  { value: '0-2', label: '0-2 ans' },
  { value: '2-5', label: '2-5 ans' },
  { value: '5-10', label: '5-10 ans' },
  { value: '10+', label: '10+ ans' }
];

const translateProfession = (profession, customProfession = null) => {
  // If profession is "Autres" and custom_profession is provided, use it
  if (profession === 'Autres' && customProfession) {
    return customProfession;
  }
  
  const translations = {
    'ElectricienBatiment': 'Électricien bâtiment',
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
  'Électricien bâtiment': Zap,
  'Électromécanicien': Settings,
  'Mécanicien': Wrench,
  'Mécanicien automobile': Car,
  'Plombier': Droplet,
  'Maçon': Hammer,
  'Menuisier': Hammer,
  'Soudeur': Flame,
  'Chauffeur': Truck,
  'Vitrier': Building,
  'Ferrailleur': Hammer,
  'Femme de ménage': Home,
  'Manœuvre de chantier': Hammer,
  'Peintre en bâtiment': Paintbrush,
  'Autres': MoreHorizontal
};

const categoryColors = {
  'Électricien bâtiment': 'from-blue-500 to-blue-600',
  'Électromécanicien': 'from-purple-500 to-purple-600',
  'Mécanicien': 'from-orange-500 to-orange-600',
  'Mécanicien automobile': 'from-rose-500 to-rose-600',
  'Plombier': 'from-cyan-500 to-cyan-600',
  'Maçon': 'from-amber-500 to-amber-600',
  'Menuisier': 'from-yellow-500 to-yellow-600',
  'Soudeur': 'from-red-500 to-red-600',
  'Chauffeur': 'from-indigo-500 to-indigo-600',
  'Vitrier': 'from-sky-500 to-sky-600',
  'Ferrailleur': 'from-slate-500 to-slate-600',
  'Femme de ménage': 'from-pink-500 to-pink-600',
  'Manœuvre de chantier': 'from-stone-500 to-stone-600',
  'Peintre en bâtiment': 'from-teal-500 to-teal-600',
  'Autres': 'from-gray-500 to-gray-600'
};

const categories = [
  { value: 'All', label: 'Toutes', icon: Sparkles },
  { value: 'Électricien bâtiment', label: 'Électricien bâtiment', icon: Zap },
  { value: 'Électromécanicien', label: 'Électromécanicien', icon: Settings },
  { value: 'Mécanicien', label: 'Mécanicien', icon: Wrench },
  { value: 'Mécanicien automobile', label: 'Mécanicien auto', icon: Car },
  { value: 'Plombier', label: 'Plombier', icon: Droplet },
  { value: 'Maçon', label: 'Maçon', icon: Hammer },
  { value: 'Menuisier', label: 'Menuisier', icon: Hammer },
  { value: 'Soudeur', label: 'Soudeur', icon: Flame },
  { value: 'Peintre en bâtiment', label: 'Peintre bâtiment', icon: Paintbrush },
  { value: 'Chauffeur', label: 'Chauffeur', icon: Truck },
  { value: 'Vitrier', label: 'Vitrier', icon: Building },
  { value: 'Ferrailleur', label: 'Ferrailleur', icon: Hammer },
  { value: 'Femme de ménage', label: 'Femme de ménage', icon: Home },
  { value: 'Manœuvre de chantier', label: 'Manœuvre de chantier', icon: Hammer },
  { value: 'Autres', label: 'Autres', icon: MoreHorizontal }
];

const BrowseProviders = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [providerStats, setProviderStats] = useState({});
  const [interimStats, setInterimStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [customer, setCustomer] = useState(null);
  
  // Advanced filters
  const [selectedVille, setSelectedVille] = useState('');
  const [selectedQuartier, setSelectedQuartier] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Get all unique professions from professionGroups
  const allProfessions = useMemo(() => {
    return professionGroups.flatMap(group => group.professions.map(p => p.name)).sort((a, b) => a.localeCompare(b, 'fr'));
  }, []);

  // Extract unique villes from providers data (dynamic)
  // Excludes entries ending with "_ville" from display but keeps filtering functional
  const availableVilles = useMemo(() => {
    const villesSet = new Set();
    providers.forEach(p => {
      if (p.ville) {
        const ville = capitalizeFirst(p.ville);
        // Skip entries ending with "_ville"
        if (!ville.toLowerCase().endsWith('_ville')) {
          villesSet.add(ville);
        }
      }
      if (p.region) {
        const region = capitalizeFirst(p.region);
        // Skip entries ending with "_ville"
        if (!region.toLowerCase().endsWith('_ville')) {
          villesSet.add(region);
        }
      }
    });
    return Array.from(villesSet).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [providers]);

  // Extract unique quartiers from providers data (dynamic, filtered by selected ville)
  const availableQuartiers = useMemo(() => {
    const quartiersSet = new Set();
    providers.forEach(p => {
      // Include quartier if it matches the selected ville (case-insensitive)
      const providerVille = (p.ville || p.region || '').toLowerCase();
      const selectedVilleLower = selectedVille.toLowerCase();
      
      if (!selectedVille || providerVille.includes(selectedVilleLower) || selectedVilleLower.includes(providerVille)) {
        if (p.quartier) quartiersSet.add(p.quartier);
        if (p.commune) quartiersSet.add(capitalizeFirst(p.commune));
      }
    });
    return Array.from(quartiersSet).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [providers, selectedVille]);

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
  }, [providers, selectedCategory, searchQuery, showOnlineOnly, selectedVille, selectedQuartier, selectedProfession, selectedExperience]);

  const fetchProviders = async () => {
    try {
      const response = await axios.get(`${API}/providers`);
      setProviders(response.data);

      const statsPromises = response.data.map(provider =>
        axios.get(`${API}/reviews/${provider.id}/stats`)
          .then(res => ({ id: provider.id, stats: res.data }))
          .catch(() => ({ id: provider.id, stats: { total_reviews: 0, average_rating: 0 } }))
      );
      const interimPromises = response.data.map(provider =>
        axios.get(`${API}/interim/ratings/provider/${provider.id}`)
          .then(res => ({ id: provider.id, stats: res.data }))
          .catch(() => ({ id: provider.id, stats: { count: 0, average: 0 } }))
      );

      const [stats, interim] = await Promise.all([
        Promise.all(statsPromises),
        Promise.all(interimPromises),
      ]);
      const statsMap = {};
      stats.forEach(({ id, stats }) => { statsMap[id] = stats; });
      setProviderStats(statsMap);
      const interimMap = {};
      interim.forEach(({ id, stats }) => { interimMap[id] = stats; });
      setInterimStats(interimMap);
    } catch (error) {
      toast.error('Échec du chargement des prestataires');
    } finally {
      setLoading(false);
    }
  };

  const combinedRating = (provider) => {
    const cs = providerStats[provider.id] || { total_reviews: 0, average_rating: 0 };
    const is_ = interimStats[provider.id] || { count: 0, average: 0 };
    const cCount = cs.total_reviews || 0;
    const iCount = is_.count || 0;
    const total = cCount + iCount;
    if (total === 0) return null;
    const avg = ((cs.average_rating || 0) * cCount + (is_.average || 0) * iCount) / total;
    return { avg: Math.round(avg * 10) / 10, total, cCount, iCount };
  };

  const filterProviders = () => {
    let filtered = providers;
    
    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.profession === selectedCategory);
    }
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.first_name.toLowerCase().includes(query) ||
        p.last_name.toLowerCase().includes(query) ||
        translateProfession(p.profession).toLowerCase().includes(query)
      );
    }
    
    // Online filter
    if (showOnlineOnly) {
      filtered = filtered.filter(p => p.online_status);
    }
    
    // Ville filter (case-insensitive, checks both ville and region fields)
    // Only filters providers that have location data set
    if (selectedVille) {
      const villeLower = selectedVille.toLowerCase();
      filtered = filtered.filter(p => {
        const pVille = (p.ville || '').toLowerCase();
        const pRegion = (p.region || '').toLowerCase();
        // If provider has location data, check if it matches
        if (pVille || pRegion) {
          return pVille.includes(villeLower) || villeLower.includes(pVille) ||
                 pRegion.includes(villeLower) || villeLower.includes(pRegion);
        }
        // If provider has no location data, exclude from filter
        return false;
      });
    }
    
    // Quartier filter (case-insensitive, checks both quartier and commune fields)
    if (selectedQuartier) {
      const quartierLower = selectedQuartier.toLowerCase();
      filtered = filtered.filter(p => {
        const pQuartier = (p.quartier || '').toLowerCase();
        const pCommune = (p.commune || '').toLowerCase();
        // If provider has quartier/commune data, check if it matches
        if (pQuartier || pCommune) {
          return pQuartier.includes(quartierLower) || quartierLower.includes(pQuartier) ||
                 pCommune.includes(quartierLower) || quartierLower.includes(pCommune);
        }
        return false;
      });
    }
    
    // Profession filter (from dropdown, different from category buttons)
    if (selectedProfession) {
      filtered = filtered.filter(p => p.profession === selectedProfession);
    }
    
    // Experience filter
    if (selectedExperience) {
      filtered = filtered.filter(p => p.years_experience === selectedExperience);
    }
    
    setFilteredProviders(filtered);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setShowOnlineOnly(false);
    setSelectedVille('');
    setSelectedQuartier('');
    setSelectedProfession('');
    setSelectedExperience('');
  };

  // Count active filters
  const activeFiltersCount = [
    selectedVille,
    selectedQuartier,
    selectedProfession,
    selectedExperience
  ].filter(Boolean).length;

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

          {/* Advanced Filters Section */}
          <div className="mt-4">
            {/* Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all mb-3 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid="toggle-filters-btn"
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtres avancés</span>
              {activeFiltersCount > 0 && (
                <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Filters Dropdowns */}
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                {/* Ville Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Ville
                  </label>
                  <select
                    value={selectedVille}
                    onChange={(e) => {
                      setSelectedVille(e.target.value);
                      setSelectedQuartier(''); // Reset quartier when ville changes
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-green-500 focus:ring-green-500"
                    data-testid="filter-ville"
                  >
                    <option value="">Toutes les villes</option>
                    {availableVilles.map(ville => (
                      <option key={ville} value={ville}>{ville}</option>
                    ))}
                  </select>
                </div>

                {/* Quartier Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Quartier
                  </label>
                  <select
                    value={selectedQuartier}
                    onChange={(e) => setSelectedQuartier(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={availableQuartiers.length === 0}
                    data-testid="filter-quartier"
                  >
                    <option value="">Tous les quartiers</option>
                    {availableQuartiers.map(quartier => (
                      <option key={quartier} value={quartier}>{quartier}</option>
                    ))}
                  </select>
                </div>

                {/* Profession Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    <Briefcase className="h-3 w-3 inline mr-1" />
                    Profession
                  </label>
                  <select
                    value={selectedProfession}
                    onChange={(e) => setSelectedProfession(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-green-500 focus:ring-green-500"
                    data-testid="filter-profession"
                  >
                    <option value="">Toutes les professions</option>
                    {professionGroups.map(group => (
                      <optgroup key={group.id} label={`${group.icon} ${group.name}`}>
                        {group.professions.map(prof => (
                          <option key={prof.id} value={prof.name}>{prof.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Experience Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Expérience
                  </label>
                  <select
                    value={selectedExperience}
                    onChange={(e) => setSelectedExperience(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-green-500 focus:ring-green-500"
                    data-testid="filter-experience"
                  >
                    {experienceOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters Button */}
                {activeFiltersCount > 0 && (
                  <div className="col-span-2 md:col-span-4 flex justify-end mt-2">
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      data-testid="reset-filters-btn"
                    >
                      <X className="h-4 w-4" />
                      Réinitialiser tous les filtres
                    </button>
                  </div>
                )}
              </div>
            )}
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
            <Button onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => {
              const Icon = categoryIcons[provider.profession] || MoreHorizontal;
              const colorClass = categoryColors[provider.profession] || 'from-gray-500 to-gray-600';
              
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
                          src={getImageUrl(provider.profile_picture, 'thumb')}
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
                    {(() => {
                      const combined = combinedRating(provider);
                      const completed = (interimStats[provider.id] || {}).completed_missions || 0;
                      if (!combined && completed === 0) return null;
                      return (
                        <div className="flex items-center gap-2 mb-3 flex-wrap" data-testid={`combined-rating-${provider.id}`}>
                          {combined && (
                            <>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-bold text-gray-900">{combined.avg.toFixed(1)}</span>
                              </div>
                              <span className="text-sm text-gray-500">({combined.total} avis)</span>
                            </>
                          )}
                          {completed > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                              ✓ {completed} mission{completed > 1 ? 's' : ''}
                            </span>
                          )}
                          {combined && combined.cCount > 0 && combined.iCount > 0 && (
                            <span className="text-[10px] text-gray-400">· {combined.cCount} clients · {combined.iCount} entreprises</span>
                          )}
                          {combined && combined.iCount > 0 && combined.cCount === 0 && (
                            <span className="text-[10px] text-amber-600 font-semibold">Intérim</span>
                          )}
                        </div>
                      );
                    })()}

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
