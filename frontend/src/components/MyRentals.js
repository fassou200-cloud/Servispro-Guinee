import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Home, MapPin, Trash2, Moon, Calendar, Users, CheckCircle, XCircle, 
  Wifi, Wind, Car, Utensils, Tv, Bath, Thermometer, Phone, Laptop, 
  Shirt, Lock, Coffee, Droplets, ShowerHead, Mountain, Volume2, 
  Flame, Sofa, Baby, UtensilsCrossed, Sun, ChefHat, Waves,
  Armchair, Hotel, Refrigerator, Microwave as MicrowaveIcon, CircleDot,
  FileText, Shield, Eye, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Complete amenity icons mapping
const AMENITY_ICONS = {
  climatisation: Wind,
  chauffage: Thermometer,
  wifi: Wifi,
  tv: Tv,
  telephone: Phone,
  bureau: Laptop,
  armoire: Armchair,
  fer_repasser: Shirt,
  seche_cheveux: Wind,
  coffre_fort: Lock,
  mini_frigo: Refrigerator,
  micro_ondes: MicrowaveIcon,
  cafetiere: Coffee,
  bouilloire: Coffee,
  eau_bouteille: Droplets,
  chaussons: CircleDot,
  peignoirs: Shirt,
  serviettes: Bath,
  salle_bain_privee: Bath,
  baignoire: Bath,
  douche: ShowerHead,
  balcon: Sun,
  vue: Mountain,
  insonorisation: Volume2,
  cheminee: Flame,
  canape_lit: Sofa,
  lit_bebe: Baby,
  restaurant: UtensilsCrossed,
  diner: UtensilsCrossed,
  dejeuner: UtensilsCrossed,
  petit_dejeuner: Coffee,
  petit_dej_gratuit: Coffee,
  room_service: Hotel,
  bar: UtensilsCrossed,
  bar_piscine: Waves,
  snack_bar: UtensilsCrossed,
  cafe: Coffee,
  cuisine_partagee: ChefHat,
  cuisine: Utensils,
  bbq: Flame,
  parking: Car,
  piscine: Waves,
  salle_sport: Users,
};

// Short labels for compact display
const AMENITY_LABELS = {
  climatisation: 'Clim',
  chauffage: 'Chauff.',
  wifi: 'WiFi',
  tv: 'TV',
  telephone: 'Tél',
  bureau: 'Bureau',
  armoire: 'Armoire',
  fer_repasser: 'Fer',
  seche_cheveux: 'Sèche-ch.',
  coffre_fort: 'Coffre',
  mini_frigo: 'Frigo',
  micro_ondes: 'Micro-on.',
  cafetiere: 'Café',
  bouilloire: 'Bouill.',
  eau_bouteille: 'Eau',
  chaussons: 'Chauss.',
  peignoirs: 'Peignoir',
  serviettes: 'Serv.',
  salle_bain_privee: 'SDB',
  baignoire: 'Baign.',
  douche: 'Douche',
  balcon: 'Balcon',
  vue: 'Vue',
  insonorisation: 'Insono.',
  cheminee: 'Chemin.',
  canape_lit: 'Canapé',
  lit_bebe: 'Lit bébé',
  restaurant: 'Resto',
  diner: 'Dîner',
  dejeuner: 'Déj.',
  petit_dejeuner: 'Petit-déj',
  petit_dej_gratuit: 'PDJ ✓',
  room_service: 'Room Serv.',
  bar: 'Bar',
  bar_piscine: 'Bar Pisc.',
  snack_bar: 'Snack',
  cafe: 'Café',
  cuisine_partagee: 'Cuis. Part.',
  cuisine: 'Cuisine',
  bbq: 'BBQ',
  parking: 'Parking',
  piscine: 'Piscine',
  salle_sport: 'Gym',
};

const MyRentals = () => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [updatingAvailability, setUpdatingAvailability] = useState(null);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/rentals/my-listings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRentals(response.data);
    } catch (error) {
      console.error('Failed to fetch rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rentalId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/rentals/${rentalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Annonce supprimée avec succès');
      fetchRentals();
    } catch (error) {
      toast.error('Échec de la suppression');
    }
    setDeleteId(null);
  };

  const toggleAvailability = async (rentalId, currentStatus) => {
    setUpdatingAvailability(rentalId);
    try {
      const token = localStorage.getItem('token');
      const newStatus = !currentStatus;
      
      await axios.put(
        `${API}/rentals/${rentalId}/availability?is_available=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setRentals(rentals.map(r => 
        r.id === rentalId ? { ...r, is_available: newStatus } : r
      ));
      
      toast.success(`Location ${newStatus ? 'disponible' : 'indisponible'}`);
    } catch (error) {
      toast.error('Échec de la mise à jour');
    } finally {
      setUpdatingAvailability(null);
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
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Chargement de vos annonces...</p>
      </Card>
    );
  }

  if (rentals.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-heading font-bold text-foreground mb-2">
            Aucune Annonce de Location
          </h3>
          <p className="text-muted-foreground">
            Créez votre première annonce pour commencer à recevoir des demandes.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-heading font-bold text-foreground">
          Mes Locations ({rentals.length})
        </h3>
      </div>

      {rentals.map((rental) => (
        <Card key={rental.id} className="p-6" data-testid={`rental-card-${rental.id}`}>
          <div className="flex gap-6">
            {/* Photo */}
            {rental.photos && rental.photos.length > 0 ? (
              <div className="w-48 h-36 flex-shrink-0 relative">
                <img
                  src={`${BACKEND_URL}${rental.photos[0]}`}
                  alt={rental.title}
                  className="w-full h-full object-cover rounded-lg"
                />
                {/* Type Badge on image */}
                <div className="absolute top-2 left-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    rental.rental_type === 'short_term' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {rental.rental_type === 'short_term' ? (
                      <><Moon className="h-3 w-3" /> Courte</>
                    ) : (
                      <><Calendar className="h-3 w-3" /> Longue</>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-48 h-36 flex-shrink-0 bg-muted rounded-lg flex items-center justify-center">
                <Home className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-xl font-heading font-bold text-foreground mb-1">
                    {rental.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                      {rental.property_type === 'Apartment' ? 'Appartement' : 'Maison'}
                    </span>
                    {rental.rental_type === 'short_term' && rental.max_guests && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                        <Users className="h-3 w-3" />
                        {rental.max_guests} invités
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Availability Toggle & Delete */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      rental.is_available !== false ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {rental.is_available !== false ? 'Disponible' : 'Indisponible'}
                    </span>
                    <Switch
                      checked={rental.is_available !== false}
                      disabled={updatingAvailability === rental.id}
                      onCheckedChange={() => toggleAvailability(rental.id, rental.is_available !== false)}
                      data-testid={`availability-toggle-${rental.id}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`delete-rental-${rental.id}`}
                    onClick={() => setDeleteId(rental.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-foreground mb-3 line-clamp-2">{rental.description}</p>

              <div className="flex flex-wrap gap-4 text-sm mb-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {rental.location}
                </div>
                <div className="flex items-center gap-2 text-primary font-bold">
                  {formatPrice(rental)}
                </div>
                {rental.rental_type === 'short_term' && rental.min_nights > 1 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Moon className="h-4 w-4" />
                    Min {rental.min_nights} nuits
                  </div>
                )}
                {rental.photos && rental.photos.length > 0 && (
                  <div className="text-muted-foreground">
                    {rental.photos.length} photo{rental.photos.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Amenities */}
              {rental.amenities && rental.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rental.amenities.map((amenity) => {
                    const Icon = AMENITY_ICONS[amenity] || CheckCircle;
                    const label = AMENITY_LABELS[amenity] || amenity;
                    return (
                      <span key={amenity} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Availability Dates */}
              {(rental.available_from || rental.available_to) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {rental.available_from && (
                    <span>Du {new Date(rental.available_from).toLocaleDateString('fr-FR')}</span>
                  )}
                  {rental.available_to && (
                    <span> au {new Date(rental.available_to).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'annonce sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteId)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyRentals;
