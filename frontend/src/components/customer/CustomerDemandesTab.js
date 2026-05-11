import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle, Search, RefreshCw, Building, MapPin, DollarSign,
  Send, Eye, Clock, Phone, CheckCircle, Loader2
} from 'lucide-react';
import { getImageUrl } from '@/utils/imageUrl';

export const CustomerDemandesTab = ({
  navigate,
  propertyInquiries,
  loadingInquiries,
  selectedInquiry,
  setSelectedInquiry,
  replyMessage,
  setReplyMessage,
  sendingReply,
  sendReplyMessage,
  fetchPropertyInquiries,
  conversationEndRef,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-gray-900">
              Mes Demandes d'Achat
            </h3>
            <p className="text-sm text-gray-500">Suivez vos demandes d'achat immobilier</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPropertyInquiries}
          disabled={loadingInquiries}
          className="rounded-xl"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingInquiries ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {loadingInquiries ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : propertyInquiries.length === 0 ? (
        <Card className="p-12 rounded-2xl border-0 shadow-lg bg-white text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <Building className="h-10 w-10 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune demande d'achat</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Vous n'avez pas encore fait de demande d'achat immobilier. Consultez nos propriétés à vendre sur la page d'accueil.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 rounded-xl"
          >
            <Search className="h-4 w-4 mr-2" />
            Voir les Propriétés
          </Button>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inquiries List */}
          <div className="space-y-4">
            {propertyInquiries.map((inquiry) => {
              const statusColors = {
                pending: 'bg-orange-100 text-orange-700 border-orange-200',
                contacted: 'bg-blue-100 text-blue-700 border-blue-200',
                completed: 'bg-green-100 text-green-700 border-green-200',
                rejected: 'bg-red-100 text-red-700 border-red-200'
              };
              const statusText = {
                pending: 'En attente',
                contacted: 'Contacté',
                completed: 'Terminé',
                rejected: 'Rejeté'
              };

              return (
                <Card
                  key={inquiry.id}
                  className={`p-5 rounded-2xl border-0 shadow-lg bg-white cursor-pointer transition-all hover:shadow-xl ${
                    selectedInquiry?.id === inquiry.id ? 'ring-2 ring-amber-500' : ''
                  } ${inquiry.admin_response && !inquiry.read ? 'border-l-4 border-l-amber-500' : ''}`}
                  onClick={() => setSelectedInquiry(inquiry)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">{inquiry.property_info}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        {inquiry.property_location}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[inquiry.status] || statusColors.pending}`}>
                      {statusText[inquiry.status] || inquiry.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-amber-600">
                      {Number(inquiry.property_price).toLocaleString('fr-FR')} GNF
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(inquiry.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  {inquiry.admin_response && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                        <MessageCircle className="h-4 w-4" />
                        Nouvelle réponse reçue
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Inquiry Detail */}
          <div>
            {selectedInquiry ? (
              <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white sticky top-24">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Détails de la Demande</h4>

                {/* Property Info */}
                <div className="p-4 bg-amber-50 rounded-xl mb-4">
                  <div className="flex gap-3">
                    {selectedInquiry.property_photos && selectedInquiry.property_photos.length > 0 ? (
                      <img
                        src={getImageUrl(selectedInquiry.property_photos[0])}
                        alt="Propriété"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Building className="h-8 w-8 text-amber-400" />
                      </div>
                    )}
                    <div>
                      <h5 className="font-bold text-gray-900">{selectedInquiry.property_info}</h5>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedInquiry.property_location}
                      </p>
                      <p className="text-amber-600 font-bold">
                        {Number(selectedInquiry.property_price).toLocaleString('fr-FR')} GNF
                      </p>
                    </div>
                  </div>
                </div>

                {/* Your Message */}
                <div className="mb-4">
                  <h5 className="text-sm font-bold text-gray-500 uppercase mb-2">Votre Message</h5>
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-700">
                    {selectedInquiry.message}
                  </div>
                </div>

                {/* Budget & Financing */}
                {(selectedInquiry.budget_range || selectedInquiry.financing_type) && (
                  <div className="flex gap-4 mb-4">
                    {selectedInquiry.budget_range && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        Budget: {selectedInquiry.budget_range}
                      </div>
                    )}
                    {selectedInquiry.financing_type && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="h-4 w-4 text-gray-400" />
                        {selectedInquiry.financing_type === 'cash' ? 'Comptant' :
                         selectedInquiry.financing_type === 'credit' ? 'Crédit' : 'Autre'}
                      </div>
                    )}
                  </div>
                )}

                {/* Conversation Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h5 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-amber-500" />
                    Conversation
                  </h5>

                  {/* Messages Container */}
                  <div className="bg-gray-50 rounded-xl p-4 max-h-80 overflow-y-auto mb-4 space-y-3">
                    {/* Initial message from customer */}
                    <div className="flex justify-end">
                      <div className="bg-amber-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                        <p className="text-sm">{selectedInquiry.message}</p>
                        <p className="text-xs text-amber-200 mt-1">
                          {new Date(selectedInquiry.created_at).toLocaleDateString('fr-FR')} - Vous
                        </p>
                      </div>
                    </div>

                    {/* Legacy admin_response */}
                    {selectedInquiry.admin_response && (!selectedInquiry.conversation || selectedInquiry.conversation.length === 0) && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%] shadow-sm">
                          <p className="text-sm text-gray-700">{selectedInquiry.admin_response}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {selectedInquiry.response_date ? new Date(selectedInquiry.response_date).toLocaleDateString('fr-FR') : ''} - ServisPro
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Conversation messages */}
                    {selectedInquiry.conversation && selectedInquiry.conversation.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`rounded-2xl px-4 py-2 max-w-[80%] ${
                          msg.sender === 'customer'
                            ? 'bg-amber-500 text-white rounded-br-md'
                            : 'bg-white border border-gray-200 rounded-bl-md shadow-sm'
                        }`}>
                          <p className={`text-sm ${msg.sender === 'customer' ? 'text-white' : 'text-gray-700'}`}>
                            {msg.message}
                          </p>
                          <p className={`text-xs mt-1 ${msg.sender === 'customer' ? 'text-amber-200' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleDateString('fr-FR')} - {msg.sender_name}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={conversationEndRef} />
                  </div>

                  {/* Reply Input */}
                  {selectedInquiry.status !== 'completed' && (
                    <div className="space-y-3">
                      <Textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Écrivez votre message..."
                        rows={3}
                        className="bg-white border-gray-300 resize-none"
                      />
                      <Button
                        onClick={sendReplyMessage}
                        disabled={sendingReply || !replyMessage.trim()}
                        className="w-full bg-amber-500 hover:bg-amber-600 gap-2"
                      >
                        {sendingReply ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Envoyer
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {selectedInquiry.status === 'pending' && (
                      <p className="text-orange-600 text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        En attente de réponse de ServisPro
                      </p>
                    )}
                    {selectedInquiry.status === 'contacted' && (
                      <p className="text-blue-600 text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Conversation en cours
                      </p>
                    )}
                    {selectedInquiry.status === 'completed' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 text-sm flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Cette demande a été traitée
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-12 rounded-2xl border-0 shadow-lg bg-white text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">Sélectionnez une demande pour voir les détails</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
