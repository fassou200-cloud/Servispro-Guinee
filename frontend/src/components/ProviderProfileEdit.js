import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { 
  X, Save, Camera, User, Phone, MapPin, Clock, FileText, 
  Loader2, CheckCircle, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getRegions, getVillesByRegion, getCommunesByVille, getQuartiersByCommune } from '@/data/guineaLocations';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Experience options
const EXPERIENCE_OPTIONS = [
  { value: '0-1', label: "Moins d'1 an" },
  { value: '1-2', label: '1 - 2 ans' },
  { value: '2-5', label: '2 - 5 ans' },
  { value: '5-10', label: '5 - 10 ans' },
  { value: '10-15', label: '10 - 15 ans' },
  { value: '15-20', label: '15 - 20 ans' },
  { value: '20+', label: 'Plus de 20 ans' }
];

const ProviderProfileEdit = ({ provider, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    first_name: provider.first_name || '',
    last_name: provider.last_name || '',
    about_me: provider.about_me || '',
    years_experience: provider.years_experience || '',
    region: provider.region || '',
    ville: provider.ville || '',
    commune: provider.commune || '',
    quartier: provider.quartier || '',
    online_status: provider.online_status || false
  });
  
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePicture, setProfilePicture] = useState(provider.profile_picture);
  const photoInputRef = useRef(null);

  // Dynamic location options
  const [villes, setVilles] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [quartiers, setQuartiers] = useState([]);

  const regions = getRegions();

  // Update villes when region changes
  useEffect(() => {
    if (formData.region) {
      setVilles(getVillesByRegion(formData.region));
    } else {
      setVilles([]);
      setCommunes([]);
      setQuartiers([]);
    }
  }, [formData.region]);

  // Update communes when ville changes
  useEffect(() => {
    if (formData.region && formData.ville) {
      setCommunes(getCommunesByVille(formData.region, formData.ville));
    } else {
      setCommunes([]);
      setQuartiers([]);
    }
  }, [formData.ville, formData.region]);

  // Update quartiers when commune changes
  useEffect(() => {
    if (formData.region && formData.ville && formData.commune) {
      setQuartiers(getQuartiersByCommune(formData.region, formData.ville, formData.commune));
    } else {
      setQuartiers([]);
    }
  }, [formData.commune, formData.ville, formData.region]);

  const handleChange = (field, value) => {
    // Reset dependent fields when parent changes
    if (field === 'region') {
      setFormData(prev => ({ ...prev, [field]: value, ville: '', commune: '', quartier: '' }));
    } else if (field === 'ville') {
      setFormData(prev => ({ ...prev, [field]: value, commune: '', quartier: '' }));
    } else if (field === 'commune') {
      setFormData(prev => ({ ...prev, [field]: value, quartier: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 5 Mo');
      return;
    }

    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem('providerToken');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post(`${API}/profile/upload-picture`, formDataUpload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setProfilePicture(response.data.profile_picture);
      toast.success('Photo de profil mise à jour !');
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Erreur lors du téléchargement de la photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Le prénom et le nom sont obligatoires');
      return;
    }

    if (formData.about_me && formData.about_me.trim().length < 20) {
      toast.error('La description "À propos" doit contenir au moins 20 caractères');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('providerToken');
      
      // Prepare update data (only send non-empty fields)
      const updateData = {};
      if (formData.first_name.trim()) updateData.first_name = formData.first_name.trim();
      if (formData.last_name.trim()) updateData.last_name = formData.last_name.trim();
      if (formData.about_me.trim()) updateData.about_me = formData.about_me.trim();
      if (formData.years_experience) updateData.years_experience = formData.years_experience;
      if (formData.region) updateData.region = formData.region;
      if (formData.ville) updateData.ville = formData.ville;
      if (formData.commune) updateData.commune = formData.commune;
      if (formData.quartier) updateData.quartier = formData.quartier;
      updateData.online_status = formData.online_status;

      const response = await axios.put(`${API}/profile/me`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update localStorage
      const storedProvider = JSON.parse(localStorage.getItem('provider') || '{}');
      const updatedProvider = { ...storedProvider, ...response.data, profile_picture: profilePicture };
      localStorage.setItem('provider', JSON.stringify(updatedProvider));

      toast.success('Profil mis à jour avec succès !');
      onSave({ ...response.data, profile_picture: profilePicture });
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-t-3xl flex items-center justify-between z-10">
          <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            Modifier mon profil
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="h-28 w-28 ring-4 ring-green-100 shadow-lg">
                <AvatarImage 
                  src={getImageUrl(profilePicture)}
                  alt="Photo de profil"
                />
                <AvatarFallback className="text-3xl font-bold bg-green-100 text-green-700">
                  {formData.first_name[0]}{formData.last_name[0]}
                </AvatarFallback>
              </Avatar>
              
              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
              
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-colors"
                data-testid="change-photo-btn"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">Cliquez pour changer votre photo</p>
          </div>

          {/* Personal Information */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              Informations personnelles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="Votre prénom"
                  className="border-gray-300"
                  data-testid="edit-first-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Votre nom"
                  className="border-gray-300"
                  data-testid="edit-last-name"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Téléphone
              </label>
              <Input
                value={provider.phone_number || ''}
                disabled
                className="bg-gray-100 text-gray-500 border-gray-200"
              />
              <p className="text-xs text-gray-400 mt-1">Le numéro de téléphone ne peut pas être modifié</p>
            </div>
          </div>

          {/* About Me */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              À propos de moi
            </h3>
            <Textarea
              value={formData.about_me}
              onChange={(e) => handleChange('about_me', e.target.value)}
              placeholder="Décrivez votre expérience, vos compétences et ce qui vous distingue..."
              className="min-h-[120px] border-gray-300"
              data-testid="edit-about-me"
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.about_me.length} caractères (minimum 20)
            </p>
          </div>

          {/* Location */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              Localisation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Région</label>
                <select
                  value={formData.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  data-testid="edit-region"
                >
                  <option value="">Sélectionner une région</option>
                  {regions.map(region => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <select
                  value={formData.ville}
                  onChange={(e) => handleChange('ville', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={!formData.region}
                  data-testid="edit-ville"
                >
                  <option value="">Sélectionner une ville</option>
                  {villes.map(ville => (
                    <option key={ville.id} value={ville.id}>{ville.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commune</label>
                <select
                  value={formData.commune}
                  onChange={(e) => handleChange('commune', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={!formData.ville}
                  data-testid="edit-commune"
                >
                  <option value="">Sélectionner une commune</option>
                  {communes.map(commune => (
                    <option key={commune.id} value={commune.id}>{commune.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quartier</label>
                <select
                  value={formData.quartier}
                  onChange={(e) => handleChange('quartier', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={!formData.commune}
                  data-testid="edit-quartier"
                >
                  <option value="">Sélectionner un quartier</option>
                  {quartiers.map(quartier => (
                    <option key={quartier} value={quartier}>{quartier}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-green-600" />
              Expérience
            </h3>
            <select
              value={formData.years_experience}
              onChange={(e) => handleChange('years_experience', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              data-testid="edit-experience"
            >
              <option value="">Sélectionner votre expérience</option>
              {EXPERIENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              Disponibilité
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Statut en ligne</p>
                <p className="text-sm text-gray-500">
                  {formData.online_status 
                    ? 'Vous êtes visible et disponible pour les clients' 
                    : 'Vous êtes hors ligne et invisible pour les clients'}
                </p>
              </div>
              <Switch
                checked={formData.online_status}
                onCheckedChange={(checked) => handleChange('online_status', checked)}
                data-testid="edit-online-status"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-500 hover:bg-green-600"
              disabled={saving}
              data-testid="save-profile-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProviderProfileEdit;
