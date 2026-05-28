import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, getCurrentUserContact } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Send, Loader2, CheckCircle, MapPin, Phone, User, FileText, Calendar, Clock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceRequestForm = ({ providerId, providerName, provider, onSuccess }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [phoneLocked, setPhoneLocked] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: '',
    phone_number: '',
    service_type: '',
    description: '',
    location: '',
    preferred_date: '',
    preferred_time: ''
  });

  useEffect(() => {
    // Pre-fill with logged-in user data (customer/provider/company)
    const me = getCurrentUserContact();
    if (me?.phone) {
      setFormData(prev => ({
        ...prev,
        client_name: me.name || '',
        phone_number: me.phone,
      }));
      setPhoneLocked(true);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.client_name.trim()) {
      toast.error('Veuillez entrer votre nom');
      return false;
    }
    if (!formData.phone_number.trim()) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return false;
    }
    if (!formData.service_type.trim()) {
      toast.error('Veuillez entrer le type de service');
      return false;
    }
    if (!formData.description.trim()) {
      toast.error('Veuillez décrire le travail demandé');
      return false;
    }
    if (!formData.location.trim()) {
      toast.error('Veuillez entrer votre localisation');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const scheduledDateTime = formData.preferred_date && formData.preferred_time
        ? `${formData.preferred_date}T${formData.preferred_time}`
        : null;

      const payload = {
        service_provider_id: providerId,
        client_name: formData.client_name,
        service_type: formData.service_type,
        description: `${formData.description}\n\nContact: ${formData.phone_number}`,
        location: formData.location,
        scheduled_date: scheduledDateTime
      };

      const customerToken = localStorage.getItem('customerToken');
      if (!customerToken) {
        toast.error("Veuillez vous connecter en tant que client pour envoyer une demande");
        navigate('/customer/auth');
        return;
      }

      await axios.post(`${API}/jobs`, payload, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      
      setSubmitted(true);
      toast.success('Demande envoyée avec succès !');
      
      // Reset form after delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 3000);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de l\'envoi de la demande'));
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (submitted) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">
          Demande Envoyée !
        </h2>
        <p className="text-green-700 mb-4">
          Votre demande a été envoyée à <strong>{providerName}</strong>
        </p>
        <p className="text-sm text-green-600">
          Le prestataire vous contactera bientôt pour confirmer les détails.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white border-gray-200 shadow-lg">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Send className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Demander un Service
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Envoyez votre demande à <strong className="text-green-600">{providerName}</strong>
        </p>
      </div>

      {/* Service gratuit badge */}
      <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-700 font-medium">
          Service Gratuit - Aucun frais ne sera facturé
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="client_name" className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4 text-gray-400" />
            Votre Nom *
          </Label>
          <Input
            id="client_name"
            name="client_name"
            data-testid="request-client-name-input"
            value={formData.client_name}
            onChange={handleChange}
            required
            className="h-11"
            placeholder="Mamadou Diallo"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone_number" className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-gray-400" />
            Numéro de Téléphone *
          </Label>
          <Input
            id="phone_number"
            name="phone_number"
            data-testid="request-phone-input"
            value={formData.phone_number}
            onChange={handleChange}
            required
            disabled={phoneLocked}
            className={`h-11 ${phoneLocked ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : ''}`}
            placeholder="+224 6XX XXX XXX"
          />
          {phoneLocked && (
            <p className="text-xs text-emerald-600">✓ Numéro vérifié de votre compte</p>
          )}
        </div>

        {/* Service Type */}
        <div className="space-y-2">
          <Label htmlFor="service_type" className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-gray-400" />
            Type de Service *
          </Label>
          <Input
            id="service_type"
            name="service_type"
            data-testid="request-service-type-input"
            value={formData.service_type}
            onChange={handleChange}
            required
            className="h-11"
            placeholder="Ex: Réparation électrique, Installation..."
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-gray-400" />
            Description du Travail *
          </Label>
          <Textarea
            id="description"
            name="description"
            data-testid="request-description-input"
            value={formData.description}
            onChange={handleChange}
            required
            className="min-h-[100px] resize-none"
            placeholder="Décrivez en détail le travail que vous souhaitez..."
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-gray-400" />
            Localisation *
          </Label>
          <Input
            id="location"
            name="location"
            data-testid="request-location-input"
            value={formData.location}
            onChange={handleChange}
            required
            className="h-11"
            placeholder="Ex: Kaloum, Conakry"
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="preferred_date" className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-gray-400" />
              Date Souhaitée
            </Label>
            <Input
              id="preferred_date"
              name="preferred_date"
              type="date"
              value={formData.preferred_date}
              onChange={handleChange}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_time" className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-gray-400" />
              Heure Souhaitée
            </Label>
            <Input
              id="preferred_time"
              name="preferred_time"
              type="time"
              value={formData.preferred_time}
              onChange={handleChange}
              className="h-11"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold gap-2"
          data-testid="submit-service-request-btn"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Envoyer la Demande
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};

export default ServiceRequestForm;
