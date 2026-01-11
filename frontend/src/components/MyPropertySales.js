import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Home, Building, MapPin, Trash2, Trees, Car, Waves, Ruler, 
  CheckCircle, XCircle, FileText, Shield, Eye, BedDouble, Bath,
  ExternalLink, User
} from 'lucide-react';
import axios from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const propertyTypeIcons = {
  Maison: Home,
  Terrain: Trees,
  Appartement: Building,
  Villa: Home,
  Immeuble: Building,
  Bureau: Building
};

const MyPropertySales = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/property-sales/my-listings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (propertyId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/property-sales/${propertyId}/availability`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, is_available: !currentStatus } : p
      ));
      
      toast.success(!currentStatus ? 'Propriété maintenant disponible' : 'Propriété marquée vendue');
    } catch (error) {
      toast.error('Échec de la mise à jour');
    }
  };

  const handleDeleteClick = (property) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!propertyToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/property-sales/${propertyToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProperties(prev => prev.filter(p => p.id !== propertyToDelete.id));
      toast.success('Propriété supprimée avec succès');
    } catch (error) {
      toast.error('Échec de la suppression');
    } finally {
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    }
  };

  const getDocumentStatus = (property) => {
    const required = ['titre_foncier', 'seller_id_document'];
    const hasRequired = required.every(doc => property[doc]);
    const hasMinistry = !!property.registration_ministere;
    
    if (hasRequired && hasMinistry) return { status: 'complete', label: 'Documents Complets', color: 'text-green-600 bg-green-50' };
    if (hasRequired) return { status: 'partial', label: 'Documents Principaux OK', color: 'text-amber-600 bg-amber-50' };
    return { status: 'incomplete', label: 'Documents Manquants', color: 'text-red-600 bg-red-50' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <Card className="p-12 text-center rounded-3xl border-0 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <Home className="h-10 w-10 text-emerald-500" />
        </div>
        <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">
          Aucune Propriété à Vendre
        </h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Vous n'avez pas encore publié de propriété à vendre. Utilisez l'onglet "Vendre Propriété" pour commencer.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-heading font-bold text-slate-900">
          Mes Propriétés à Vendre ({properties.length})
        </h3>
      </div>

      <div className="grid gap-6">
        {properties.map((property) => {
          const PropertyIcon = propertyTypeIcons[property.property_type] || Home;
          const docStatus = getDocumentStatus(property);
          
          return (
            <Card key={property.id} className="overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="md:w-72 h-48 md:h-auto relative bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0">
                  {property.photos && property.photos.length > 0 ? (
                    <img
                      src={`${BACKEND_URL}${property.photos[0]}`}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PropertyIcon className="h-16 w-16 text-slate-400" />
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500 text-white">
                      <PropertyIcon className="h-3.5 w-3.5" />
                      {property.property_type}
                    </span>
                  </div>
                  
                  {/* Photo Count */}
                  {property.photos && property.photos.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      +{property.photos.length - 1} photos
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-heading font-bold text-slate-900">
                        {property.title}
                      </h4>
                      <p className="text-slate-500 flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        {property.location}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${property.is_available ? 'text-green-600' : 'text-red-600'}`}>
                          {property.is_available ? 'À Vendre' : 'Vendu'}
                        </span>
                        <Switch
                          checked={property.is_available}
                          onCheckedChange={() => toggleAvailability(property.id, property.is_available)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Property Specs */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {property.surface_area && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm">
                        <Ruler className="h-4 w-4" />
                        {property.surface_area}
                      </span>
                    )}
                    {property.num_rooms && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm">
                        <BedDouble className="h-4 w-4" />
                        {property.num_rooms} pièces
                      </span>
                    )}
                    {property.num_bathrooms && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm">
                        <Bath className="h-4 w-4" />
                        {property.num_bathrooms} SDB
                      </span>
                    )}
                    {property.has_garage && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm">
                        <Car className="h-4 w-4" />
                        Garage
                      </span>
                    )}
                    {property.has_garden && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm">
                        <Trees className="h-4 w-4" />
                        Jardin
                      </span>
                    )}
                    {property.has_pool && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 text-sm">
                        <Waves className="h-4 w-4" />
                        Piscine
                      </span>
                    )}
                  </div>

                  {/* Document Status */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm mb-4 ${docStatus.color}`}>
                    {docStatus.status === 'complete' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : docStatus.status === 'partial' ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {docStatus.label}
                  </div>

                  {/* Document Links */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {property.titre_foncier && (
                      <a
                        href={`${BACKEND_URL}${property.titre_foncier}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        Titre Foncier
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {property.seller_id_document && (
                      <a
                        href={`${BACKEND_URL}${property.seller_id_document}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      >
                        <User className="h-3 w-3" />
                        Pièce ID Vendeur
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {property.registration_ministere && (
                      <a
                        href={`${BACKEND_URL}${property.registration_ministere}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                      >
                        <Home className="h-3 w-3" />
                        Enreg. Ministère
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {property.documents_additionnels && property.documents_additionnels.length > 0 && (
                      property.documents_additionnels.map((doc, idx) => (
                        <a
                          key={idx}
                          href={`${BACKEND_URL}${doc}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          Document {idx + 1}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))
                    )}
                  </div>

                  {/* Pricing & Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-600">
                        {Number(property.sale_price).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-slate-500">GNF</span>
                      {property.is_negotiable && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Négociable
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleDeleteClick(property)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette propriété ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La propriété "{propertyToDelete?.title}" sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyPropertySales;
