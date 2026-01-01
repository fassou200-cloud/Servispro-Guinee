import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, ArrowLeft, Home } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RentalConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.rental_id);
      const interval = setInterval(() => fetchMessages(selectedConversation.rental_id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/chat/my-conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (rentalId) => {
    try {
      const response = await axios.get(`${API}/chat/rental/${rentalId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/chat/rental/${selectedConversation.rental_id}/message/owner`,
        { rental_id: selectedConversation.rental_id, message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      fetchMessages(selectedConversation.rental_id);
    } catch (error) {
      toast.error('Échec de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Chargement des conversations...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-heading font-bold text-foreground">
        Messages des Clients
      </h3>

      {conversations.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-xl font-heading font-bold text-foreground mb-2">
              Aucune Conversation
            </h4>
            <p className="text-muted-foreground">
              Les messages des clients intéressés par vos locations apparaîtront ici.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 space-y-3">
            {conversations.map((conv) => (
              <Card
                key={conv.rental_id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedConversation?.rental_id === conv.rental_id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30'
                }`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground truncate">
                      {conv.rental_title}
                    </h4>
                    {conv.last_message && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.last_message.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {conv.message_count} message{conv.message_count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">
                      {selectedConversation.rental_title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Conversation avec le client
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="h-80 overflow-y-auto border rounded-lg p-4 bg-muted/30 mb-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Aucun message dans cette conversation.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === 'owner' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-4 py-2 rounded-lg ${
                              msg.sender_type === 'owner'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-sm font-medium mb-1">
                              {msg.sender_type === 'owner' ? 'Vous' : msg.sender_name}
                            </p>
                            <p>{msg.message}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender_type === 'owner' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {new Date(msg.created_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
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
                    placeholder="Répondre au client..."
                    className="flex-1"
                    disabled={sendingMessage}
                  />
                  <Button 
                    type="submit" 
                    disabled={sendingMessage || !newMessage.trim()}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Envoyer
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-8 h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation pour voir les messages</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalConversations;
