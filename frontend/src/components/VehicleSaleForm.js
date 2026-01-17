import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Car, Truck, Tractor, DollarSign, MapPin, Calendar, 
  Fuel, Settings, Loader2, CheckCircle, Upload, X, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const vehicleTypeIcons = {
  'Voiture': Car,
  'Camion': Truck,
  'Tracteur': Tractor
};

const VehicleSaleForm = ({ onSuccess, userProfession }) => {
  const [formData, setFormData] = useState({
    vehicle_type: userProfession === 'Camionneur' ? 'Camion' : userProfession === 'Tracteur' ? 'Tracteur' : 'Voiture',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: '',
    fuel_type: 'Diesel',
    transmission: 'Manuelle',
    price: '',
    description: '',
    location: '',
    condition: 'used'
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos autorisées');
      return;
    }

    for (const file of files) {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API}/upload/image`, formDataUpload, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
        setPhotos(prev => [...prev, response.data.file_path]);
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error('Erreur lors du téléchargement de la photo');
      }
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.brand || !formData.model || !formData.price || !formData.location) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/vehicle-sales`, {
        ...formData,
        price: parseFloat(formData.price),
        year: parseInt(formData.year),
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        photos: photos
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSubmitted(true);
      toast.success('Annonce créée avec succès !');
      
      if (onSuccess) {
        setTimeout(() => onSuccess(response.data), 2000);
      }
    } catch (error) {
      console.error('Error creating vehicle sale:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création de l\'annonce');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-heading font-bold text-green-800 mb-2">
          Annonce Créée !
        </h3>
        <p className="text-green-600 mb-4">
          Votre annonce de vente a été soumise et est en attente d'approbation par l'administrateur.
        </p>
        <div className="p-4 bg-white rounded-xl border border-green-200 mb-4 text-left">
          <p className="text-sm text-slate-600">
            <strong>Véhicule :</strong> {formData.brand} {formData.model} ({formData.year})
          </p>
          <p className="text-sm text-slate-600">
            <strong>Prix :</strong> {parseInt(formData.price).toLocaleString('fr-FR')} GNF
          </p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Les demandes d'achat seront gérées par ServisPro</span>
          </div>
        </div>
      </Card>
    );
  }

  const VehicleIcon = vehicleTypeIcons[formData.vehicle_type] || Car;

  return (
    <Card className="p-6 bg-white rounded-2xl shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-900">
            Vendre un Véhicule
          </h2>
          <p className="text-sm text-slate-500">
            Créez une annonce de vente pour votre véhicule
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Comment ça marche :</p>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-blue-600">
              <li>Créez votre annonce avec les détails du véhicule</li>
              <li>L'admin approuve votre annonce</li>
              <li>Les acheteurs intéressés contactent ServisPro</li>
              <li>ServisPro facilite la transaction</li>
            </ol>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Type */}
        <div className="space-y-2">
          <Label>Type de véhicule</Label>
          <div className="grid grid-cols-3 gap-3">
            {['Voiture', 'Camion', 'Tracteur'].map((type) => {
              const Icon = vehicleTypeIcons[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, vehicle_type: type }))}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.vehicle_type === type
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <Icon className={`h-8 w-8 ${formData.vehicle_type === type ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${formData.vehicle_type === type ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand & Model */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Marque *</Label>
            <Input
              id="brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="Toyota, Mercedes..."
              required
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modèle *</Label>
            <Input
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="Hilux, Actros..."
              required
              className="h-12"
            />
          </div>
        </div>

        {/* Year & Mileage */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="year" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
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
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mileage">Kilométrage (km)</Label>
            <Input
              id="mileage"
              name="mileage"
              type="number"
              min="0"
              value={formData.mileage}
              onChange={handleChange}
              placeholder="150000"
              className="h-12"
            />
          </div>
        </div>

        {/* Fuel & Transmission */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fuel_type" className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-slate-500" />
              Carburant
            </Label>
            <select
              id="fuel_type"
              name="fuel_type"
              value={formData.fuel_type}
              onChange={handleChange}
              className="w-full h-12 px-3 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Diesel">Diesel</option>
              <option value="Essence">Essence</option>
              <option value="Électrique">Électrique</option>
              <option value="Hybride">Hybride</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transmission" className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              Transmission
            </Label>
            <select
              id="transmission"
              name="transmission"
              value={formData.transmission}
              onChange={handleChange}
              className="w-full h-12 px-3 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Manuelle">Manuelle</option>
              <option value="Automatique">Automatique</option>
            </select>
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <Label>État du véhicule</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'new', label: 'Neuf' },
              { value: 'used', label: 'Occasion' },
              { value: 'refurbished', label: 'Reconditionné' }
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, condition: value }))}
                className={`p-3 rounded-xl border-2 transition-all ${
                  formData.condition === value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 hover:border-emerald-300 text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-slate-500" />
            Prix de vente (GNF) *
          </Label>
          <Input
            id="price"
            name="price"
            type="number"
            min="0"
            value={formData.price}
            onChange={handleChange}
            placeholder="50000000"
            required
            className="h-12 text-lg font-semibold"
          />
          {formData.price && (
            <p className="text-sm text-emerald-600">
              {parseInt(formData.price).toLocaleString('fr-FR')} GNF
            </p>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            Localisation *
          </Label>
          <Input
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Conakry, Kaloum"
            required
            className="h-12"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Décrivez votre véhicule (état, options, historique...)"
            rows={4}
            required
            className="resize-none"
          />
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <Label>Photos (max 5)</Label>
          <div className="grid grid-cols-5 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                <img 
                  src={`${BACKEND_URL}${photo}`} 
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors">
                <Upload className="h-6 w-6 mb-1" />
                <span className="text-xs">Ajouter</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  multiple
                />
              </label>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-lg rounded-xl gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <DollarSign className="h-5 w-5" />
              Publier l'Annonce de Vente
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};

export default VehicleSaleForm;
