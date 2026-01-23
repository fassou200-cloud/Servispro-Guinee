import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, MapPin, Home as HomeIcon, User, MessageCircle, Send, Calendar, 
  Users, Moon, CheckCircle, XCircle, Wifi, Wind, Car, Utensils, Tv, Bath,
  ChevronLeft, ChevronRight, Star, Phone, Mail, Clock, Heart, Share2, Building,
  Thermometer, Laptop, Shirt, Lock, Coffee, Droplets, ShowerHead, Mountain, 
  Volume2, Flame, Sofa, Baby, UtensilsCrossed, Sun, ChefHat, Waves,
  Armchair, Hotel, Refrigerator, Microwave as MicrowaveIcon, CircleDot, Eye
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import VisitRequestForm from '@/components/VisitRequestForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Complete amenity icons mapping
const AMENITY_ICONS = {
  // Chambre & Confort
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
  // Salle de Bain
  salle_bain_privee: Bath,
  baignoire: Bath,
  douche: ShowerHead,
  // Extérieur & Vue
  balcon: Sun,
  vue: Mountain,
  insonorisation: Volume2,
  cheminee: Flame,
  // Couchage
  canape_lit: Sofa,
  lit_bebe: Baby,
  // Restauration
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
  // Autres
  parking: Car,
  piscine: Waves,
  salle_sport: Users,
};

// Complete amenity labels mapping
const AMENITY_LABELS = {
  // Chambre & Confort
  climatisation: 'Climatisation',
  chauffage: 'Chauffage',
  wifi: 'WiFi Gratuit',
  tv: 'Télévision (Smart TV)',
  telephone: 'Téléphone',
  bureau: 'Bureau & Chaise',
  armoire: 'Armoire / Penderie',
  fer_repasser: 'Fer & Planche à Repasser',
  seche_cheveux: 'Sèche-cheveux',
  coffre_fort: 'Coffre-fort',
  mini_frigo: 'Mini-réfrigérateur',
  micro_ondes: 'Micro-ondes',
  cafetiere: 'Cafetière / Théière',
  bouilloire: 'Bouilloire Électrique',
  eau_bouteille: 'Eau en Bouteille',
  chaussons: 'Chaussons',
  peignoirs: 'Peignoirs',
  serviettes: 'Serviettes & Articles de Toilette',
  // Salle de Bain
  salle_bain_privee: 'Salle de Bain Privée',
  baignoire: 'Baignoire',
  douche: 'Douche',
  // Extérieur & Vue
  balcon: 'Balcon / Terrasse',
  vue: 'Vue (Océan / Ville / Jardin)',
  insonorisation: 'Chambres Insonorisées',
  cheminee: 'Cheminée',
  // Couchage
  canape_lit: 'Canapé-lit / Lit Extra',
  lit_bebe: 'Lit Bébé / Berceau',
  // Restauration
  restaurant: 'Restaurant (sur place)',
  diner: 'Service Dîner',
  dejeuner: 'Service Déjeuner',
  petit_dejeuner: 'Petit-déjeuner',
  petit_dej_gratuit: 'Petit-déjeuner Gratuit',
  room_service: 'Service en Chambre',
  bar: 'Bar / Lounge',
  bar_piscine: 'Bar Piscine',
  snack_bar: 'Snack Bar',
  cafe: 'Coffee Shop / Café',
  cuisine_partagee: 'Cuisine Partagée',
  cuisine: 'Cuisine Équipée Complète',
  bbq: 'Barbecue / Grill',
  // Autres
  parking: 'Parking',
  piscine: 'Piscine',
  salle_sport: 'Salle de Sport',
};

const RentalDetail = () => {
  const navigate = useNavigate();
  const { rentalId } = useParams();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchRental();
  }, [rentalId]);

  useEffect(() => {
    if (showChat) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [showChat, rentalId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRental = async () => {
    try {
      const response = await axios.get(`${API}/rentals/${rentalId}`);
      setRental(response.data);
    } catch (error) {
      toast.error('Échec du chargement des détails');
      navigate('/rentals');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/chat/rental/${rentalId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const customer = JSON.parse(localStorage.getItem('customer') || '{}');
      
      await axios.post(`${API}/chat/rental/${rentalId}/message/customer`, {
        rental_id: rentalId,
        message: newMessage,
        sender_name: customer.first_name ? `${customer.first_name} ${customer.last_name}` : 'Client'
      });
      
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      toast.error('Échec de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  const nextPhoto = () => {
    if (rental?.photos?.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % rental.photos.length);
    }
  };

  const prevPhoto = () => {
    if (rental?.photos?.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + rental.photos.length) % rental.photos.length);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-slate-600 font-medium">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (!rental) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              data-testid="back-to-rentals-button"
              onClick={() => navigate('/rentals')}
              className="gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour aux Locations</span>
            </Button>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`rounded-full ${isFavorite ? 'text-red-500 border-red-200 bg-red-50' : ''}`}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Lien copié !');
                }}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Photo Gallery */}
        <div className="mb-8">
          {rental.photos && rental.photos.length > 0 ? (
            <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
              <div className="aspect-[16/9] md:aspect-[21/9] relative bg-slate-200">
                <img
                  src={`${BACKEND_URL}${rental.photos[currentPhotoIndex]}`}
                  alt={rental.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Navigation Arrows */}
                {rental.photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    >
                      <ChevronLeft className="h-6 w-6 text-slate-800" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    >
                      <ChevronRight className="h-6 w-6 text-slate-800" />
                    </button>
                  </>
                )}
                
                {/* Photo Counter */}
                {rental.photos.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {rental.photos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index === currentPhotoIndex
                            ? 'bg-white w-8'
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                )}
                
                {/* Price Badge */}
                <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
                  {rental.rental_type === 'short_term' && rental.price_per_night ? (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Number(rental.price_per_night).toLocaleString('fr-FR')} GNF
                      </div>
                      <div className="text-sm text-slate-500">par nuit</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Number(rental.rental_price).toLocaleString('fr-FR')} GNF
                      </div>
                      <div className="text-sm text-slate-500">par mois</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-[16/9] md:aspect-[21/9] rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              <div className="text-center">
                <Building className="h-24 w-24 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">Pas de photos disponibles</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Card */}
            <Card className="p-8 rounded-3xl shadow-lg border-0 bg-white">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                  <HomeIcon className="h-4 w-4" />
                  {rental.property_type === 'Apartment' ? 'Appartement' : 'Maison'}
                </span>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  rental.rental_type === 'short_term' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {rental.rental_type === 'short_term' ? (
                    <>
                      <Moon className="h-4 w-4" />
                      Courte Durée
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Longue Durée
                    </>
                  )}
                </span>
                {rental.is_available !== false ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-700">
                    <XCircle className="h-4 w-4" />
                    Indisponible
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 mb-4">
                {rental.title}
              </h1>

              <div className="flex items-center gap-3 text-slate-600 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-lg">{rental.location}</span>
              </div>

              {/* Short term rental info */}
              {rental.rental_type === 'short_term' && (
                <div className="flex flex-wrap gap-6 mb-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl">
                  {rental.min_nights && rental.min_nights > 1 && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Moon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600">Minimum</p>
                        <p className="text-lg font-bold text-purple-800">{rental.min_nights} nuits</p>
                      </div>
                    </div>
                  )}
                  {rental.max_guests && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600">Capacité</p>
                        <p className="text-lg font-bold text-purple-800">{rental.max_guests} invités</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Availability Dates */}
              {(rental.available_from || rental.available_to) && (
                <div className="mb-6 p-6 bg-slate-50 rounded-2xl">
                  <h3 className="font-heading font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Période de Disponibilité
                  </h3>
                  <div className="flex flex-wrap gap-4 text-slate-700">
                    {rental.available_from && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
                        <span className="text-sm text-slate-500">Du</span>
                        <span className="font-semibold">{new Date(rental.available_from).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    )}
                    {rental.available_to && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
                        <span className="text-sm text-slate-500">Au</span>
                        <span className="font-semibold">{new Date(rental.available_to).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Amenities */}
            {rental.amenities && rental.amenities.length > 0 && (
              <Card className="p-8 rounded-3xl shadow-lg border-0 bg-white">
                <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">
                  Équipements & Services
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {rental.amenities.map((amenity) => {
                    const Icon = AMENITY_ICONS[amenity] || CheckCircle;
                    const label = AMENITY_LABELS[amenity] || amenity;
                    return (
                      <div key={amenity} className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-green-600" />
                        </div>
                        <span className="font-medium text-slate-700">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Description */}
            <Card className="p-8 rounded-3xl shadow-lg border-0 bg-white">
              <h2 className="text-2xl font-heading font-bold text-slate-900 mb-4">
                Description
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-lg">
                {rental.description}
              </p>
            </Card>
          </div>

          {/* Contact Card with Chat */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="p-6 rounded-3xl shadow-xl border-0 bg-white overflow-hidden">
                {/* Decorative Header */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
                
                <h3 className="text-xl font-heading font-bold text-slate-900 mb-6 mt-2">
                  Contacter le Propriétaire
                </h3>

                <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Propriétaire</div>
                    <div className="font-bold text-slate-900">{rental.provider_name || 'Propriétaire immobilier'}</div>
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <Clock className="h-3 w-3" />
                      Répond généralement en 1h
                    </div>
                  </div>
                </div>

                {/* Visit Request Button Only */}
                <Button
                  className="w-full h-14 font-heading font-bold gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 text-base"
                  data-testid="request-visit-button"
                  onClick={() => setShowVisitForm(true)}
                >
                  <Eye className="h-5 w-5" />
                  Demander une Visite
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Request Modal */}
      {showVisitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <VisitRequestForm 
              rental={rental}
              onSuccess={() => {
                setTimeout(() => setShowVisitForm(false), 3000);
              }}
              onClose={() => setShowVisitForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalDetail;
