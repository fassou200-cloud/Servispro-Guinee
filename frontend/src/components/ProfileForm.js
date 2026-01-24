import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfileForm = ({ user, setUser, onUpdate }) => {
  const [formData, setFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    profession: user.profession,
    about_me: user.about_me || ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if user is an Agent Immobilier (don't show pricing)
  const isAgentImmobilier = user.profession === 'AgentImmobilier';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez télécharger un fichier image');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image est trop grande. Maximum 5MB.');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await axios.post(`${API}/profile/upload-picture`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUser({ ...user, profile_picture: response.data.profile_picture });
      toast.success('Photo de profil téléchargée avec succès !');
      onUpdate();
    } catch (error) {
      toast.error('Échec du téléchargement de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleIdVerificationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez télécharger un fichier image');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image est trop grande. Maximum 5MB.');
      return;
    }

    setUploadingId(true);
    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await axios.post(`${API}/profile/upload-id-verification`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUser({ ...user, id_verification_picture: response.data.id_verification_picture });
      toast.success('Pièce d\'identité téléchargée avec succès !');
      onUpdate();
    } catch (error) {
      toast.error('Échec du téléchargement de la pièce d\'identité');
    } finally {
      setUploadingId(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare data with proper type conversion
      const submitData = {
        ...formData
      };
      
      await axios.put(`${API}/profile/me`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Profil mis à jour avec succès');
      onUpdate();
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Échec de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-8">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
        Modifier le Profil
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture Upload with Preview */}
        <div className="space-y-2">
          <Label htmlFor="profile-picture" className="font-heading text-xs uppercase tracking-wide">
            Photo de Profil
          </Label>
          {user.profile_picture && (
            <div className="mb-3">
              <img
                src={`${BACKEND_URL}${user.profile_picture}`}
                alt="Photo de profil"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary"
              />
            </div>
          )}
          <div className="flex items-center gap-4">
            <input
              id="profile-picture"
              type="file"
              data-testid="profile-picture-input"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              data-testid="upload-picture-button"
              onClick={() => document.getElementById('profile-picture').click()}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Téléchargement...' : 'Télécharger Photo'}
            </Button>
            {user.profile_picture && (
              <span className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Photo téléchargée
              </span>
            )}
          </div>
        </div>

        {/* ID Verification Upload with Preview */}
        <div className="space-y-2">
          <Label htmlFor="id-verification" className="font-heading text-xs uppercase tracking-wide">
            Vérification d'Identité
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Téléchargez une photo de votre pièce d'identité pour vérification
          </p>
          {user.id_verification_picture && (
            <div className="mb-3">
              <img
                src={`${BACKEND_URL}${user.id_verification_picture}`}
                alt="Pièce d'identité"
                className="w-48 h-32 rounded-lg object-cover border-2 border-blue-500"
              />
            </div>
          )}
          <div className="flex items-center gap-4">
            <input
              id="id-verification"
              type="file"
              data-testid="id-verification-input"
              accept="image/*"
              onChange={handleIdVerificationUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              data-testid="upload-id-button"
              onClick={() => document.getElementById('id-verification').click()}
              disabled={uploadingId}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadingId ? 'Téléchargement...' : 'Télécharger ID'}
            </Button>
            {user.id_verification_picture && (
              <span className="text-sm text-green-600 flex items-center gap-2 font-medium">
                <CheckCircle className="h-4 w-4" />
                ID Vérifié
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="font-heading text-xs uppercase tracking-wide">
              Prénom
            </Label>
            <Input
              id="first_name"
              name="first_name"
              data-testid="profile-first-name-input"
              value={formData.first_name}
              onChange={handleChange}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="font-heading text-xs uppercase tracking-wide">
              Nom
            </Label>
            <Input
              id="last_name"
              name="last_name"
              data-testid="profile-last-name-input"
              value={formData.last_name}
              onChange={handleChange}
              required
              className="h-12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profession" className="font-heading text-xs uppercase tracking-wide">
            Profession
          </Label>
          <Select
            value={formData.profession}
            onValueChange={(value) => setFormData({ ...formData, profession: value, custom_profession: value === 'Autres' ? formData.custom_profession : '' })}
          >
            <SelectTrigger data-testid="profile-profession-select" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Electromecanicien">Électromécanicien</SelectItem>
              <SelectItem value="Mecanicien">Mécanicien</SelectItem>
              <SelectItem value="Plombier">Plombier</SelectItem>
              <SelectItem value="Macon">Maçon</SelectItem>
              <SelectItem value="Menuisier">Menuisier</SelectItem>
              <SelectItem value="AgentImmobilier">Propriétaire immobilier</SelectItem>
              <SelectItem value="Soudeur">Soudeur</SelectItem>
              <SelectItem value="Autres">Autres Métiers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Profession Field - Only shows when "Autres" is selected */}
        {formData.profession === 'Autres' && (
          <div className="space-y-2">
            <Label htmlFor="custom_profession" className="font-heading text-xs uppercase tracking-wide">
              Précisez votre métier
            </Label>
            <Input
              id="custom_profession"
              name="custom_profession"
              value={formData.custom_profession || ''}
              onChange={(e) => setFormData({ ...formData, custom_profession: e.target.value })}
              className="h-12"
              placeholder="Ex: Coiffeur, Photographe, Peintre..."
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="about_me" className="font-heading text-xs uppercase tracking-wide">
            À Propos de Moi
          </Label>
          <Textarea
            id="about_me"
            name="about_me"
            data-testid="profile-about-textarea"
            value={formData.about_me}
            onChange={handleChange}
            rows={6}
            placeholder="Parlez aux clients de votre expérience et compétences..."
            className="resize-none"
          />
        </div>

        <Button 
          type="submit" 
          data-testid="save-profile-button"
          className="w-full h-12 font-heading font-bold text-base"
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}
        </Button>
      </form>
    </Card>
  );
};

export default ProfileForm;
