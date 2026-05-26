// Custom hook encapsulating rental creation flow for real-estate companies.
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/helpers';

const blankRentalForm = {
  property_type: 'Apartment',
  title: '',
  description: '',
  location: '',
  rental_price: '',
  caution: '',
  mois_avance: '',
  rental_type: 'long_term',
  price_per_night: '',
  min_nights: '1',
  max_guests: '',
  amenities: [],
  is_available: true,
};

export const useRentalManager = (API, onPublished) => {
  const [rentals, setRentals] = useState([]);
  const [rentalForm, setRentalForm] = useState(blankRentalForm);
  const [rentalStep, setRentalStep] = useState(1);
  const [createdRentalId, setCreatedRentalId] = useState(null);
  const [rentalPhotos, setRentalPhotos] = useState([]);
  const [rentalPhotoPreviewUrls, setRentalPhotoPreviewUrls] = useState([]);
  const [uploadingRentalFiles, setUploadingRentalFiles] = useState(false);

  const handleRentalPhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} n'est pas une image`); return false; }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} est trop grande (max 5MB)`); return false; }
      return true;
    });
    if (!validFiles.length) return;
    setRentalPhotos((p) => [...p, ...validFiles]);
    setRentalPhotoPreviewUrls((p) => [...p, ...validFiles.map((f) => URL.createObjectURL(f))]);
    toast.success(`${validFiles.length} photo(s) ajoutée(s)`);
  };

  const removeRentalPhoto = (index) => {
    URL.revokeObjectURL(rentalPhotoPreviewUrls[index]);
    setRentalPhotos((p) => p.filter((_, i) => i !== index));
    setRentalPhotoPreviewUrls((p) => p.filter((_, i) => i !== index));
  };

  const handleCreateRentalStep1 = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('companyToken');
    try {
      const response = await axios.post(`${API}/company/rentals`, {
        ...rentalForm,
        rental_price: parseFloat(rentalForm.rental_price) || 0,
        caution: rentalForm.rental_type === 'long_term' && rentalForm.caution ? parseFloat(rentalForm.caution) : null,
        mois_avance: rentalForm.rental_type === 'long_term' && rentalForm.mois_avance ? parseInt(rentalForm.mois_avance) : null,
        price_per_night: rentalForm.rental_type === 'short_term' ? parseFloat(rentalForm.price_per_night) : null,
        min_nights: rentalForm.rental_type === 'short_term' ? parseInt(rentalForm.min_nights) : 1,
        max_guests: rentalForm.max_guests ? parseInt(rentalForm.max_guests) : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setCreatedRentalId(response.data.id);
      toast.success('Annonce créée ! Ajoutez maintenant les photos.');
      setRentalStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la création'));
    }
  };

  const handleCreateRentalStep2 = async () => {
    if (!createdRentalId) return;
    setUploadingRentalFiles(true);
    const token = localStorage.getItem('companyToken');
    try {
      for (const photo of rentalPhotos) {
        const fd = new FormData();
        fd.append('file', photo);
        await axios.post(`${API}/company/rentals/${createdRentalId}/upload-photo`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success('Location publiée avec succès !');
      setRentalForm(blankRentalForm);
      setRentalPhotos([]);
      setRentalPhotoPreviewUrls([]);
      setRentalStep(1);
      setCreatedRentalId(null);
      const res = await axios.get(`${API}/company/rentals/my`, { headers: { Authorization: `Bearer ${token}` } });
      setRentals(res.data);
      onPublished?.();
    } catch (error) {
      toast.error(getErrorMessage(error, "Erreur lors de l'upload des photos"));
    } finally {
      setUploadingRentalFiles(false);
    }
  };

  const deleteRental = async (rentalId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
    const token = localStorage.getItem('companyToken');
    try {
      await axios.delete(`${API}/company/rentals/${rentalId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Annonce supprimée');
      setRentals((p) => p.filter((r) => r.id !== rentalId));
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return {
    rentals, setRentals,
    rentalForm, setRentalForm,
    rentalStep, setRentalStep,
    createdRentalId, setCreatedRentalId,
    rentalPhotos, setRentalPhotos,
    rentalPhotoPreviewUrls, setRentalPhotoPreviewUrls,
    uploadingRentalFiles,
    handleRentalPhotoSelect, removeRentalPhoto,
    handleCreateRentalStep1, handleCreateRentalStep2,
    deleteRental,
  };
};
