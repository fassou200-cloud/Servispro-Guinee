import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  DollarSign, Car, MapPin, Calendar, Fuel, Gauge, 
  Eye, Edit, Trash2, Clock, CheckCircle, XCircle, 
  AlertCircle, Loader2, RefreshCw, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MyVehicleSales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vehicle-sales/my-sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSales(response.data);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Erreur lors du chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (saleId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    setDeletingId(saleId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/vehicle-sales/${saleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Annonce supprimée');
      setSales(prev => prev.filter(s => s.id !== saleId));
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { 
        bg: 'bg-orange-100', 
        text: 'text-orange-700', 
        border: 'border-orange-200',
        icon: Clock,
        label: 'En attente'
      },
      approved: { 
        bg: 'bg-green-100', 
        text: 'text-green-700', 
        border: 'border-green-200',
        icon: CheckCircle,
        label: 'Approuvé'
      },
      rejected: { 
        bg: 'bg-red-100', 
        text: 'text-red-700', 
        border: 'border-red-200',
        icon: XCircle,
        label: 'Rejeté'
      },
      sold: { 
        bg: 'bg-purple-100', 
        text: 'text-purple-700', 
        border: 'border-purple-200',
        icon: Tag,
        label: 'Vendu'
      }
    };
    return styles[status] || styles.pending;
  };

  const getConditionLabel = (condition) => {
    const labels = {
      'new': 'Neuf',
      'used': 'Occasion',
      'refurbished': 'Reconditionné'
    };
    return labels[condition] || condition;
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500 mb-2" />
        <p className="text-slate-500">Chargement des annonces...</p>
      </Card>
    );
  }

  if (sales.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <DollarSign className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun véhicule en vente</h3>
        <p className="text-slate-500 mb-4">
          Vous n'avez pas encore mis de véhicule en vente. Créez votre première annonce !
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">
          Mes Véhicules en Vente ({sales.length})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSales}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Gestion des ventes par l'admin</p>
            <p className="text-sm text-blue-600">
              Les conversations avec les acheteurs potentiels sont gérées par l'équipe ServisPro. 
              Vous serez contacté lorsqu'un acheteur sérieux se manifeste.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {sales.map((sale) => {
          const statusStyle = getStatusBadge(sale.status);
          const StatusIcon = statusStyle.icon;

          return (
            <Card 
              key={sale.id} 
              className={`p-4 hover:shadow-lg transition-shadow ${
                sale.status === 'sold' ? 'opacity-75' : ''
              }`}
              data-testid={`vehicle-sale-card-${sale.id}`}
            >
              <div className="flex gap-4">
                {/* Photo */}
                {sale.photos && sale.photos.length > 0 ? (
                  <img
                    src={`${BACKEND_URL}${sale.photos[0]}`}
                    alt={`${sale.brand} ${sale.model}`}
                    className="w-32 h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-24 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Car className="h-8 w-8 text-slate-400" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">
                        {sale.brand} {sale.model}
                      </h3>
                      <p className="text-sm text-slate-500">{sale.vehicle_type} • {sale.year}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusStyle.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {sale.location}
                    </span>
                    {sale.mileage && (
                      <span className="flex items-center gap-1">
                        <Gauge className="h-4 w-4 text-slate-400" />
                        {Number(sale.mileage).toLocaleString('fr-FR')} km
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Fuel className="h-4 w-4 text-slate-400" />
                      {sale.fuel_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4 text-slate-400" />
                      {getConditionLabel(sale.condition)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-emerald-600">
                      {Number(sale.price).toLocaleString('fr-FR')} GNF
                    </div>

                    <div className="flex gap-2">
                      {sale.status !== 'sold' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(sale.id)}
                          disabled={deletingId === sale.id}
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          data-testid={`delete-sale-${sale.id}`}
                        >
                          {deletingId === sale.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Status Messages */}
                  {sale.status === 'pending' && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Votre annonce est en cours de vérification par l'équipe ServisPro.
                      </p>
                    </div>
                  )}

                  {sale.status === 'rejected' && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Annonce rejetée. Veuillez contacter le support pour plus d'informations.
                      </p>
                    </div>
                  )}

                  {sale.status === 'sold' && (
                    <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Félicitations ! Votre véhicule a été vendu.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MyVehicleSales;
