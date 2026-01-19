import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Car, Truck, Tractor, DollarSign, MapPin, Phone, Mail, User, 
  Calendar, Clock, CheckCircle, XCircle, Eye, MessageCircle, 
  Loader2, RefreshCw, Tag, AlertCircle, Send, Home, Building
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const vehicleTypeIcons = {
  'Voiture': Car,
  'Camion': Truck,
  'Tracteur': Tractor
};

// Admin component to manage sales conversations (vehicles and properties)
const AdminSalesManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('vehicle-sales'); // vehicle-sales, vehicle-inquiries, property-inquiries
  const [vehicleSales, setVehicleSales] = useState([]);
  const [vehicleInquiries, setVehicleInquiries] = useState([]);
  const [propertyInquiries, setPropertyInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [selectedPropertyInquiry, setSelectedPropertyInquiry] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [adminResponse, setAdminResponse] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, vehicleInqRes, propertyInqRes] = await Promise.all([
        axios.get(`${API}/admin/vehicle-sales`),
        axios.get(`${API}/admin/vehicle-inquiries`),
        axios.get(`${API}/admin/property-inquiries`)
      ]);
      setVehicleSales(salesRes.data || []);
      setVehicleInquiries(vehicleInqRes.data || []);
      setPropertyInquiries(propertyInqRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Vehicle Sale Actions
  const handleApproveSale = async (saleId) => {
    setProcessingId(saleId);
    try {
      await axios.put(`${API}/admin/vehicle-sales/${saleId}/approve`);
      toast.success('Annonce approuvée !');
      setVehicleSales(prev => 
        prev.map(s => s.id === saleId ? {...s, status: 'approved'} : s)
      );
      if (selectedSale?.id === saleId) {
        setSelectedSale({...selectedSale, status: 'approved'});
      }
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSale = async (saleId) => {
    setProcessingId(saleId);
    try {
      await axios.put(`${API}/admin/vehicle-sales/${saleId}/reject`);
      toast.success('Annonce rejetée');
      setVehicleSales(prev => 
        prev.map(s => s.id === saleId ? {...s, status: 'rejected'} : s)
      );
      if (selectedSale?.id === saleId) {
        setSelectedSale({...selectedSale, status: 'rejected'});
      }
    } catch (error) {
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkSold = async (saleId) => {
    setProcessingId(saleId);
    try {
      await axios.put(`${API}/admin/vehicle-sales/${saleId}/sold`);
      toast.success('Véhicule marqué comme vendu !');
      setVehicleSales(prev => 
        prev.map(s => s.id === saleId ? {...s, status: 'sold'} : s)
      );
      if (selectedSale?.id === saleId) {
        setSelectedSale({...selectedSale, status: 'sold'});
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setProcessingId(null);
    }
  };

  // Inquiry Actions
  const handleUpdateInquiry = async (inquiryId, status) => {
    setProcessingId(inquiryId);
    try {
      await axios.put(`${API}/admin/vehicle-inquiries/${inquiryId}?status=${status}&admin_notes=${encodeURIComponent(adminNotes)}`);
      toast.success('Demande mise à jour !');
      setVehicleInquiries(prev => 
        prev.map(i => i.id === inquiryId ? {...i, status, admin_notes: adminNotes} : i)
      );
      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry({...selectedInquiry, status, admin_notes: adminNotes});
      }
      setAdminNotes('');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setProcessingId(null);
    }
  };

  // Property Inquiry Actions
  const handleUpdatePropertyInquiry = async (inquiryId, status, adminResponse = null) => {
    setProcessingId(inquiryId);
    try {
      await axios.put(`${API}/admin/property-inquiries/${inquiryId}`, {
        status: status,
        admin_notes: adminNotes || null,
        admin_response: adminResponse || null
      });
      toast.success('Demande mise à jour ! Le client a été notifié.');
      setPropertyInquiries(prev => 
        prev.map(i => i.id === inquiryId ? {...i, status, admin_notes: adminNotes, admin_response: adminResponse} : i)
      );
      if (selectedPropertyInquiry?.id === inquiryId) {
        setSelectedPropertyInquiry({...selectedPropertyInquiry, status, admin_notes: adminNotes, admin_response: adminResponse});
      }
      setAdminNotes('');
      setAdminResponse('');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-orange-600/20', text: 'text-orange-400', label: 'En attente' },
      approved: { bg: 'bg-green-600/20', text: 'text-green-400', label: 'Approuvé' },
      rejected: { bg: 'bg-red-600/20', text: 'text-red-400', label: 'Rejeté' },
      sold: { bg: 'bg-purple-600/20', text: 'text-purple-400', label: 'Vendu' },
      contacted: { bg: 'bg-blue-600/20', text: 'text-blue-400', label: 'Contacté' },
      completed: { bg: 'bg-green-600/20', text: 'text-green-400', label: 'Terminé' }
    };
    return styles[status] || styles.pending;
  };

  const pendingSales = vehicleSales.filter(s => s.status === 'pending');
  const approvedSales = vehicleSales.filter(s => s.status === 'approved');
  const pendingInquiries = vehicleInquiries.filter(i => i.status === 'pending');
  const pendingPropertyInquiries = propertyInquiries.filter(i => i.status === 'pending');

  if (loading) {
    return (
      <Card className="p-8 bg-slate-800 border-slate-700 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500 mb-2" />
        <p className="text-slate-400">Chargement...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-800 border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-600/20">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingSales.length}</p>
              <p className="text-xs text-slate-400">Ventes en attente</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-800 border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-600/20">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{approvedSales.length}</p>
              <p className="text-xs text-slate-400">Ventes actives</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-800 border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20">
              <MessageCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingInquiries.length}</p>
              <p className="text-xs text-slate-400">Demandes en attente</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-800 border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600/20">
              <Tag className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{vehicleSales.filter(s => s.status === 'sold').length}</p>
              <p className="text-xs text-slate-400">Véhicules vendus</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeSubTab === 'vehicle-sales' ? 'default' : 'outline'}
          onClick={() => { setActiveSubTab('vehicle-sales'); setSelectedSale(null); }}
          className={activeSubTab === 'vehicle-sales' ? 'bg-emerald-600' : 'border-slate-600 text-slate-300'}
        >
          <Car className="h-4 w-4 mr-2" />
          Annonces Véhicules ({vehicleSales.length})
          {pendingSales.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
              {pendingSales.length}
            </span>
          )}
        </Button>
        <Button
          variant={activeSubTab === 'vehicle-inquiries' ? 'default' : 'outline'}
          onClick={() => { setActiveSubTab('vehicle-inquiries'); setSelectedInquiry(null); }}
          className={activeSubTab === 'vehicle-inquiries' ? 'bg-blue-600' : 'border-slate-600 text-slate-300'}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Demandes Véhicules ({vehicleInquiries.length})
          {pendingInquiries.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
              {pendingInquiries.length}
            </span>
          )}
        </Button>
        <Button
          variant={activeSubTab === 'property-inquiries' ? 'default' : 'outline'}
          onClick={() => { setActiveSubTab('property-inquiries'); setSelectedPropertyInquiry(null); }}
          className={activeSubTab === 'property-inquiries' ? 'bg-amber-600' : 'border-slate-600 text-slate-300'}
        >
          <Home className="h-4 w-4 mr-2" />
          Demandes Immobilier ({propertyInquiries.length})
          {pendingPropertyInquiries.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
              {pendingPropertyInquiries.length}
            </span>
          )}
        </Button>
      </div>

      {/* Vehicle Sales Tab */}
      {activeSubTab === 'vehicle-sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-bold text-white">
                Annonces de Vente de Véhicules
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {vehicleSales.length === 0 ? (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <Car className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune annonce de vente</p>
              </Card>
            ) : (
              vehicleSales.map((sale) => {
                const VehicleIcon = vehicleTypeIcons[sale.vehicle_type] || Car;
                const statusStyle = getStatusBadge(sale.status);
                
                return (
                  <Card 
                    key={sale.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedSale?.id === sale.id ? 'border-emerald-500' : 'hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedSale(sale)}
                  >
                    <div className="flex gap-4">
                      {sale.photos && sale.photos.length > 0 ? (
                        <img 
                          src={`${BACKEND_URL}${sale.photos[0]}`}
                          alt={`${sale.brand} ${sale.model}`}
                          className="w-24 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                          <VehicleIcon className="h-8 w-8 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-white truncate">
                            {sale.brand} {sale.model}
                          </h3>
                          <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{sale.vehicle_type} • {sale.year}</p>
                        <p className="text-sm text-slate-500">{sale.seller_name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-emerald-400 font-bold">
                            {Number(sale.price).toLocaleString('fr-FR')} GNF
                          </span>
                          <span className="text-xs text-slate-500">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {sale.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Sale Detail */}
          <div>
            <h2 className="text-lg font-heading font-bold text-white mb-4">
              Détails de l'Annonce
            </h2>
            {selectedSale ? (
              <Card className="p-6 bg-slate-800 border-slate-700">
                {selectedSale.photos && selectedSale.photos.length > 0 && (
                  <div className="mb-4">
                    <img 
                      src={`${BACKEND_URL}${selectedSale.photos[0]}`}
                      alt={`${selectedSale.brand} ${selectedSale.model}`}
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                    {selectedSale.photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedSale.photos.slice(1).map((photo, idx) => (
                          <img 
                            key={idx}
                            src={`${BACKEND_URL}${photo}`}
                            alt={`Photo ${idx + 2}`}
                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {selectedSale.brand} {selectedSale.model}
                    </h3>
                    <p className="text-slate-400">
                      {selectedSale.vehicle_type} • {selectedSale.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400">
                      {Number(selectedSale.price).toLocaleString('fr-FR')} GNF
                    </p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(selectedSale.status).bg} ${getStatusBadge(selectedSale.status).text}`}>
                      {getStatusBadge(selectedSale.status).label}
                    </span>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {selectedSale.mileage && (
                    <div className="p-2 bg-slate-700/50 rounded">
                      <p className="text-xs text-slate-400">Kilométrage</p>
                      <p className="text-white font-medium">{Number(selectedSale.mileage).toLocaleString('fr-FR')} km</p>
                    </div>
                  )}
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-xs text-slate-400">Carburant</p>
                    <p className="text-white font-medium">{selectedSale.fuel_type || 'Non spécifié'}</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-xs text-slate-400">Transmission</p>
                    <p className="text-white font-medium">{selectedSale.transmission || 'Non spécifié'}</p>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <p className="text-xs text-slate-400">État</p>
                    <p className="text-white font-medium">
                      {selectedSale.condition === 'new' ? 'Neuf' : 
                       selectedSale.condition === 'used' ? 'Occasion' : 'Reconditionné'}
                    </p>
                  </div>
                </div>

                {/* Seller Info */}
                <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                  <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Vendeur</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="h-4 w-4 text-slate-400" />
                      {selectedSale.seller_name}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a href={`tel:${selectedSale.seller_phone}`} className="text-emerald-400 hover:underline">
                        {selectedSale.seller_phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedSale.location}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Description</h4>
                  <p className="text-slate-400 text-sm">{selectedSale.description}</p>
                </div>

                <div className="text-xs text-slate-500 mb-4">
                  Créée le {new Date(selectedSale.created_at).toLocaleDateString('fr-FR')}
                </div>

                {/* Actions */}
                {selectedSale.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => handleApproveSale(selectedSale.id)}
                      disabled={processingId === selectedSale.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                    >
                      {processingId === selectedSale.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approuver
                    </Button>
                    <Button
                      onClick={() => handleRejectSale(selectedSale.id)}
                      disabled={processingId === selectedSale.id}
                      variant="outline"
                      className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeter
                    </Button>
                  </div>
                )}

                {selectedSale.status === 'approved' && (
                  <div className="pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => handleMarkSold(selectedSale.id)}
                      disabled={processingId === selectedSale.id}
                      className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                    >
                      {processingId === selectedSale.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Tag className="h-4 w-4" />
                      )}
                      Marquer comme Vendu
                    </Button>
                  </div>
                )}

                {selectedSale.status === 'sold' && (
                  <div className="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                    <p className="text-sm text-purple-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Ce véhicule a été vendu
                      {selectedSale.sold_at && ` le ${new Date(selectedSale.sold_at).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <Car className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Sélectionnez une annonce pour voir ses détails</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Inquiries Tab */}
      {activeSubTab === 'vehicle-inquiries' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inquiries List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-bold text-white">
                Demandes d'Achat de Véhicules
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium">Gestion des conversations de vente</p>
                  <p className="text-blue-400">
                    Contactez les acheteurs intéressés et facilitez la mise en relation avec les vendeurs.
                  </p>
                </div>
              </div>
            </div>

            {vehicleInquiries.length === 0 ? (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <MessageCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune demande d'achat</p>
              </Card>
            ) : (
              vehicleInquiries.map((inquiry) => {
                const statusStyle = getStatusBadge(inquiry.status);
                
                return (
                  <Card 
                    key={inquiry.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedInquiry?.id === inquiry.id ? 'border-blue-500' : 'hover:border-slate-600'
                    } ${inquiry.status === 'pending' ? 'border-l-4 border-l-orange-500' : ''}`}
                    onClick={() => { setSelectedInquiry(inquiry); setAdminNotes(inquiry.admin_notes || ''); }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-white">{inquiry.customer_name}</h3>
                        <p className="text-sm text-slate-400">{inquiry.customer_phone}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-700/50 rounded mb-2">
                      <p className="text-xs text-slate-400">Véhicule demandé:</p>
                      <p className="text-white font-medium">{inquiry.vehicle_info}</p>
                      <p className="text-emerald-400 text-sm">{Number(inquiry.vehicle_price).toLocaleString('fr-FR')} GNF</p>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">{inquiry.message}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(inquiry.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </Card>
                );
              })
            )}
          </div>

          {/* Inquiry Detail */}
          <div>
            <h2 className="text-lg font-heading font-bold text-white mb-4">
              Détails de la Demande
            </h2>
            {selectedInquiry ? (
              <Card className="p-6 bg-slate-800 border-slate-700">
                {/* Customer Info */}
                <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <h4 className="text-sm font-bold text-blue-300 uppercase mb-3">Acheteur Intéressé</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <User className="h-4 w-4 text-blue-400" />
                      <span className="font-medium">{selectedInquiry.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="h-4 w-4 text-blue-400" />
                      <a href={`tel:${selectedInquiry.customer_phone}`} className="text-blue-400 hover:underline">
                        {selectedInquiry.customer_phone}
                      </a>
                    </div>
                    {selectedInquiry.customer_email && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="h-4 w-4 text-blue-400" />
                        <a href={`mailto:${selectedInquiry.customer_email}`} className="text-blue-400 hover:underline">
                          {selectedInquiry.customer_email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
                  <h4 className="text-sm font-bold text-emerald-300 uppercase mb-3">Véhicule Demandé</h4>
                  <p className="text-white font-bold text-lg">{selectedInquiry.vehicle_info}</p>
                  <p className="text-emerald-400 text-xl font-bold">
                    {Number(selectedInquiry.vehicle_price).toLocaleString('fr-FR')} GNF
                  </p>
                </div>

                {/* Seller Info */}
                <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-sm font-bold text-slate-300 uppercase mb-3">Vendeur</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="h-4 w-4 text-slate-400" />
                      {selectedInquiry.seller_name}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a href={`tel:${selectedInquiry.seller_phone}`} className="text-emerald-400 hover:underline">
                        {selectedInquiry.seller_phone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Message de l'acheteur</h4>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-slate-300">{selectedInquiry.message}</p>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Notes Admin</h4>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajoutez des notes sur cette demande (ex: appelé le client, RDV prévu...)"
                    rows={3}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="text-xs text-slate-500 mb-4">
                  Demande reçue le {new Date(selectedInquiry.created_at).toLocaleDateString('fr-FR')}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  {selectedInquiry.status === 'pending' && (
                    <Button
                      onClick={() => handleUpdateInquiry(selectedInquiry.id, 'contacted')}
                      disabled={processingId === selectedInquiry.id}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                    >
                      {processingId === selectedInquiry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                      Marquer Contacté
                    </Button>
                  )}
                  {(selectedInquiry.status === 'pending' || selectedInquiry.status === 'contacted') && (
                    <Button
                      onClick={() => handleUpdateInquiry(selectedInquiry.id, 'completed')}
                      disabled={processingId === selectedInquiry.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                    >
                      {processingId === selectedInquiry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Marquer Terminé
                    </Button>
                  )}
                </div>

                {selectedInquiry.status === 'completed' && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Cette demande a été traitée
                    </p>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <MessageCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Sélectionnez une demande pour voir ses détails</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Property Inquiries Tab */}
      {activeSubTab === 'property-inquiries' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inquiries List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-bold text-white">
                Demandes d'Achat Immobilier
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-300">
                  <p className="font-medium">Gestion des demandes immobilières</p>
                  <p className="text-amber-400">
                    Contactez les acheteurs intéressés et facilitez la mise en relation avec les agents immobiliers.
                  </p>
                </div>
              </div>
            </div>

            {propertyInquiries.length === 0 ? (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <Home className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune demande d'achat immobilier</p>
              </Card>
            ) : (
              propertyInquiries.map((inquiry) => {
                const statusStyle = getStatusBadge(inquiry.status);
                
                return (
                  <Card 
                    key={inquiry.id} 
                    className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                      selectedPropertyInquiry?.id === inquiry.id ? 'border-amber-500' : 'hover:border-slate-600'
                    } ${inquiry.status === 'pending' ? 'border-l-4 border-l-orange-500' : ''}`}
                    onClick={() => { setSelectedPropertyInquiry(inquiry); setAdminNotes(inquiry.admin_notes || ''); }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-white">{inquiry.customer_name}</h3>
                        <p className="text-sm text-slate-400">{inquiry.customer_phone}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-700/50 rounded mb-2">
                      <p className="text-xs text-slate-400">Propriété demandée:</p>
                      <p className="text-white font-medium">{inquiry.property_info}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-400 text-xs">{inquiry.property_location}</span>
                      </div>
                      <p className="text-amber-400 text-sm font-bold mt-1">
                        {Number(inquiry.property_price).toLocaleString('fr-FR')} GNF
                      </p>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">{inquiry.message}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(inquiry.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </Card>
                );
              })
            )}
          </div>

          {/* Inquiry Detail */}
          <div>
            <h2 className="text-lg font-heading font-bold text-white mb-4">
              Détails de la Demande
            </h2>
            {selectedPropertyInquiry ? (
              <Card className="p-6 bg-slate-800 border-slate-700">
                {/* Customer Info */}
                <div className="mb-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                  <h4 className="text-sm font-bold text-amber-300 uppercase mb-3">Acheteur Intéressé</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <User className="h-4 w-4 text-amber-400" />
                      <span className="font-medium">{selectedPropertyInquiry.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="h-4 w-4 text-amber-400" />
                      <a href={`tel:${selectedPropertyInquiry.customer_phone}`} className="text-amber-400 hover:underline">
                        {selectedPropertyInquiry.customer_phone}
                      </a>
                    </div>
                    {selectedPropertyInquiry.customer_email && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="h-4 w-4 text-amber-400" />
                        <a href={`mailto:${selectedPropertyInquiry.customer_email}`} className="text-amber-400 hover:underline">
                          {selectedPropertyInquiry.customer_email}
                        </a>
                      </div>
                    )}
                  </div>
                  {/* Budget and Financing Info */}
                  {(selectedPropertyInquiry.budget_range || selectedPropertyInquiry.financing_type) && (
                    <div className="mt-3 pt-3 border-t border-amber-700/50">
                      {selectedPropertyInquiry.budget_range && (
                        <div className="flex items-center gap-2 text-slate-300 mb-1">
                          <DollarSign className="h-4 w-4 text-amber-400" />
                          <span className="text-sm">Budget: {selectedPropertyInquiry.budget_range}</span>
                        </div>
                      )}
                      {selectedPropertyInquiry.financing_type && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Building className="h-4 w-4 text-amber-400" />
                          <span className="text-sm">
                            Financement: {
                              selectedPropertyInquiry.financing_type === 'cash' ? 'Comptant' :
                              selectedPropertyInquiry.financing_type === 'credit' ? 'Crédit' : 'Autre'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Property Info */}
                <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
                  <h4 className="text-sm font-bold text-emerald-300 uppercase mb-3">Propriété Demandée</h4>
                  <p className="text-white font-bold text-lg">{selectedPropertyInquiry.property_info}</p>
                  <div className="flex items-center gap-2 text-slate-300 mt-1">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span>{selectedPropertyInquiry.property_location}</span>
                  </div>
                  <p className="text-emerald-400 text-xl font-bold mt-2">
                    {Number(selectedPropertyInquiry.property_price).toLocaleString('fr-FR')} GNF
                  </p>
                </div>

                {/* Agent Info */}
                <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-sm font-bold text-slate-300 uppercase mb-3">Agent Immobilier</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="h-4 w-4 text-slate-400" />
                      {selectedPropertyInquiry.agent_name}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a href={`tel:${selectedPropertyInquiry.agent_phone}`} className="text-emerald-400 hover:underline">
                        {selectedPropertyInquiry.agent_phone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Message de l'acheteur</h4>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-slate-300">{selectedPropertyInquiry.message}</p>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Notes Admin</h4>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajoutez des notes sur cette demande (ex: appelé le client, visite programmée...)"
                    rows={3}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="text-xs text-slate-500 mb-4">
                  Demande reçue le {new Date(selectedPropertyInquiry.created_at).toLocaleDateString('fr-FR')}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  {selectedPropertyInquiry.status === 'pending' && (
                    <Button
                      onClick={() => handleUpdatePropertyInquiry(selectedPropertyInquiry.id, 'contacted')}
                      disabled={processingId === selectedPropertyInquiry.id}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 gap-2"
                    >
                      {processingId === selectedPropertyInquiry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                      Marquer Contacté
                    </Button>
                  )}
                  {(selectedPropertyInquiry.status === 'pending' || selectedPropertyInquiry.status === 'contacted') && (
                    <Button
                      onClick={() => handleUpdatePropertyInquiry(selectedPropertyInquiry.id, 'completed')}
                      disabled={processingId === selectedPropertyInquiry.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                    >
                      {processingId === selectedPropertyInquiry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Marquer Terminé
                    </Button>
                  )}
                </div>

                {selectedPropertyInquiry.status === 'completed' && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Cette demande a été traitée
                    </p>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <Home className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Sélectionnez une demande pour voir ses détails</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSalesManager;
