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
  Upload, X, Wifi, Wind, Car, Utensils, Tv, Bath, Thermometer, Phone, 
  Laptop, Shirt, Lock, Coffee, Droplets, ShowerHead, Mountain, Volume2, 
  Flame, Sofa, Baby, UtensilsCrossed, Sun, Users, ChefHat, Waves,
  BedDouble, Armchair, Hotel, Refrigerator, Microwave as MicrowaveIcon,
  CircleDot, CheckCircle, FileText, Shield, User, Building, AlertTriangle
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper function to extract error message from API response
const getErrorMessage = (error, defaultMessage = 'Une erreur est survenue') => {
  const detail = error.response?.data?.detail;
  if (!detail) return defaultMessage;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    // Pydantic validation error format
    return detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return defaultMessage;
};

// Organized amenities by category
const AMENITIES_CATEGORIES = [
  {
    category: "Chambre & Confort",
    items: [
      { id: 'climatisation', label: 'Climatisation', icon: Wind },
      { id: 'chauffage', label: 'Chauffage', icon: Thermometer },
      { id: 'wifi', label: 'WiFi Gratuit', icon: Wifi },
      { id: 'tv', label: 'Télévision (Smart TV)', icon: Tv },
      { id: 'telephone', label: 'Téléphone', icon: Phone },
      { id: 'bureau', label: 'Bureau & Chaise', icon: Laptop },
      { id: 'armoire', label: 'Armoire / Penderie', icon: Armchair },
      { id: 'fer_repasser', label: 'Fer & Planche à Repasser', icon: Shirt },
      { id: 'seche_cheveux', label: 'Sèche-cheveux', icon: Wind },
      { id: 'coffre_fort', label: 'Coffre-fort', icon: Lock },
      { id: 'mini_frigo', label: 'Mini-réfrigérateur', icon: Refrigerator },
      { id: 'micro_ondes', label: 'Micro-ondes', icon: MicrowaveIcon },
      { id: 'cafetiere', label: 'Cafetière / Théière', icon: Coffee },
      { id: 'bouilloire', label: 'Bouilloire Électrique', icon: Coffee },
      { id: 'eau_bouteille', label: 'Eau en Bouteille', icon: Droplets },
      { id: 'chaussons', label: 'Chaussons', icon: CircleDot },
      { id: 'peignoirs', label: 'Peignoirs', icon: Shirt },
      { id: 'serviettes', label: 'Serviettes & Articles de Toilette', icon: Bath },
    ]
  },
  {
    category: "Salle de Bain",
    items: [
      { id: 'salle_bain_privee', label: 'Salle de Bain Privée', icon: Bath },
      { id: 'baignoire', label: 'Baignoire', icon: Bath },
      { id: 'douche', label: 'Douche', icon: ShowerHead },
    ]
  },
  {
    category: "Extérieur & Vue",
    items: [
      { id: 'balcon', label: 'Balcon / Terrasse', icon: Sun },
      { id: 'vue', label: 'Vue (Océan / Ville / Jardin)', icon: Mountain },
      { id: 'insonorisation', label: 'Chambres Insonorisées', icon: Volume2 },
      { id: 'cheminee', label: 'Cheminée', icon: Flame },
    ]
  },
  {
    category: "Couchage Supplémentaire",
    items: [
      { id: 'canape_lit', label: 'Canapé-lit / Lit Extra', icon: Sofa },
      { id: 'lit_bebe', label: 'Lit Bébé / Berceau', icon: Baby },
    ]
  },
  {
    category: "Restauration",
    items: [
      { id: 'restaurant', label: 'Restaurant (sur place)', icon: UtensilsCrossed },
      { id: 'diner', label: 'Service Dîner', icon: UtensilsCrossed },
      { id: 'dejeuner', label: 'Service Déjeuner', icon: UtensilsCrossed },
      { id: 'petit_dejeuner', label: 'Petit-déjeuner', icon: Coffee },
      { id: 'petit_dej_gratuit', label: 'Petit-déjeuner Gratuit', icon: Coffee },
      { id: 'room_service', label: 'Service en Chambre', icon: Hotel },
      { id: 'bar', label: 'Bar / Lounge', icon: UtensilsCrossed },
      { id: 'bar_piscine', label: 'Bar Piscine', icon: Waves },
      { id: 'snack_bar', label: 'Snack Bar', icon: UtensilsCrossed },
      { id: 'cafe', label: 'Coffee Shop / Café', icon: Coffee },
      { id: 'cuisine_partagee', label: 'Cuisine Partagée', icon: ChefHat },
      { id: 'cuisine', label: 'Cuisine Équipée Complète', icon: Utensils },
      { id: 'bbq', label: 'Barbecue / Grill', icon: Flame },
    ]
  },
  {
    category: "Autres",
    items: [
      { id: 'parking', label: 'Parking', icon: Car },
      { id: 'piscine', label: 'Piscine', icon: Waves },
      { id: 'salle_sport', label: 'Salle de Sport', icon: Users },
    ]
  }
];

// Flat list of all amenities for easy lookup
const ALL_AMENITIES = AMENITIES_CATEGORIES.flatMap(cat => cat.items);

const RentalListingForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    property_type: 'Apartment',
    title: '',
    description: '',
    location: '',
    rental_price: '',
    rental_type: 'long_term',
    price_per_night: '',
    min_nights: '1',
    max_guests: '',
    amenities: [],
    is_available: true,
    available_from: '',
    available_to: ''
  });
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdRentalId, setCreatedRentalId] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(['Chambre & Confort']);
  
  // Documents state
  const [documents, setDocuments] = useState({
    titre_foncier: null,
    registration_ministere: null,
    seller_id_document: null,
    documents_additionnels: []
  });
  const [documentNames, setDocumentNames] = useState({
    titre_foncier: '',
    registration_ministere: '',
    seller_id_document: '',
    documents_additionnels: []
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleAmenity = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
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

  const handleDocumentSelect = (docType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop grand (max 10MB)');
      return;
    }

    if (docType === 'documents_additionnels') {
      setDocuments(prev => ({
        ...prev,
        documents_additionnels: [...prev.documents_additionnels, file]
      }));
      setDocumentNames(prev => ({
        ...prev,
        documents_additionnels: [...prev.documents_additionnels, file.name]
      }));
    } else {
      setDocuments(prev => ({ ...prev, [docType]: file }));
      setDocumentNames(prev => ({ ...prev, [docType]: file.name }));
    }
    
    toast.success('Document ajouté');
  };

  const removeDocument = (docType, index = null) => {
    if (docType === 'documents_additionnels' && index !== null) {
      setDocuments(prev => ({
        ...prev,
        documents_additionnels: prev.documents_additionnels.filter((_, i) => i !== index)
      }));
      setDocumentNames(prev => ({
        ...prev,
        documents_additionnels: prev.documents_additionnels.filter((_, i) => i !== index)
      }));
    } else {
      setDocuments(prev => ({ ...prev, [docType]: null }));
      setDocumentNames(prev => ({ ...prev, [docType]: '' }));
    }
  };

  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        rental_price: parseFloat(formData.rental_price) || 0,
        price_per_night: formData.rental_type === 'short_term' ? parseFloat(formData.price_per_night) : null,
        min_nights: formData.rental_type === 'short_term' ? parseInt(formData.min_nights) : 1,
        max_guests: formData.max_guests ? parseInt(formData.max_guests) : null,
        available_from: formData.available_from || null,
        available_to: formData.available_to || null
      };

      const response = await axios.post(`${API}/rentals`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCreatedRentalId(response.data.id);
      toast.success('Annonce créée ! Ajoutez maintenant les photos et documents.');
      setCurrentStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de la création'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitStep2 = async () => {
    if (!createdRentalId) return;
    
    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      // Upload photos
      for (const photo of selectedPhotos) {
        const photoFormData = new FormData();
        photoFormData.append('file', photo);

        await axios.post(`${API}/rentals/${createdRentalId}/upload-photo`, photoFormData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      // Upload documents
      for (const [docType, file] of Object.entries(documents)) {
        if (docType === 'documents_additionnels') {
          for (const additionalFile of file) {
            const docFormData = new FormData();
            docFormData.append('file', additionalFile);
            
            await axios.post(`${API}/rentals/${createdRentalId}/upload-document/${docType}`, docFormData, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            });
          }
        } else if (file) {
          const docFormData = new FormData();
          docFormData.append('file', file);
          
          await axios.post(`${API}/rentals/${createdRentalId}/upload-document/${docType}`, docFormData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      toast.success('Annonce publiée avec succès !');
      
      // Reset form
      setFormData({
        property_type: 'Apartment',
        title: '',
        description: '',
        location: '',
        rental_price: '',
        rental_type: 'long_term',
        price_per_night: '',
        min_nights: '1',
        max_guests: '',
        amenities: [],
        is_available: true,
        available_from: '',
        available_to: ''
      });
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
      setDocuments({
        titre_foncier: null,
        registration_ministere: null,
        seller_id_document: null,
        documents_additionnels: []
      });
      setDocumentNames({
        titre_foncier: '',
        registration_ministere: '',
        seller_id_document: '',
        documents_additionnels: []
      });
      setCurrentStep(1);
      setCreatedRentalId(null);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec de l\'upload des fichiers');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Redirect to step-based submission
    handleSubmitStep1(e);
  };

  // Step 1: Property Information
  if (currentStep === 1) {
    return (
      <Card className="p-8 rounded-3xl shadow-lg border-0 bg-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Building className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-heading font-bold text-slate-900">
              Créer une Annonce de Location
            </h3>
            <p className="text-slate-500">Étape 1/2 - Informations de la propriété</p>
          </div>
        </div>

        <form onSubmit={handleSubmitStep1} className="space-y-6">
          {/* Property Type */}
          <div className="space-y-2">
            <Label htmlFor="property_type" className="font-heading text-xs uppercase tracking-wide">
              Type de Propriété *
            </Label>
            <Select
              value={formData.property_type}
              onValueChange={(value) => setFormData({ ...formData, property_type: value })}
            >
              <SelectTrigger data-testid="rental-property-type-select" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Apartment">Appartement</SelectItem>
                <SelectItem value="House">Maison</SelectItem>
                <SelectItem value="Villa">Villa</SelectItem>
                <SelectItem value="Studio">Studio</SelectItem>
                <SelectItem value="Chambre">Chambre d'Hôtes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rental Type */}
          <div className="space-y-2">
            <Label className="font-heading text-xs uppercase tracking-wide">
              Type de Location *
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={formData.rental_type === 'long_term' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, rental_type: 'long_term' })}
                className="h-12"
              >
                Location Longue Durée
              </Button>
              <Button
                type="button"
                variant={formData.rental_type === 'short_term' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, rental_type: 'short_term' })}
                className="h-12"
              >
                Location Courte Durée (Airbnb)
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="font-heading text-xs uppercase tracking-wide">
              Titre *
            </Label>
            <Input
              id="title"
              name="title"
              data-testid="rental-title-input"
              value={formData.title}
              onChange={handleChange}
              required
              className="h-12"
              placeholder="Ex: Bel Appartement 3 Chambres à Kaloum"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="font-heading text-xs uppercase tracking-wide">
              Description *
            </Label>
            <Textarea
              id="description"
              name="description"
              data-testid="rental-description-textarea"
              value={formData.description}
              onChange={handleChange}
              required
              rows={5}
              className="resize-none"
              placeholder="Décrivez la propriété, les commodités, etc..."
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="font-heading text-xs uppercase tracking-wide">
              Localisation *
            </Label>
            <Input
              id="location"
              name="location"
              data-testid="rental-location-input"
              value={formData.location}
              onChange={handleChange}
              required
              className="h-12"
              placeholder="Quartier, Commune, Ville"
            />
          </div>

          {/* Pricing based on rental type */}
          {formData.rental_type === 'long_term' ? (
            <div className="space-y-2">
              <Label htmlFor="rental_price" className="font-heading text-xs uppercase tracking-wide">
                Prix Mensuel (GNF) *
              </Label>
              <div className="relative">
                <Input
                  id="rental_price"
                  name="rental_price"
                  type="number"
                  step="1"
                  min="0"
                  data-testid="rental-price-input"
                  value={formData.rental_price}
                  onChange={handleChange}
                  required
                  className="h-12 font-mono pr-16"
                  placeholder="500000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  GNF/mois
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_per_night" className="font-heading text-xs uppercase tracking-wide">
                  Prix par Nuit (GNF) *
                </Label>
                <div className="relative">
                  <Input
                    id="price_per_night"
                    name="price_per_night"
                    type="number"
                    step="1"
                    min="0"
                    data-testid="rental-price-per-night-input"
                    value={formData.price_per_night}
                    onChange={handleChange}
                    required={formData.rental_type === 'short_term'}
                    className="h-12 font-mono pr-16"
                    placeholder="150000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    GNF/nuit
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_nights" className="font-heading text-xs uppercase tracking-wide">
                  Nuits Minimum
                </Label>
                <Input
                  id="min_nights"
                  name="min_nights"
                  type="number"
                  min="1"
                  data-testid="rental-min-nights-input"
                  value={formData.min_nights}
                  onChange={handleChange}
                  className="h-12"
                  placeholder="1"
                />
              </div>
            </div>
          )}

          {/* Max Guests - for short term */}
          {formData.rental_type === 'short_term' && (
            <div className="space-y-2">
              <Label htmlFor="max_guests" className="font-heading text-xs uppercase tracking-wide">
                Nombre Maximum d'Invités
              </Label>
              <Input
                id="max_guests"
                name="max_guests"
                type="number"
                min="1"
                data-testid="rental-max-guests-input"
                value={formData.max_guests}
                onChange={handleChange}
                className="h-12"
                placeholder="4"
              />
            </div>
          )}

          {/* Amenities - Organized by Category */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-heading text-xs uppercase tracking-wide">
                Équipements & Services
              </Label>
              <span className="text-sm text-muted-foreground">
                {formData.amenities.length} sélectionné(s)
              </span>
            </div>
            
            <div className="space-y-3">
              {AMENITIES_CATEGORIES.map(({ category, items }) => (
                <div key={category} className="border border-border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-3 bg-muted/50 flex items-center justify-between hover:bg-muted transition-colors"
                  >
                    <span className="font-medium text-sm">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {items.filter(item => formData.amenities.includes(item.id)).length}/{items.length}
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${expandedCategories.includes(category) ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {expandedCategories.includes(category) && (
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {items.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleAmenity(id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            formData.amenities.includes(id)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background border border-border hover:border-primary/50'
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-left truncate">{label}</span>
                          {formData.amenities.includes(id) && (
                            <CheckCircle className="h-4 w-4 ml-auto flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Availability Section */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="font-heading text-xs uppercase tracking-wide">
                Disponibilité
              </Label>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${formData.is_available ? 'text-green-600' : 'text-red-600'}`}>
                  {formData.is_available ? 'Disponible' : 'Indisponible'}
                </span>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="available_from" className="text-xs text-muted-foreground">
                  Disponible à partir du
                </Label>
                <Input
                  id="available_from"
                  name="available_from"
                  type="date"
                  data-testid="rental-available-from-input"
                  value={formData.available_from}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="available_to" className="text-xs text-muted-foreground">
                  Disponible jusqu'au
                </Label>
                <Input
                  id="available_to"
                  name="available_to"
                  type="date"
                  data-testid="rental-available-to-input"
                  value={formData.available_to}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
            disabled={saving}
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Création en cours...
              </div>
            ) : (
              'Continuer - Photos & Documents'
            )}
          </Button>
        </form>
      </Card>
    );
  }

  // Step 2: Photos and Documents
  return (
    <Card className="p-8 rounded-3xl shadow-lg border-0 bg-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <FileText className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-slate-900">
            Photos & Documents
          </h3>
          <p className="text-slate-500">Étape 2/2 - Photos et pièces justificatives</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-blue-800">Documents Recommandés</h4>
          <p className="text-sm text-blue-700">
            Les documents légaux (titre foncier, pièce d'identité) permettent de renforcer la confiance des locataires et d'accélérer les transactions.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Photos Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <Label className="font-heading font-bold text-slate-900">
              Photos de la Propriété
            </Label>
          </div>
          <input
            id="rental-photos-step2"
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('rental-photos-step2').click()}
            className="w-full h-14 gap-2 rounded-xl border-dashed border-2"
          >
            <Upload className="h-5 w-5" />
            Ajouter des Photos ({selectedPhotos.length})
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

        {/* Documents Section */}
        <div className="space-y-4 p-6 bg-slate-50 rounded-2xl">
          <h4 className="font-heading font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Documents Légaux (Optionnel)
          </h4>

          {/* Titre Foncier */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Titre Foncier
            </Label>
            <div className="flex gap-2">
              <input
                id="rental-titre-foncier"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentSelect('titre_foncier', e)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('rental-titre-foncier').click()}
                className="flex-1 h-12 gap-2 rounded-xl"
              >
                <Upload className="h-4 w-4" />
                {documentNames.titre_foncier || 'Choisir le fichier'}
              </Button>
              {documents.titre_foncier && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDocument('titre_foncier')}
                  className="text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Seller ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Pièce d'Identité du Propriétaire (CNI ou Passeport)
            </Label>
            <div className="flex gap-2">
              <input
                id="rental-seller-id"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentSelect('seller_id_document', e)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('rental-seller-id').click()}
                className="flex-1 h-12 gap-2 rounded-xl"
              >
                <Upload className="h-4 w-4" />
                {documentNames.seller_id_document || 'Choisir le fichier'}
              </Button>
              {documents.seller_id_document && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDocument('seller_id_document')}
                  className="text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Ministry Registration */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Building className="h-4 w-4 text-amber-500" />
              Enregistrement Ministère de l'Habitat
            </Label>
            <div className="flex gap-2">
              <input
                id="rental-ministry-reg"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentSelect('registration_ministere', e)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('rental-ministry-reg').click()}
                className="flex-1 h-12 gap-2 rounded-xl"
              >
                <Upload className="h-4 w-4" />
                {documentNames.registration_ministere || 'Choisir le fichier'}
              </Button>
              {documents.registration_ministere && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDocument('registration_ministere')}
                  className="text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Additional Documents */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Autres Documents (Contrat type, Attestation, etc.)
            </Label>
            <input
              id="rental-additional-docs"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleDocumentSelect('documents_additionnels', e)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('rental-additional-docs').click()}
              className="w-full h-12 gap-2 rounded-xl"
            >
              <Upload className="h-4 w-4" />
              Ajouter un Document
            </Button>
            {documentNames.documents_additionnels.length > 0 && (
              <div className="space-y-2 mt-2">
                {documentNames.documents_additionnels.map((name, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDocument('documents_additionnels', index)}
                      className="text-red-500 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep(1)}
            className="flex-1 h-14 rounded-xl"
          >
            Retour
          </Button>
          <Button
            type="button"
            onClick={handleSubmitStep2}
            className="flex-1 h-14 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
            disabled={saving}
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publication en cours...
              </div>
            ) : (
              'Publier l\'Annonce'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default RentalListingForm;
