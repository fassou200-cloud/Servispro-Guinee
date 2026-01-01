import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RentalListingForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    property_type: 'Apartment',
    title: '',
    description: '',
    location: '',
    rental_price: ''
  });
  const [saving, setSaving] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate files - only images and max 5MB each
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

    // Add to selected photos
    setSelectedPhotos([...selectedPhotos, ...validFiles]);

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
    
    toast.success(`${validFiles.length} photo(s) ajoutée(s)`);
  };

  const removePhoto = (index) => {
    const newPhotos = selectedPhotos.filter((_, i) => i !== index);
    const newPreviews = photoPreviewUrls.filter((_, i) => i !== index);
    
    // Revoke the object URL to free memory
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
        rental_price: parseFloat(formData.rental_price)
      };

      // Create rental listing
      const response = await axios.post(`${API}/rentals`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const rentalId = response.data.id;

      // Upload photos if any
      if (selectedPhotos.length > 0) {
        for (const photo of selectedPhotos) {
          const photoFormData = new FormData();
          photoFormData.append('file', photo);

          await axios.post(`${API}/rentals/${rentalId}/upload-photo`, photoFormData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      toast.success('Annonce de location créée avec succès !');
      
      // Reset form
      setFormData({
        property_type: 'Apartment',
        title: '',
        description: '',
        location: '',
        rental_price: ''
      });
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec de la création de l\'annonce');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-8">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
        Créer une Annonce de Location
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              </SelectContent>
            </Select>
          </div>

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
                GNF
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos" className="font-heading text-xs uppercase tracking-wide">
              Photos (Optionnel - max 5MB par photo)
            </Label>
            <input
              id="photos"
              type="file"
              data-testid="rental-photos-input"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              data-testid="select-rental-photos-button"
              onClick={() => document.getElementById('photos').click()}
              className="w-full h-12 gap-2"
            >
              <Upload className="h-4 w-4" />
              Sélectionner des Photos ({selectedPhotos.length} sélectionnée{selectedPhotos.length > 1 ? 's' : ''})
            </Button>
            
            {photoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Aperçu ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/90 transition-colors opacity-0 group-hover:opacity-100"
                      data-testid={`remove-photo-${index}`}
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
            data-testid="create-rental-button"
            className="w-full h-12 font-heading font-bold text-base"
            disabled={saving}
          >
            {saving ? 'Création en cours...' : 'Créer l\'Annonce'}
          </Button>
        </form>
    </Card>
  );
};

export default RentalListingForm;