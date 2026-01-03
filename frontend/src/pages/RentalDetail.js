import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, MapPin, Home as HomeIcon, User, MessageCircle, Send, Calendar, 
  Users, Moon, CheckCircle, XCircle, Wifi, Wind, Car, Utensils, Tv, Bath,
  Phone, Building, Star, ChevronLeft, ChevronRight, Heart, Share2, Shield
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Amenity icons mapping
const AMENITY_ICONS = {
  wifi: Wifi,
  climatisation: Wind,
  parking: Car,
  cuisine: Utensils,
  tv: Tv,
  salle_bain_privee: Bath,
};

const AMENITY_LABELS = {
  wifi: 'WiFi Gratuit',
  climatisation: 'Climatisation',
  parking: 'Parking Gratuit',
  cuisine: 'Cuisine Équipée',
  tv: 'Télévision',
  salle_bain_privee: 'Salle de Bain Privée',
};

const RentalDetail = () => {
  const navigate = useNavigate();
  const { rentalId } = useParams();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (!rental) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              data-testid="back-to-rentals-button"
              onClick={() => navigate('/rentals')}
              className="gap-2 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => { setIsFavorite(!isFavorite); toast.success(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris'); }}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Lien copié !'); }}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Photo Gallery */}
      <div className="relative">
        {rental.photos && rental.photos.length > 0 ? (
          <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden">
            <img
              src={`${BACKEND_URL}${rental.photos[currentPhotoIndex]}`}
              alt={rental.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Navigation Arrows */}
            {rental.photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-700 hover:bg-white transition-colors shadow-lg"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-700 hover:bg-white transition-colors shadow-lg"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            
            {/* Photo Counter */}
            {rental.photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm">
                {currentPhotoIndex + 1} / {rental.photos.length}
              </div>
            )}

            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm ${
                    rental.rental_type === 'short_term'
                      ? 'bg-violet-500/90 text-white'
                      : 'bg-blue-500/90 text-white'
                  }`}>
                    {rental.rental_type === 'short_term' ? (
                      <><Moon className="h-4 w-4 inline mr-1" />Courte durée</>
                    ) : (
                      <><Calendar className="h-4 w-4 inline mr-1" />Longue durée</>
                    )}
                  </span>
                  {rental.is_available !== false ? (
                    <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-green-500/90 text-white backdrop-blur-sm">
                      <CheckCircle className="h-4 w-4 inline mr-1" />Disponible
                    </span>
                  ) : (
                    <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-red-500/90 text-white backdrop-blur-sm">
                      <XCircle className="h-4 w-4 inline mr-1" />Indisponible
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-2">
                  {rental.title}
                </h1>
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">{rental.location}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
            <HomeIcon className="h-24 w-24 text-purple-300" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 -mt-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Card */}
            <Card className="rounded-3xl border-0 shadow-xl p-8 bg-gradient-to-r from-purple-600 to-violet-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">
                    {rental.rental_type === 'short_term' ? 'Prix par nuit' : 'Loyer mensuel'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-bold">
                      {rental.rental_type === 'short_term' && rental.price_per_night
                        ? Number(rental.price_per_night).toLocaleString('fr-FR')
                        : Number(rental.rental_price).toLocaleString('fr-FR')}
                    </span>
                    <span className="text-xl text-purple-200">GNF</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm font-medium">
                    {rental.property_type === 'Apartment' ? '🏢 Appartement' : '🏠 Maison'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Short term rental info */}
            {rental.rental_type === 'short_term' && (
              <Card className="rounded-3xl border-0 shadow-lg p-6">
                <h2 className="text-xl font-heading font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Moon className="h-5 w-5 text-purple-500" />
                  Informations Location Courte Durée
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {rental.min_nights && rental.min_nights > 1 && (
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Moon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Minimum</p>
                        <p className="font-bold text-gray-900">{rental.min_nights} nuits</p>
                      </div>
                    </div>
                  )}
                  {rental.max_guests && (
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Capacité</p>
                        <p className="font-bold text-gray-900">{rental.max_guests} invités</p>
                      </div>
                    </div>
                  )}
                  {(rental.available_from || rental.available_to) && (
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl col-span-2 md:col-span-1">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Disponibilité</p>
                        <p className="font-bold text-gray-900 text-sm">
                          {rental.available_from && new Date(rental.available_from).toLocaleDateString('fr-FR')}
                          {rental.available_from && rental.available_to && ' - '}
                          {rental.available_to && new Date(rental.available_to).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Amenities */}
            {rental.amenities && rental.amenities.length > 0 && (
              <Card className="rounded-3xl border-0 shadow-lg p-8">
                <h2 className="text-xl font-heading font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Équipements et Services
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {rental.amenities.map((amenity) => {
                    const Icon = AMENITY_ICONS[amenity] || CheckCircle;
                    const label = AMENITY_LABELS[amenity] || amenity;
                    return (
                      <div key={amenity} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-green-600" />
                        </div>
                        <span className="font-medium text-gray-700">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Description */}
            <Card className="rounded-3xl border-0 shadow-lg p-8">
              <h2 className="text-xl font-heading font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-500" />
                Description
              </h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {rental.description}
              </p>
            </Card>
          </div>

          {/* Right Column - Contact Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Owner Card */}
              <Card className="rounded-3xl border-0 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
                  <h3 className="text-xl font-heading font-bold mb-2">
                    Contacter le Propriétaire
                  </h3>
                  <p className="text-emerald-100 text-sm">
                    Envoyez un message pour plus d'informations
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-16 w-16 ring-4 ring-emerald-100">
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 font-bold text-xl">
                        {rental.provider_name ? rental.provider_name.split(' ').map(n => n[0]).join('') : 'AI'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-lg text-gray-900">{rental.provider_name || 'Agent Immobilier'}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span>Propriétaire vérifié</span>
                      </div>
                    </div>
                  </div>

                  {!showChat ? (
                    <div className="space-y-3">
                      <Button
                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 font-bold text-base gap-2"
                        data-testid="start-chat-button"
                        onClick={() => setShowChat(true)}
                      >
                        <MessageCircle className="h-5 w-5" />
                        Envoyer un Message
                      </Button>
                      {rental.provider_phone && (
                        <Button
                          variant="outline"
                          className="w-full h-14 rounded-2xl font-bold text-base gap-2"
                          onClick={() => window.location.href = `tel:${rental.provider_phone}`}
                        >
                          <Phone className="h-5 w-5" />
                          Appeler
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Chat Messages */}
                      <div className="h-72 overflow-y-auto border border-gray-200 rounded-2xl p-4 bg-gray-50">
                        {messages.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center">
                            <div>
                              <MessageCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                              <p>Aucun message</p>
                              <p className="text-xs">Commencez la conversation !</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                                    msg.sender_type === 'customer'
                                      ? 'bg-emerald-500 text-white rounded-br-md'
                                      : 'bg-white text-gray-700 shadow-sm rounded-bl-md'
                                  }`}
                                >
                                  <p>{msg.message}</p>
                                  <p className={`text-xs mt-1 ${
                                    msg.sender_type === 'customer' ? 'text-emerald-100' : 'text-gray-400'
                                  }`}>
                                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </div>

                      {/* Message Input */}
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Écrivez votre message..."
                          className="flex-1 h-12 rounded-xl"
                          disabled={sendingMessage}
                        />
                        <Button 
                          type="submit" 
                          size="icon"
                          className="h-12 w-12 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                          disabled={sendingMessage || !newMessage.trim()}
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </Card>

              {/* Security Notice */}
              <Card className="rounded-2xl border-0 shadow-md p-4 bg-blue-50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Conseil de Sécurité</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Ne payez jamais avant d'avoir visité le bien. Privilégiez les rencontres dans des lieux publics.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetail;
