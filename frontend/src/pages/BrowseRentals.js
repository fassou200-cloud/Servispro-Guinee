import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, MapPin, Home as HomeIcon, Calendar, Users, CheckCircle, 
  XCircle, Moon, Search, Building, Star, Heart, Filter, Sparkles,
  Wifi, Wind, Car, ChevronRight, X, SlidersHorizontal
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BrowseRentals = () => {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    rental_type: 'all',
    availability: 'all'
  });

  useEffect(() => {
    fetchRentals();
  }, [filters]);

  const fetchRentals = async () => {
    try {
      let url = `${API}/rentals`;
      const params = new URLSearchParams();
      
      if (filters.rental_type !== 'all') {
        params.append('rental_type', filters.rental_type);
      }
      if (filters.availability !== 'all') {
        params.append('is_available', filters.availability === 'available');
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      setRentals(response.data);
    } catch (error) {
      toast.error('Échec du chargement des annonces de location');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (rental) => {
    if (rental.rental_type === 'short_term' && rental.price_per_night) {
      return {
        price: Number(rental.price_per_night).toLocaleString('fr-FR'),
        period: '/nuit'
      };
    }
    return {
      price: Number(rental.rental_price).toLocaleString('fr-FR'),
      period: '/mois'
    };
  };

  const filteredRentals = rentals.filter(rental => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return rental.title.toLowerCase().includes(query) ||
           rental.location.toLowerCase().includes(query) ||
           rental.description.toLowerCase().includes(query);
  });

  const stats = {
    total: rentals.length,
    longTerm: rentals.filter(r => r.rental_type !== 'short_term').length,
    shortTerm: rentals.filter(r => r.rental_type === 'short_term').length,
    available: rentals.filter(r => r.is_available !== false).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des locations...</p>
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
                  Locations
                </h1>
                <p className="text-sm text-gray-500">
                  {filteredRentals.length} propriétés • {stats.available} disponibles
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="gap-2"
            >
              <Building className="h-4 w-4" />
              Publier une annonce
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
              Trouvez Votre Location Idéale
            </h2>
            <p className="text-purple-100 text-lg max-w-2xl mx-auto">
              Appartements et maisons à louer à Conakry et partout en Guinée. Courte et longue durée.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par titre, lieu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-12 rounded-2xl border-0 shadow-lg text-gray-900 placeholder:text-gray-400"
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mt-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-purple-200">Total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.longTerm}</p>
              <p className="text-sm text-purple-200">Longue durée</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.shortTerm}</p>
              <p className="text-sm text-purple-200">Courte durée</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats.available}</p>
              <p className="text-sm text-purple-200">Disponibles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-[73px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-gray-500 mr-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-sm font-medium">Filtres:</span>
            </div>
            
            {/* Rental Type Filters */}
            <button
              onClick={() => setFilters({ ...filters, rental_type: 'all' })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.rental_type === 'all'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="h-4 w-4 inline mr-1" />
              Toutes
            </button>
            <button
              onClick={() => setFilters({ ...filters, rental_type: 'long_term' })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.rental_type === 'long_term'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-1" />
              Longue durée
            </button>
            <button
              onClick={() => setFilters({ ...filters, rental_type: 'short_term' })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.rental_type === 'short_term'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Moon className="h-4 w-4 inline mr-1" />
              Courte durée
            </button>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Availability Filter */}
            <button
              onClick={() => setFilters({ ...filters, availability: filters.availability === 'available' ? 'all' : 'available' })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.availability === 'available'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CheckCircle className="h-4 w-4 inline mr-1" />
              Disponibles uniquement
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {filteredRentals.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
              <Building className="h-12 w-12 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune location trouvée</h3>
            <p className="text-gray-600 mb-6">Essayez de modifier vos critères de recherche</p>
            <Button 
              onClick={() => { setFilters({ rental_type: 'all', availability: 'all' }); setSearchQuery(''); }}
              variant="outline"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRentals.map((rental) => {
              const priceInfo = formatPrice(rental);
              return (
                <Card
                  key={rental.id}
                  className="group overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-white transform hover:-translate-y-1"
                  onClick={() => navigate(`/rental/${rental.id}`)}
                >
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {rental.photos && rental.photos.length > 0 ? (
                      <img
                        src={`${BACKEND_URL}${rental.photos[0]}`}
                        alt={rental.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
                        <HomeIcon className="h-16 w-16 text-purple-300" />
                      </div>
                    )}
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                        rental.rental_type === 'short_term'
                          ? 'bg-violet-500/90 text-white'
                          : 'bg-blue-500/90 text-white'
                      }`}>
                        {rental.rental_type === 'short_term' ? (
                          <><Moon className="h-3 w-3 inline mr-1" />Courte durée</>
                        ) : (
                          <><Calendar className="h-3 w-3 inline mr-1" />Longue durée</>
                        )}
                      </span>
                    </div>

                    {/* Availability Badge */}
                    <div className="absolute top-4 right-4">
                      {rental.is_available !== false ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/90 text-white backdrop-blur-sm">
                          <CheckCircle className="h-3 w-3 inline mr-1" />Disponible
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/90 text-white backdrop-blur-sm">
                          <XCircle className="h-3 w-3 inline mr-1" />Indisponible
                        </span>
                      )}
                    </div>

                    {/* Property Type Badge */}
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 text-gray-700 backdrop-blur-sm">
                        {rental.property_type === 'Apartment' ? '🏢 Appartement' : '🏠 Maison'}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button 
                      className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); toast.success('Ajouté aux favoris'); }}
                    >
                      <Heart className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-heading font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">
                      {rental.title}
                    </h3>

                    <div className="flex items-center gap-2 text-gray-500 mb-3">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm line-clamp-1">{rental.location}</span>
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {rental.description}
                    </p>

                    {/* Short term info */}
                    {rental.rental_type === 'short_term' && (
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        {rental.max_guests && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {rental.max_guests} invités
                          </span>
                        )}
                        {rental.min_nights > 1 && (
                          <span className="flex items-center gap-1">
                            <Moon className="h-4 w-4" />
                            Min {rental.min_nights} nuits
                          </span>
                        )}
                      </div>
                    )}

                    {/* Amenities Preview */}
                    {rental.amenities && rental.amenities.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {rental.amenities.slice(0, 3).map((amenity) => (
                          <span key={amenity} className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                            {amenity === 'wifi' && <Wifi className="h-3 w-3 inline mr-1" />}
                            {amenity === 'climatisation' && <Wind className="h-3 w-3 inline mr-1" />}
                            {amenity === 'parking' && <Car className="h-3 w-3 inline mr-1" />}
                            {amenity === 'wifi' ? 'WiFi' : 
                             amenity === 'climatisation' ? 'Clim' :
                             amenity === 'parking' ? 'Parking' :
                             amenity === 'cuisine' ? 'Cuisine' :
                             amenity === 'tv' ? 'TV' : amenity}
                          </span>
                        ))}
                        {rental.amenities.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                            +{rental.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price and CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-2xl font-bold text-purple-600">{priceInfo.price}</span>
                        <span className="text-gray-500 text-sm"> GNF{priceInfo.period}</span>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg shadow-purple-500/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/rental/${rental.id}`);
                        }}
                        disabled={rental.is_available === false}
                      >
                        Voir détails
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
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

export default BrowseRentals;
