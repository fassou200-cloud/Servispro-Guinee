import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Upload, X, Truck, Car, Tractor, Fuel, Settings, Users, Package, 
  Gauge, MapPin, Calendar, CheckCircle
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Vehicle features by type
const VEHICLE_FEATURES = {
  Voiture: [
    { id: 'climatisation', label: 'Climatisation', icon: Settings },
    { id: 'gps', label: 'GPS', icon: MapPin },
    { id: 'bluetooth', label: 'Bluetooth', icon: Settings },
    { id: 'camera_recul', label: 'Caméra de Recul', icon: Settings },
    { id: 'siege_cuir', label: 'Sièges en Cuir', icon: Settings },
    { id: 'toit_ouvrant', label: 'Toit Ouvrant', icon: Settings },
    { id: 'regulateur', label: 'Régulateur de Vitesse', icon: Gauge },
    { id: 'abs', label: 'ABS', icon: Settings },
    { id: 'airbags', label: 'Airbags', icon: Settings },
  ],
  Camion: [
    { id: 'climatisation', label: 'Climatisation', icon: Settings },
    { id: 'gps', label: 'GPS', icon: MapPin },
    { id: 'hayon', label: 'Hayon Élévateur', icon: Package },
    { id: 'bache', label: 'Bâche', icon: Package },
    { id: 'frigo', label: 'Réfrigéré', icon: Settings },
    { id: 'grue', label: 'Grue de Chargement', icon: Package },
    { id: 'remorque', label: 'Avec Remorque', icon: Truck },
    { id: 'abs', label: 'ABS', icon: Settings },
  ],
  Tracteur: [
    { id: 'climatisation', label: 'Climatisation Cabine', icon: Settings },
    { id: 'gps', label: 'GPS Agricole', icon: MapPin },
    { id: 'charrue', label: 'Charrue Incluse', icon: Settings },
    { id: 'semoir', label: 'Semoir Disponible', icon: Settings },
    { id: 'remorque', label: 'Remorque Agricole', icon: Package },
    { id: 'pulverisateur', label: 'Pulvérisateur', icon: Settings },
    { id: '4x4', label: '4x4', icon: Settings },
    { id: 'cabine', label: 'Cabine Fermée', icon: Settings },
  ]
};

const VehicleListingForm = ({ onSuccess, userProfession }) => {
  const getDefaultVehicleType = () => {
    if (userProfession === 'Camionneur') return 'Camion';
    if (userProfession === 'Tracteur') return 'Tracteur';
    if (userProfession === 'Voiture') return 'Voiture';
    return 'Voiture';
  };

  const [formData, setFormData] = useState({
    vehicle_type: getDefaultVehicleType(),
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    fuel_type: 'Diesel',
    transmission: 'Manuelle',
    seats: '',
    load_capacity: '',
    engine_power: '',
    description: '',
    location: '',
    price_per_day: '',
    price_per_week: '',
    price_per_month: '',
    is_available: true,
    features: []
  });
  const [saving, setSaving] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleFeature = (featureId) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} est trop grande (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setSelectedPhotos([...selectedPhotos, ...validFiles]);
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
    toast.success(`${validFiles.length} photo(s) ajoutée(s)`);
  };

  const removePhoto = (index) => {
    const newPhotos = selectedPhotos.filter((_, i) => i !== index);
    const newPreviews = photoPreviewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setSelectedPhotos(newPhotos);
    setPhotoPreviewUrls(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        year: parseInt(formData.year),
        price_per_day: parseInt(formData.price_per_day) || 0,
        price_per_week: formData.price_per_week ? parseInt(formData.price_per_week) : null,
        price_per_month: formData.price_per_month ? parseInt(formData.price_per_month) : null,
        seats: formData.seats ? parseInt(formData.seats) : null,
      };

      const response = await axios.post(`${API}/vehicles`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const vehicleId = response.data.id;

      // Upload photos
      if (selectedPhotos.length > 0) {
        for (const photo of selectedPhotos) {
          const photoFormData = new FormData();
          photoFormData.append('file', photo);

          await axios.post(`${API}/vehicles/${vehicleId}/upload-photo`, photoFormData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      toast.success('Véhicule publié avec succès !');
      
      // Reset form
      setFormData({
        vehicle_type: getDefaultVehicleType(),
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        fuel_type: 'Diesel',
        transmission: 'Manuelle',
        seats: '',
        load_capacity: '',
        engine_power: '',
        description: '',
        location: '',
        price_per_day: '',
        price_per_week: '',
        price_per_month: '',
        is_available: true,
        features: []
      });
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec de la publication');
    } finally {
      setSaving(false);
    }
  };

  const currentFeatures = VEHICLE_FEATURES[formData.vehicle_type] || VEHICLE_FEATURES.Voiture;

  const vehicleTypeIcon = {
    Voiture: Car,
    Camion: Truck,
    Tracteur: Tractor
  };

  const VehicleIcon = vehicleTypeIcon[formData.vehicle_type] || Car;

  return (
    <Card className="p-8 rounded-3xl shadow-lg border-0 bg-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <VehicleIcon className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-slate-900">
            Publier un Véhicule
          </h3>
          <p className="text-slate-500">Ajoutez votre véhicule à la location</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Type */}
        <div className="space-y-2">
          <Label className="font-heading text-xs uppercase tracking-wide text-slate-600">
            Type de Véhicule *
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {['Voiture', 'Camion', 'Tracteur'].map((type) => {
              const Icon = vehicleTypeIcon[type];
              return (
                <Button
                  key={type}
                  type="button"
                  variant={formData.vehicle_type === type ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, vehicle_type: type, features: [] })}
                  className={`h-16 flex-col gap-1 ${formData.vehicle_type === type ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{type}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Brand & Model */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand" className="font-heading text-xs uppercase tracking-wide text-slate-600">
              Marque *
            </Label>
            <Input
              id="brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              required
              className="h-12 rounded-xl"
              placeholder={formData.vehicle_type === 'Tracteur' ? 'Ex: John Deere' : 'Ex: Toyota'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model" className="font-heading text-xs uppercase tracking-wide text-slate-600">
              Modèle *
            </Label>
            <Input
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              required
              className="h-12 rounded-xl"
              placeholder={formData.vehicle_type === 'Tracteur' ? 'Ex: 6M Series' : 'Ex: Corolla'}
            />
          </div>
        </div>

        {/* Year & Fuel */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="year" className="font-heading text-xs uppercase tracking-wide text-slate-600">
              Année *
            </Label>
            <Input
              id="year"
              name="year"
              type="number"
              min="1990"
              max={new Date().getFullYear() + 1}
              value={formData.year}
              onChange={handleChange}
              required
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-xs uppercase tracking-wide text-slate-600">
              Carburant *
            </Label>
            <Select
              value={formData.fuel_type}
              onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-slate-400" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Diesel">Diesel</SelectItem>
                <SelectItem value="Essence">Essence</SelectItem>
                <SelectItem value="Electrique">Électrique</SelectItem>
                <SelectItem value="Hybride">Hybride</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transmission & Specific Field */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-heading text-xs uppercase tracking-wide text-slate-600">
              Transmission
            </Label>
            <Select
              value={formData.transmission}
              onValueChange={(value) => setFormData({ ...formData, transmission: value })}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manuelle">Manuelle</SelectItem>
                <SelectItem value="Automatique">Automatique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.vehicle_type === 'Voiture' && (
            <div className="space-y-2">
              <Label htmlFor="seats" className="font-heading text-xs uppercase tracking-wide text-slate-600">
                Nombre de Places
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="seats"
                  name="seats"
                  type="number"
                  min="2"
                  max="12"
                  value={formData.seats}
                  onChange={handleChange}
                  className="h-12 pl-10 rounded-xl"
                  placeholder="5"
                />
              </div>
            </div>
          )}
          
          {formData.vehicle_type === 'Camion' && (
            <div className="space-y-2">
              <Label htmlFor="load_capacity" className="font-heading text-xs uppercase tracking-wide text-slate-600">
                Capacité de Charge
              </Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="load_capacity"
                  name="load_capacity"
                  value={formData.load_capacity}
                  onChange={handleChange}
                  className="h-12 pl-10 rounded-xl"
                  placeholder="Ex: 10 tonnes"
                />
              </div>
            </div>
          )}
          
          {formData.vehicle_type === 'Tracteur' && (
            <div className="space-y-2">
              <Label htmlFor="engine_power" className="font-heading text-xs uppercase tracking-wide text-slate-600">
                Puissance Moteur
              </Label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="engine_power"
                  name="engine_power"
                  value={formData.engine_power}
                  onChange={handleChange}
                  className="h-12 pl-10 rounded-xl"
                  placeholder="Ex: 120 CV"
                />
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="font-heading text-xs uppercase tracking-wide text-slate-600">
            Localisation *
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="h-12 pl-10 rounded-xl"
              placeholder="Quartier, Commune, Ville"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="font-heading text-xs uppercase tracking-wide text-slate-600">
            Description *
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            className="rounded-xl resize-none"
            placeholder="Décrivez votre véhicule, son état, ses équipements..."
          />
        </div>

        {/* Pricing */}
        <div className="space-y-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
          <h4 className="font-heading font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Tarification
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_per_day" className="text-sm text-slate-600">
                Prix / Jour (GNF) *
              </Label>
              <Input
                id="price_per_day"
                name="price_per_day"
                type="number"
                min="0"
                value={formData.price_per_day}
                onChange={handleChange}
                required
                className="h-12 rounded-xl font-mono"
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_week" className="text-sm text-slate-600">
                Prix / Semaine (GNF)
              </Label>
              <Input
                id="price_per_week"
                name="price_per_week"
                type="number"
                min="0"
                value={formData.price_per_week}
                onChange={handleChange}
                className="h-12 rounded-xl font-mono"
                placeholder="3000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_month" className="text-sm text-slate-600">
                Prix / Mois (GNF)
              </Label>
              <Input
                id="price_per_month"
                name="price_per_month"
                type="number"
                min="0"
                value={formData.price_per_month}
                onChange={handleChange}
                className="h-12 rounded-xl font-mono"
                placeholder="10000000"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <Label className="font-heading text-xs uppercase tracking-wide text-slate-600">
            Équipements & Options
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {currentFeatures.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleFeature(id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all ${
                  formData.features.includes(id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{label}</span>
                {formData.features.includes(id) && (
                  <CheckCircle className="h-4 w-4 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <Label className="font-medium text-slate-900">Disponibilité</Label>
            <p className="text-sm text-slate-500">
              {formData.is_available ? 'Le véhicule est disponible à la location' : 'Le véhicule n\'est pas disponible actuellement'}
            </p>
          </div>
          <Switch
            checked={formData.is_available}
            onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
          />
        </div>

        {/* Photos */}
        <div className="space-y-4">
          <Label className="font-heading text-xs uppercase tracking-wide text-slate-600">
            Photos (Max 5MB par photo)
          </Label>
          <input
            id="vehicle-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('vehicle-photos').click()}
            className="w-full h-14 gap-2 rounded-xl border-dashed border-2"
          >
            <Upload className="h-5 w-5" />
            Ajouter des Photos ({selectedPhotos.length} sélectionnée{selectedPhotos.length > 1 ? 's' : ''})
          </Button>
          
          {photoPreviewUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={url}
                    alt={`Aperçu ${index + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-14 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30"
          disabled={saving}
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Publication en cours...
            </div>
          ) : (
            'Publier le Véhicule'
          )}
        </Button>
      </form>
    </Card>
  );
};

export default VehicleListingForm;
