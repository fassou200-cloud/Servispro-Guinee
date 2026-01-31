import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Eye, Calendar, Clock, User, Phone, Mail, Check, X, 
  Loader2, MessageCircle, MapPin, Building, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusColors = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200'
};

const statusLabels = {
  pending: 'En attente',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  completed: 'Terminée',
  cancelled: 'Annulée'
};

const VisitRequestsList = ({ userType = 'provider' }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchVisitRequests();
  }, []);

  const fetchVisitRequests = async () => {
    try {
      const token = localStorage.getItem(userType === 'company' ? 'companyToken' : 'token');
      const response = await axios.get(`${API}/visit-requests/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching visit requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    setUpdatingId(requestId);
    try {
      const token = localStorage.getItem(userType === 'company' ? 'companyToken' : 'token');
      await axios.put(`${API}/visit-requests/${requestId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(
        newStatus === 'accepted' 
          ? 'Demande acceptée ! Le client sera informé.' 
          : 'Demande refusée.'
      );
      
      // Refresh the list
      fetchVisitRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-8 text-center bg-slate-50 border-dashed">
        <Eye className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">
          Aucune demande de visite
        </h3>
        <p className="text-sm text-slate-500">
          Les demandes de visite de vos biens apparaîtront ici
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card 
          key={request.id} 
          className="p-5 hover:shadow-lg transition-shadow duration-200 border-l-4"
          style={{ borderLeftColor: request.status === 'pending' ? '#f59e0b' : request.status === 'accepted' ? '#10b981' : '#ef4444' }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Request Info */}
            <div className="flex-1 space-y-3">
              {/* Header with status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Demande de Visite
                    </h4>
                    <p className="text-xs text-slate-500">
                      Reçue le {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[request.status]}`}>
                  {statusLabels[request.status]}
                </span>
              </div>

              {/* Property Info */}
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <Building className="h-4 w-4 text-slate-500" />
                  <span className="font-medium">{request.rental_title}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{request.rental_location}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700">{request.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${request.customer_phone}`} className="text-blue-600 hover:underline">
                    {request.customer_phone}
                  </a>
                </div>
              </div>

              {/* Visit Details */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(request.preferred_date)}</span>
                </div>
                {request.preferred_time && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{request.preferred_time}</span>
                  </div>
                )}
              </div>

              {/* Message if any */}
              {request.message && (
                <div className="p-3 bg-slate-100 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Message du client
                  </div>
                  <p className="text-sm text-slate-700">{request.message}</p>
                </div>
              )}

              {/* Frais de déplacement */}
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <span className="text-slate-600">
                  Frais de déplacement: <strong className="text-green-700">{new Intl.NumberFormat('fr-FR').format(request.frais_visite || 0)} GNF</strong>
                </span>
              </div>
            </div>

            {/* Actions */}
            {request.status === 'pending' && (
              <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                <Button
                  onClick={() => handleUpdateStatus(request.id, 'accepted')}
                  disabled={updatingId === request.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  {updatingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Accepter
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(request.id, 'rejected')}
                  disabled={updatingId === request.id}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-2"
                >
                  <X className="h-4 w-4" />
                  Refuser
                </Button>
              </div>
            )}

            {request.status === 'accepted' && (
              <Button
                onClick={() => handleUpdateStatus(request.id, 'completed')}
                disabled={updatingId === request.id}
                variant="outline"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 gap-2"
              >
                <Check className="h-4 w-4" />
                Marquer terminée
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default VisitRequestsList;
