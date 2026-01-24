import { useState } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Upload, X, Home, Building, MapPin, FileText, Camera, Shield, 
  User, AlertTriangle, CheckCircle, Trees, Car, Waves, Ruler
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Property features
const PROPERTY_FEATURES = [
  { id: 'securite_24h', label: 'Sécurité 24h/24', icon: Shield },
  { id: 'gardien', label: 'Gardien', icon: User },
  { id: 'eau_courante', label: 'Eau Courante', icon: Waves },
  { id: 'electricite', label: 'Électricité', icon: Home },
  { id: 'climatisation', label: 'Climatisation', icon: Home },
  { id: 'internet', label: 'Internet/Fibre', icon: Home },
  { id: 'cuisine_equipee', label: 'Cuisine Équipée', icon: Home },
  { id: 'terrasse', label: 'Terrasse', icon: Home },
  { id: 'balcon', label: 'Balcon', icon: Home },
  { id: 'vue_mer', label: 'Vue sur Mer', icon: Waves },
  { id: 'acces_route', label: 'Accès Route Bitumée', icon: Car },
  { id: 'titre_definitif', label: 'Titre Définitif', icon: FileText },
];

const PropertySaleForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    property_type: 'Maison',
    title: '',
    description: '',
    location: '',
    sale_price: '',
    surface_area: '',
    num_rooms: '',
    num_bathrooms: '',
    has_garage: false,
    has_garden: false,
    has_pool: false,
    year_built: '',
    features: [],
    is_negotiable: true
  });
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdSaleId, setCreatedSaleId] = useState(null);
  
  // Files state
  const [photos, setPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
  const [documents, setDocuments] = useState({
    titre_foncier: null,
    document_ministere_habitat: null,
    document_batiment: null,
    documents_additionnels: []
  });
  const [documentNames, setDocumentNames] = useState({
    titre_foncier: '',
    document_ministere_habitat: '',
    document_batiment: '',
    documents_additionnels: []
  });

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

    setPhotos([...photos, ...validFiles]);
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
    toast.success(`${validFiles.length} photo(s) ajoutée(s)`);
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos(newPhotos);
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
        sale_price: parseInt(formData.sale_price) || 0,
        num_rooms: formData.num_rooms ? parseInt(formData.num_rooms) : null,
        num_bathrooms: formData.num_bathrooms ? parseInt(formData.num_bathrooms) : null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
      };

      const response = await axios.post(`${API}/property-sales`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCreatedSaleId(response.data.id);
      toast.success('Propriété créée ! Ajoutez maintenant les photos et documents.');
      setCurrentStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de la création'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitStep2 = async () => {
    if (!createdSaleId) return;
    
    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      // Upload photos
      for (const photo of photos) {
        const photoFormData = new FormData();
        photoFormData.append('file', photo);

        await axios.post(`${API}/property-sales/${createdSaleId}/upload-photo`, photoFormData, {
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
            
            await axios.post(`${API}/property-sales/${createdSaleId}/upload-document/${docType}`, docFormData, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            });
          }
        } else if (file) {
          const docFormData = new FormData();
          docFormData.append('file', file);
          
          await axios.post(`${API}/property-sales/${createdSaleId}/upload-document/${docType}`, docFormData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      toast.success('Propriété publiée avec succès !');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de l\'upload des fichiers'));
    } finally {
      setSaving(false);
    }
  };

  const propertyTypes = [
    { value: 'Maison', label: 'Maison', icon: Home },
    { value: 'Terrain', label: 'Terrain', icon: Trees },
    { value: 'Appartement', label: 'Appartement', icon: Building },
    { value: 'Villa', label: 'Villa', icon: Home },
    { value: 'Immeuble', label: 'Immeuble', icon: Building },
    { value: 'Bureau', label: 'Bureau/Commerce', icon: Building },
  ];

  // Step 1: Property Information
  if (currentStep === 1) {
    return (
      <Card className="p-8 rounded-3xl shadow-lg border-0 bg-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Home className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-heading font-bold text-slate-900">
              Vente Immobilière
            </h3>
            <p className="text-slate-500">Étape 1/2 - Informations de la propriété</p>
          </div>
        </div>

        <form onSubmit={handleSubmitStep1} className="space-y-6">
          {/* Property Type */}
          <div className="space-y-2">
            <Label className="font-heading text-xs uppercase tracking-wide text-slate-600">
              Type de Propriété *
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {propertyTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.property_type === type.value ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, property_type: type.value })}
                    className={`h-16 flex-col gap-1 ${formData.property_type === type.value ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="font-heading text-xs uppercase tracking-wide text-slate-600">
              Titre de l'Annonce *
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="h-12 rounded-xl"
              placeholder="Ex: Belle villa avec jardin à Kipé"
            />
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

          {/* Price & Surface */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sale_price" className="font-heading text-xs uppercase tracking-wide text-slate-600">
                Prix de Vente (GNF) *
              </Label>
              <Input
                id="sale_price"
                name="sale_price"
                type="number"
                min="0"
                value={formData.sale_price}
                onChange={handleChange}
                required
                className="h-12 rounded-xl font-mono"
                placeholder="500000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surface_area" className="font-heading text-xs uppercase tracking-wide text-slate-600">
                Surface
              </Label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="surface_area"
                  name="surface_area"
                  value={formData.surface_area}
                  onChange={handleChange}
                  className="h-12 pl-10 rounded-xl"
                  placeholder="Ex: 500 m²"
                />
              </div>
            </div>
          </div>

          {/* Rooms & Bathrooms (for buildings) */}
          {formData.property_type !== 'Terrain' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="num_rooms" className="font-heading text-xs uppercase tracking-wide text-slate-600">
                  Nombre de Pièces
                </Label>
                <Input
                  id="num_rooms"
                  name="num_rooms"
                  type="number"
                  min="1"
                  value={formData.num_rooms}
                  onChange={handleChange}
                  className="h-12 rounded-xl"
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num_bathrooms" className="font-heading text-xs uppercase tracking-wide text-slate-600">
                  Salles de Bain
                </Label>
                <Input
                  id="num_bathrooms"
                  name="num_bathrooms"
                  type="number"
                  min="0"
                  value={formData.num_bathrooms}
                  onChange={handleChange}
                  className="h-12 rounded-xl"
                  placeholder="2"
                />
              </div>
            </div>
          )}

          {/* Year Built */}
          {formData.property_type !== 'Terrain' && (
            <div className="space-y-2">
              <Label htmlFor="year_built" className="font-heading text-xs uppercase tracking-wide text-slate-600">
                Année de Construction
              </Label>
              <Input
                id="year_built"
                name="year_built"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.year_built}
                onChange={handleChange}
                className="h-12 rounded-xl"
                placeholder="2020"
              />
            </div>
          )}

          {/* Options (Garage, Garden, Pool) */}
          {formData.property_type !== 'Terrain' && (
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.has_garage}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_garage: checked })}
                />
                <Label className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Garage
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.has_garden}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_garden: checked })}
                />
                <Label className="flex items-center gap-2">
                  <Trees className="h-4 w-4" />
                  Jardin
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.has_pool}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_pool: checked })}
                />
                <Label className="flex items-center gap-2">
                  <Waves className="h-4 w-4" />
                  Piscine
                </Label>
              </div>
            </div>
          )}

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
              placeholder="Décrivez la propriété en détail..."
            />
          </div>

          {/* Features */}
          <div className="space-y-4">
            <Label className="font-heading text-xs uppercase tracking-wide text-slate-600">
              Caractéristiques
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PROPERTY_FEATURES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleFeature(id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all ${
                    formData.features.includes(id)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Negotiable */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <Label className="font-medium text-slate-900">Prix Négociable</Label>
              <p className="text-sm text-slate-500">
                {formData.is_negotiable ? 'Le prix est négociable' : 'Prix ferme, non négociable'}
              </p>
            </div>
            <Switch
              checked={formData.is_negotiable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_negotiable: checked })}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-14 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/30"
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
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <FileText className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-slate-900">
            Photos & Documents
          </h3>
          <p className="text-slate-500">Étape 2/2 - Pièces justificatives obligatoires</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-800">Documents Obligatoires</h4>
          <p className="text-sm text-amber-700">
            Conformément à la réglementation du Ministère de l'Habitat, les documents suivants sont requis 
            pour toute transaction immobilière en Guinée.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Photos Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-600" />
            <Label className="font-heading font-bold text-slate-900">
              Photos de la Propriété *
            </Label>
          </div>
          <input
            id="sale-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('sale-photos').click()}
            className="w-full h-14 gap-2 rounded-xl border-dashed border-2"
          >
            <Upload className="h-5 w-5" />
            Ajouter des Photos ({photos.length})
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

        {/* Required Documents */}
        <div className="space-y-4 p-6 bg-slate-50 rounded-2xl">
          <h4 className="font-heading font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Documents Légaux Requis
          </h4>

          {/* Titre Foncier */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-red-500" />
              Titre Foncier *
            </Label>
            <div className="flex gap-2">
              <input
                id="titre-foncier"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentSelect('titre_foncier', e)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('titre-foncier').click()}
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
              <User className="h-4 w-4 text-red-500" />
              Pièce d'Identité du Vendeur (CNI ou Passeport) *
            </Label>
            <div className="flex gap-2">
              <input
                id="seller-id"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentSelect('seller_id_document', e)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('seller-id').click()}
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
                id="ministry-reg"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentSelect('registration_ministere', e)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('ministry-reg').click()}
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
              Autres Documents (Permis de construire, Plan cadastral, etc.)
            </Label>
            <input
              id="additional-docs"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleDocumentSelect('documents_additionnels', e)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('additional-docs').click()}
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
            className="flex-1 h-14 font-heading font-bold text-base rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/30"
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

export default PropertySaleForm;
