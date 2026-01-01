import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, Home as HomeIcon, User, MessageCircle, Send } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchRental();
  }, [rentalId]);

  useEffect(() => {
    if (showChat) {
      fetchMessages();
      // Poll for new messages every 5 seconds
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
      // Get customer info if available
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement des détails...</div>
      </div>
    );
  }

  if (!rental) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                data-testid="back-to-rentals-button"
                onClick={() => navigate('/rentals')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux Locations
              </Button>
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
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Photo Gallery */}
        {rental.photos && rental.photos.length > 0 ? (
          <Card className="mb-8 overflow-hidden">
            <div className="aspect-video relative bg-muted">
              <img
                src={`${BACKEND_URL}${rental.photos[currentPhotoIndex]}`}
                alt={rental.title}
                className="w-full h-full object-cover"
              />
              {rental.photos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {rental.photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentPhotoIndex
                          ? 'bg-white'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="mb-8 aspect-video flex items-center justify-center bg-muted">
            <HomeIcon className="h-24 w-24 text-muted-foreground" />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
                    {rental.title}
                  </h1>
                  <span className="inline-block px-3 py-1 rounded-md text-sm font-medium bg-muted text-muted-foreground">
                    {rental.property_type === 'Apartment' ? 'Appartement' : 'Maison'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-heading font-bold text-primary">
                    {Number(rental.rental_price).toLocaleString('fr-FR')} GNF
                  </div>
                  <div className="text-sm text-muted-foreground">par mois</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <MapPin className="h-5 w-5" />
                <span className="text-lg">{rental.location}</span>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-foreground mb-3">
                  Description
                </h2>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {rental.description}
                </p>
              </div>
            </Card>
          </div>

          {/* Contact Card with Chat */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h3 className="text-xl font-heading font-bold text-foreground mb-4">
                Contacter le Propriétaire
              </h3>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Propriétaire</div>
                  <div className="font-medium text-foreground">{rental.provider_name || 'Agent Immobilier'}</div>
                </div>
              </div>

              {!showChat ? (
                <Button
                  className="w-full h-12 font-heading font-bold gap-2"
                  data-testid="start-chat-button"
                  onClick={() => setShowChat(true)}
                >
                  <MessageCircle className="h-5 w-5" />
                  Démarrer une Conversation
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* Chat Messages */}
                  <div className="h-64 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Aucun message. Commencez la conversation !
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                                msg.sender_type === 'customer'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              <p>{msg.message}</p>
                              <p className={`text-xs mt-1 ${
                                msg.sender_type === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
                      className="flex-1"
                      disabled={sendingMessage}
                    />
                    <Button 
                      type="submit" 
                      size="icon"
                      disabled={sendingMessage || !newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetail;
