import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  DollarSign, MapPin, Phone, Mail, User, 
  Calendar, Clock, CheckCircle, XCircle, Eye, MessageCircle, 
  Loader2, RefreshCw, AlertCircle, Send, Home, Building
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin component to manage property inquiries
const AdminSalesManager = () => {
  const [propertyInquiries, setPropertyInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyInquiry, setSelectedPropertyInquiry] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const propertyInqRes = await axios.get(`${API}/admin/property-inquiries`);
      setPropertyInquiries(propertyInqRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Property Inquiry Actions
  const handlePropertyInquiryStatus = async (inquiryId, status) => {
    setProcessingId(inquiryId);
    try {
      await axios.put(`${API}/admin/property-inquiries/${inquiryId}`, {
        status: status
      });
      toast.success(status === 'responded' ? 'Demande traitée !' : 'Demande fermée');
      const updated = propertyInquiries.find(i => i.id === inquiryId);
      if (updated) {
        setPropertyInquiries(prev =>
          prev.map(i => i.id === inquiryId ? { ...i, status } : i)
        );
        if (selectedPropertyInquiry?.id === inquiryId) {
          setSelectedPropertyInquiry({ ...selectedPropertyInquiry, status });
        }
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendPropertyResponse = async (inquiryId) => {
    if (!adminResponse.trim()) {
      toast.error('Veuillez écrire une réponse');
      return;
    }
    setProcessingId(inquiryId);
    try {
      await axios.post(`${API}/admin/property-inquiries/${inquiryId}/message`, {
        message: adminResponse,
        sender: 'admin'
      });
      toast.success('Réponse envoyée !');
      const updated = propertyInquiries.find(i => i.id === inquiryId);
      if (updated) {
        const newMessage = {
          sender: 'admin',
          message: adminResponse,
          timestamp: new Date().toISOString()
        };
        setPropertyInquiries(prev =>
          prev.map(i => i.id === inquiryId ? { ...i, conversation: [...(i.conversation || []), newMessage] } : i)
        );
        if (selectedPropertyInquiry?.id === inquiryId) {
          setSelectedPropertyInquiry({
            ...selectedPropertyInquiry,
            conversation: [...(selectedPropertyInquiry.conversation || []), newMessage]
          });
        }
      }
      setAdminResponse('');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', text: 'En attente' },
      responded: { color: 'bg-blue-500/20 text-blue-400', text: 'Répondu' },
      closed: { color: 'bg-slate-500/20 text-slate-400', text: 'Fermé' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingPropertyInquiries = propertyInquiries.filter(i => i.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Home className="h-6 w-6 text-amber-500" />
          <h2 className="text-xl font-heading font-bold text-white">
            Demandes Immobilier
          </h2>
          {pendingPropertyInquiries.length > 0 && (
            <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full">
              {pendingPropertyInquiries.length} en attente
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          className="text-slate-400 hover:text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Property Inquiries Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inquiries List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-bold text-white">
              Toutes les demandes ({propertyInquiries.length})
            </h3>
          </div>

          {propertyInquiries.length === 0 ? (
            <Card className="p-8 bg-slate-800 border-slate-700 text-center">
              <Home className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aucune demande immobilière</p>
            </Card>
          ) : (
            propertyInquiries.map((inquiry) => (
              <Card
                key={inquiry.id}
                className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-all hover:border-amber-500/50 ${
                  selectedPropertyInquiry?.id === inquiry.id ? 'border-amber-500 ring-1 ring-amber-500/20' : ''
                }`}
                onClick={() => setSelectedPropertyInquiry(inquiry)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Home className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        {inquiry.customer_name || 'Client'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {inquiry.property_title || 'Propriété'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(inquiry.status)}
                </div>
                <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                  {inquiry.message || 'Aucun message'}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(inquiry.created_at)}
                  </span>
                  {inquiry.conversation?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {inquiry.conversation.length} messages
                    </span>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Selected Inquiry Details */}
        <div className="space-y-4">
          {selectedPropertyInquiry ? (
            <Card className="p-6 bg-slate-800 border-slate-700">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Détails de la demande
                  </h3>
                  <p className="text-sm text-slate-400">
                    {selectedPropertyInquiry.property_title}
                  </p>
                </div>
                {getStatusBadge(selectedPropertyInquiry.status)}
              </div>

              {/* Customer Info */}
              <div className="space-y-3 mb-6 p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-white">{selectedPropertyInquiry.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-white">{selectedPropertyInquiry.customer_phone}</span>
                </div>
                {selectedPropertyInquiry.customer_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-white">{selectedPropertyInquiry.customer_email}</span>
                  </div>
                )}
              </div>

              {/* Property Info */}
              <div className="space-y-3 mb-6 p-4 bg-slate-700/50 rounded-lg">
                <h4 className="font-medium text-amber-400 mb-2">Propriété</h4>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span className="text-white">{selectedPropertyInquiry.property_type || 'N/A'}</span>
                </div>
                {selectedPropertyInquiry.property_price && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span className="text-white">
                      {new Intl.NumberFormat('fr-GN').format(selectedPropertyInquiry.property_price)} GNF
                    </span>
                  </div>
                )}
                {selectedPropertyInquiry.property_location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="text-white">{selectedPropertyInquiry.property_location}</span>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-2">Message du client</h4>
                <p className="text-slate-300 p-3 bg-slate-700/50 rounded-lg">
                  {selectedPropertyInquiry.message}
                </p>
              </div>

              {/* Conversation */}
              {selectedPropertyInquiry.conversation?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-white mb-3">Conversation</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedPropertyInquiry.conversation.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          msg.sender === 'admin'
                            ? 'bg-amber-500/20 ml-4'
                            : 'bg-slate-700/50 mr-4'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${
                            msg.sender === 'admin' ? 'text-amber-400' : 'text-blue-400'
                          }`}>
                            {msg.sender === 'admin' ? 'Admin' : 'Client'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(msg.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Form */}
              {selectedPropertyInquiry.status !== 'closed' && (
                <div className="space-y-3">
                  <Textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Écrire une réponse au client..."
                    className="bg-slate-700 border-slate-600 text-white"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSendPropertyResponse(selectedPropertyInquiry.id)}
                      disabled={processingId === selectedPropertyInquiry.id}
                      className="bg-amber-600 hover:bg-amber-700 flex-1"
                    >
                      {processingId === selectedPropertyInquiry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Envoyer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePropertyInquiryStatus(selectedPropertyInquiry.id, 'closed')}
                      disabled={processingId === selectedPropertyInquiry.id}
                      className="border-slate-600 text-slate-300 hover:text-white"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Fermer
                    </Button>
                  </div>
                </div>
              )}

              {/* Closed Status */}
              {selectedPropertyInquiry.status === 'closed' && (
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-slate-300">Cette demande a été traitée et fermée</p>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-8 bg-slate-800 border-slate-700 text-center h-full flex flex-col items-center justify-center">
              <Eye className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">
                Sélectionnez une demande pour voir les détails
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSalesManager;
