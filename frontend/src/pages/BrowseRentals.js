import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Home as HomeIcon, Calendar, Users, CheckCircle, XCircle, Moon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BrowseRentals = () => {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
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
      return `${Number(rental.price_per_night).toLocaleString('fr-FR')} GNF/nuit`;
    }
    return `${Number(rental.rental_price).toLocaleString('fr-FR')} GNF/mois`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement des annonces de location...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                data-testid="back-button"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Accueil
              </Button>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Parcourir les Locations
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
            >
              Connexion Prestataire
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
            Propriétés Disponibles à Louer
          </h2>
          <p className="text-muted-foreground mb-4">
            {rentals.length} propriété{rentals.length !== 1 ? 's' : ''} trouvée{rentals.length !== 1 ? 's' : ''}
          </p>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select
                value={filters.rental_type}
                onValueChange={(value) => setFilters({ ...filters, rental_type: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Type de location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les Locations</SelectItem>
                  <SelectItem value="long_term">Longue Durée</SelectItem>
                  <SelectItem value="short_term">Courte Durée (Airbnb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select
                value={filters.availability}
                onValueChange={(value) => setFilters({ ...filters, availability: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Disponibilité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="available">Disponibles</SelectItem>
                  <SelectItem value="unavailable">Indisponibles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Rentals Grid */}
        {rentals.length === 0 ? (
          <Card className="p-12 text-center">
            <HomeIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              Aucune annonce de location disponible pour le moment.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentals.map((rental) => (
              <Card
                key={rental.id}
                className={`overflow-hidden transition-colors duration-300 cursor-pointer ${
                  rental.is_available !== false 
                    ? 'hover:border-primary/50' 
                    : 'opacity-75 hover:border-muted'
                }`}
                data-testid={`rental-card-${rental.id}`}
                onClick={() => navigate(`/rental/${rental.id}`)}
              >
                {/* Photo */}
                <div className="relative">
                  {rental.photos && rental.photos.length > 0 ? (
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={`${BACKEND_URL}${rental.photos[0]}`}
                        alt={rental.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <HomeIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-2">
                    {/* Rental Type Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      rental.rental_type === 'short_term' 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {rental.rental_type === 'short_term' ? (
                        <>
                          <Moon className="h-3 w-3" />
                          Courte Durée
                        </>
                      ) : (
                        <>
                          <Calendar className="h-3 w-3" />
                          Longue Durée
                        </>
                      )}
                    </span>
                  </div>
                  
                  {/* Availability Badge */}
                  <div className="absolute top-2 right-2">
                    {rental.is_available !== false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle className="h-3 w-3" />
                        Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        <XCircle className="h-3 w-3" />
                        Indisponible
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-heading font-bold text-foreground line-clamp-1">
                      {rental.title}
                    </h3>
                    <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground flex-shrink-0 ml-2">
                      {rental.property_type === 'Apartment' ? 'Appartement' : 'Maison'}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {rental.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-1">{rental.location}</span>
                    </div>
                    
                    {/* Short term info */}
                    {rental.rental_type === 'short_term' && rental.max_guests && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span>{rental.max_guests} invités max</span>
                        {rental.min_nights > 1 && (
                          <span className="text-xs">• Min {rental.min_nights} nuits</span>
                        )}
                      </div>
                    )}
                    
                    {/* Price */}
                    <div className="text-lg font-bold text-primary">
                      {formatPrice(rental)}
                    </div>
                  </div>

                  {/* Amenities preview */}
                  {rental.amenities && rental.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {rental.amenities.slice(0, 3).map((amenity) => (
                        <span key={amenity} className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                          {amenity === 'wifi' ? 'WiFi' : 
                           amenity === 'climatisation' ? 'Clim' :
                           amenity === 'parking' ? 'Parking' :
                           amenity === 'cuisine' ? 'Cuisine' :
                           amenity === 'tv' ? 'TV' :
                           amenity === 'salle_bain_privee' ? 'SDB' : amenity}
                        </span>
                      ))}
                      {rental.amenities.length > 3 && (
                        <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                          +{rental.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full mt-4 font-heading"
                    disabled={rental.is_available === false}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/rental/${rental.id}`);
                    }}
                  >
                    {rental.is_available !== false ? 'Voir les Détails' : 'Indisponible'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseRentals;
