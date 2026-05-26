// Custom hook encapsulating property sale creation flow for real-estate companies.
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/helpers';

const blankSaleForm = {
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
  is_negotiable: true,
};

const blankDocs = {
  titre_foncier: null,
  document_ministere_habitat: null,
  document_batiment: null,
  documents_additionnels: [],
};

const blankDocNames = {
  titre_foncier: '',
  document_ministere_habitat: '',
  document_batiment: '',
  documents_additionnels: [],
};

export const useSaleManager = (API, onPublished) => {
  const [sales, setSales] = useState([]);
  const [saleForm, setSaleForm] = useState(blankSaleForm);
  const [saleStep, setSaleStep] = useState(1);
  const [createdSaleId, setCreatedSaleId] = useState(null);
  const [salePhotos, setSalePhotos] = useState([]);
  const [salePhotoPreviewUrls, setSalePhotoPreviewUrls] = useState([]);
  const [uploadingSaleFiles, setUploadingSaleFiles] = useState(false);
  const [saleDocuments, setSaleDocuments] = useState(blankDocs);
  const [saleDocumentNames, setSaleDocumentNames] = useState(blankDocNames);

  const handleSalePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} n'est pas une image`); return false; }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} est trop grande (max 5MB)`); return false; }
      return true;
    });
    if (!validFiles.length) return;
    setSalePhotos((p) => [...p, ...validFiles]);
    setSalePhotoPreviewUrls((p) => [...p, ...validFiles.map((f) => URL.createObjectURL(f))]);
    toast.success(`${validFiles.length} photo(s) ajoutée(s)`);
  };

  const removeSalePhoto = (index) => {
    URL.revokeObjectURL(salePhotoPreviewUrls[index]);
    setSalePhotos((p) => p.filter((_, i) => i !== index));
    setSalePhotoPreviewUrls((p) => p.filter((_, i) => i !== index));
  };

  const handleSaleDocumentSelect = (docType, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop grand (max 10MB)');
      return;
    }
    if (docType === 'documents_additionnels') {
      setSaleDocuments((prev) => ({ ...prev, documents_additionnels: [...prev.documents_additionnels, file] }));
      setSaleDocumentNames((prev) => ({ ...prev, documents_additionnels: [...prev.documents_additionnels, file.name] }));
    } else {
      setSaleDocuments((prev) => ({ ...prev, [docType]: file }));
      setSaleDocumentNames((prev) => ({ ...prev, [docType]: file.name }));
    }
    toast.success('Document ajouté');
  };

  const removeSaleDocument = (docType, index = null) => {
    if (docType === 'documents_additionnels' && index !== null) {
      setSaleDocuments((prev) => ({ ...prev, documents_additionnels: prev.documents_additionnels.filter((_, i) => i !== index) }));
      setSaleDocumentNames((prev) => ({ ...prev, documents_additionnels: prev.documents_additionnels.filter((_, i) => i !== index) }));
    } else {
      setSaleDocuments((prev) => ({ ...prev, [docType]: null }));
      setSaleDocumentNames((prev) => ({ ...prev, [docType]: '' }));
    }
  };

  const toggleSaleFeature = (featureId) => {
    setSaleForm((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const handleCreateSaleStep1 = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('companyToken');
    try {
      const response = await axios.post(`${API}/company/property-sales`, {
        ...saleForm,
        sale_price: parseInt(saleForm.sale_price) || 0,
        num_rooms: saleForm.num_rooms ? parseInt(saleForm.num_rooms) : null,
        num_bathrooms: saleForm.num_bathrooms ? parseInt(saleForm.num_bathrooms) : null,
        year_built: saleForm.year_built ? parseInt(saleForm.year_built) : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setCreatedSaleId(response.data.id);
      toast.success('Propriété créée ! Ajoutez maintenant les photos.');
      setSaleStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de la création'));
    }
  };

  const handleCreateSaleStep2 = async () => {
    if (!createdSaleId) return;
    if (!saleDocuments.titre_foncier) { toast.error('Le Titre Foncier est obligatoire'); return; }
    if (!saleDocuments.document_ministere_habitat) { toast.error("Le Document du Ministère de l'Habitat est obligatoire"); return; }
    if (!saleDocuments.document_batiment) { toast.error('Le Document du Bâtiment est obligatoire'); return; }

    setUploadingSaleFiles(true);
    const token = localStorage.getItem('companyToken');
    try {
      for (const photo of salePhotos) {
        const fd = new FormData();
        fd.append('file', photo);
        await axios.post(`${API}/company/property-sales/${createdSaleId}/upload-photo`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
      }
      for (const docType of ['titre_foncier', 'document_ministere_habitat', 'document_batiment']) {
        if (saleDocuments[docType]) {
          const fd = new FormData();
          fd.append('file', saleDocuments[docType]);
          await axios.post(`${API}/company/property-sales/${createdSaleId}/upload-document/${docType}`, fd, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          });
        }
      }
      for (const doc of saleDocuments.documents_additionnels) {
        const fd = new FormData();
        fd.append('file', doc);
        await axios.post(`${API}/company/property-sales/${createdSaleId}/upload-document/autres_documents`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success('Propriété publiée avec succès !');
      setSaleForm(blankSaleForm);
      setSalePhotos([]);
      setSalePhotoPreviewUrls([]);
      setSaleDocuments(blankDocs);
      setSaleDocumentNames(blankDocNames);
      setSaleStep(1);
      setCreatedSaleId(null);
      const res = await axios.get(`${API}/company/property-sales/my`, { headers: { Authorization: `Bearer ${token}` } });
      setSales(res.data);
      onPublished?.();
    } catch (error) {
      toast.error(getErrorMessage(error, "Erreur lors de l'upload des fichiers"));
    } finally {
      setUploadingSaleFiles(false);
    }
  };

  const deleteSale = async (saleId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette propriété ?')) return;
    const token = localStorage.getItem('companyToken');
    try {
      await axios.delete(`${API}/company/property-sales/${saleId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Propriété supprimée');
      setSales((p) => p.filter((s) => s.id !== saleId));
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return {
    sales, setSales,
    saleForm, setSaleForm,
    saleStep, setSaleStep,
    createdSaleId, setCreatedSaleId,
    salePhotos, setSalePhotos,
    salePhotoPreviewUrls, setSalePhotoPreviewUrls,
    uploadingSaleFiles,
    saleDocuments, setSaleDocuments,
    saleDocumentNames, setSaleDocumentNames,
    handleSalePhotoSelect, removeSalePhoto,
    handleSaleDocumentSelect, removeSaleDocument,
    toggleSaleFeature,
    handleCreateSaleStep1, handleCreateSaleStep2,
    deleteSale,
  };
};
