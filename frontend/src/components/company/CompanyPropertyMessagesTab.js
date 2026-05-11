import { Card } from '@/components/ui/card';
import { MessageCircle, Building, Home } from 'lucide-react';
import axios from 'axios';

const CompanyPropertyMessagesTab = ({ propertyMessages, setPropertyMessages, API }) => {
  const markAsRead = async (msgId) => {
    try {
      const token = localStorage.getItem('companyToken');
      await axios.put(`${API}/company/property-messages/${msgId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPropertyMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        Messages des Clients ({propertyMessages.length})
      </h3>
      {propertyMessages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun message pour le moment</p>
          <p className="text-gray-400 text-sm">Les clients vous contacteront via vos annonces</p>
        </div>
      ) : (
        <div className="space-y-3">
          {propertyMessages.map(msg => (
            <div
              key={msg.id}
              className={`p-4 rounded-xl border ${msg.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${msg.message_type === 'sale' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                    {msg.message_type === 'sale' ? (
                      <Building className="h-4 w-4 text-orange-600" />
                    ) : (
                      <Home className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{msg.sender_name}</p>
                    <a href={`tel:${msg.sender_phone}`} className="text-xs text-blue-600 hover:underline">{msg.sender_phone}</a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${msg.message_type === 'sale' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {msg.message_type === 'sale' ? 'Vente' : 'Location'}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              {msg.rental_title && (
                <p className="text-xs text-gray-500 mb-1">Annonce: {msg.rental_title || msg.property_info}</p>
              )}
              <p className="text-sm text-gray-700">{msg.message}</p>
              {!msg.is_read && (
                <button
                  onClick={() => markAsRead(msg.id)}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Marquer comme lu
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default CompanyPropertyMessagesTab;
