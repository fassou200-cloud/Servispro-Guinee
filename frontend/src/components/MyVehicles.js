import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Car, Truck, Tractor, MapPin, Trash2, Calendar, Fuel, Settings, 
  Users, Package, Gauge, CheckCircle, XCircle, Eye, Edit
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

const vehicleTypeIcons = {
  Voiture: Car,
  Camion: Truck,
  Tracteur: Tractor
};

const MyVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/vehicles/my-listings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (vehicleId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/vehicles/${vehicleId}/availability`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setVehicles(prev => prev.map(v => 
        v.id === vehicleId ? { ...v, is_available: !currentStatus } : v
      ));
      
      toast.success(!currentStatus ? 'Véhicule maintenant disponible' : 'Véhicule marqué indisponible');
    } catch (error) {
      toast.error('Échec de la mise à jour');
    }
  };

  const handleDeleteClick = (vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/vehicles/${vehicleToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setVehicles(prev => prev.filter(v => v.id !== vehicleToDelete.id));
      toast.success('Véhicule supprimé avec succès');
    } catch (error) {
      toast.error('Échec de la suppression');
    } finally {
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card className="p-12 text-center rounded-3xl border-0 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-100 flex items-center justify-center">
          <Truck className="h-10 w-10 text-indigo-500" />
        </div>
        <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">
          Aucun Véhicule Publié
        </h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Vous n'avez pas encore publié de véhicule. Utilisez l'onglet "Ajouter Véhicule" pour commencer.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-heading font-bold text-slate-900">
          Mes Véhicules ({vehicles.length})
        </h3>
      </div>

      <div className="grid gap-6">
        {vehicles.map((vehicle) => {
          const VehicleIcon = vehicleTypeIcons[vehicle.vehicle_type] || Car;
          
          return (
            <Card key={vehicle.id} className="overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="md:w-72 h-48 md:h-auto relative bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0">
                  {vehicle.photos && vehicle.photos.length > 0 ? (
                    <img
                      src={`${BACKEND_URL}${vehicle.photos[0]}`}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VehicleIcon className="h-16 w-16 text-slate-400" />
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      vehicle.vehicle_type === 'Voiture' ? 'bg-indigo-500 text-white' :
                      vehicle.vehicle_type === 'Camion' ? 'bg-slate-700 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      <VehicleIcon className="h-3.5 w-3.5" />
                      {vehicle.vehicle_type}
                    </span>
                  </div>
                  
                  {/* Photo Count */}
                  {vehicle.photos && vehicle.photos.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      +{vehicle.photos.length - 1} photos
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-heading font-bold text-slate-900">
                        {vehicle.brand} {vehicle.model}
                      </h4>
                      <p className="text-slate-500 flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        {vehicle.year}
                        <span className="text-slate-300">•</span>
                        <Fuel className="h-4 w-4" />
                        {vehicle.fuel_type}
                        <span className="text-slate-300">•</span>
                        <Settings className="h-4 w-4" />
                        {vehicle.transmission}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${vehicle.is_available ? 'text-green-600' : 'text-red-600'}`}>
                          {vehicle.is_available ? 'Disponible' : 'Indisponible'}
                        </span>
                        <Switch
                          checked={vehicle.is_available}
                          onCheckedChange={() => toggleAvailability(vehicle.id, vehicle.is_available)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Specs */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {vehicle.seats && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm">
                        <Users className="h-4 w-4" />
                        {vehicle.seats} places
                      </span>
                    )}
                    {vehicle.load_capacity && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm">
                        <Package className="h-4 w-4" />
                        {vehicle.load_capacity}
                      </span>
                    )}
                    {vehicle.engine_power && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm">
                        <Gauge className="h-4 w-4" />
                        {vehicle.engine_power}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <p className="flex items-center gap-2 text-slate-600 mb-4">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    {vehicle.location}
                  </p>

                  {/* Features */}
                  {vehicle.features && vehicle.features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {vehicle.features.slice(0, 4).map((feature) => (
                        <span key={feature} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          {feature.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {vehicle.features.length > 4 && (
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs">
                          +{vehicle.features.length - 4} autres
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pricing & Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-baseline gap-4">
                      <div>
                        <span className="text-2xl font-bold text-indigo-600">
                          {Number(vehicle.price_per_day).toLocaleString('fr-FR')}
                        </span>
                        <span className="text-slate-500 ml-1">GNF/jour</span>
                      </div>
                      {vehicle.price_per_week && (
                        <div className="text-sm text-slate-500">
                          {Number(vehicle.price_per_week).toLocaleString('fr-FR')} GNF/sem
                        </div>
                      )}
                      {vehicle.price_per_month && (
                        <div className="text-sm text-slate-500">
                          {Number(vehicle.price_per_month).toLocaleString('fr-FR')} GNF/mois
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleDeleteClick(vehicle)}
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
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le véhicule "{vehicleToDelete?.brand} {vehicleToDelete?.model}" sera définitivement supprimé.
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

export default MyVehicles;
