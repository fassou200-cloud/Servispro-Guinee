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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/profile/upload-picture`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUser({ ...user, profile_picture: response.data.profile_picture });
      toast.success('Profile picture uploaded successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleIdVerificationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingId(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/profile/upload-id-verification`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUser({ ...user, id_verification_picture: response.data.id_verification_picture });
      toast.success('ID verification uploaded successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to upload ID verification');
    } finally {
      setUploadingId(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/profile/me`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Profile updated successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-8">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
        Edit Profile
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture Upload */}
        <div className="space-y-2">
          <Label htmlFor="profile-picture" className="font-heading text-xs uppercase tracking-wide">
            Profile Picture
          </Label>
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
              {uploading ? 'Uploading...' : 'Upload Picture'}
            </Button>
            {user.profile_picture && (
              <span className="text-sm text-muted-foreground">Current picture uploaded</span>
            )}
          </div>
        </div>

        {/* ID Verification Upload */}
        <div className="space-y-2">
          <Label htmlFor="id-verification" className="font-heading text-xs uppercase tracking-wide">
            ID Verification
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Upload a photo of your government-issued ID for verification
          </p>
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
              {uploadingId ? 'Uploading...' : 'Upload ID'}
            </Button>
            {user.id_verification_picture && (
              <span className="text-sm text-green-600 font-medium">✓ ID Verified</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="font-heading text-xs uppercase tracking-wide">
              First Name
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
              Last Name
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
            onValueChange={(value) => setFormData({ ...formData, profession: value })}
          >
            <SelectTrigger data-testid="profile-profession-select" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Electrician">Electrician</SelectItem>
              <SelectItem value="Mechanic">Mechanic</SelectItem>
              <SelectItem value="Plumber">Plumber</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="about_me" className="font-heading text-xs uppercase tracking-wide">
            About Me
          </Label>
          <Textarea
            id="about_me"
            name="about_me"
            data-testid="profile-about-textarea"
            value={formData.about_me}
            onChange={handleChange}
            rows={6}
            placeholder="Tell clients about your experience and skills..."
            className="resize-none"
          />
        </div>

        <Button 
          type="submit" 
          data-testid="save-profile-button"
          className="w-full h-12 font-heading font-bold text-base"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Card>
  );
};

export default ProfileForm;