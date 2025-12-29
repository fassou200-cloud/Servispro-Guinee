import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
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

    // Validate files
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      toast.error('Some files were not images and were skipped');
    }

    // Add to selected photos
    setSelectedPhotos([...selectedPhotos, ...validFiles]);

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
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

      toast.success('Rental listing created successfully!');
      
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
      toast.error(error.response?.data?.detail || 'Failed to create listing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-8">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
        Create Rental Listing
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="property_type" className="font-heading text-xs uppercase tracking-wide">
              Property Type *
            </Label>
            <Select
              value={formData.property_type}
              onValueChange={(value) => setFormData({ ...formData, property_type: value })}
            >
              <SelectTrigger data-testid="rental-property-type-select" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Apartment">Apartment</SelectItem>
                <SelectItem value="House">House</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="font-heading text-xs uppercase tracking-wide">
              Title *
            </Label>
            <Input
              id="title"
              name="title"
              data-testid="rental-title-input"
              value={formData.title}
              onChange={handleChange}
              required
              className="h-12"
              placeholder="e.g., Modern 2BR Apartment in Downtown"
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
              placeholder="Describe the property, amenities, etc..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="font-heading text-xs uppercase tracking-wide">
              Location *
            </Label>
            <Input
              id="location"
              name="location"
              data-testid="rental-location-input"
              value={formData.location}
              onChange={handleChange}
              required
              className="h-12"
              placeholder="Street address, City, State"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental_price" className="font-heading text-xs uppercase tracking-wide">
              Monthly Rental Price ($) *
            </Label>
            <Input
              id="rental_price"
              name="rental_price"
              type="number"
              step="0.01"
              min="0"
              data-testid="rental-price-input"
              value={formData.rental_price}
              onChange={handleChange}
              required
              className="h-12 font-mono"
              placeholder="1200.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos" className="font-heading text-xs uppercase tracking-wide">
              Photos (Optional)
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
              Select Photos ({selectedPhotos.length} selected)
            </Button>
            
            {photoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
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
            {saving ? 'Creating...' : 'Create Listing'}
          </Button>
        </form>
    </Card>
  );
};

export default RentalListingForm;