import { useState, useEffect } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import InvestigationFeePopup from '@/components/InvestigationFeePopup';
import { CreditCard } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceRequestForm = ({ providerId, providerName, provider, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
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
    // Pre-fill with customer data if logged in
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      const customerData = JSON.parse(storedCustomer);
      setCustomer(customerData);
      setFormData(prev => ({
        ...prev,
        client_name: `${customerData.first_name} ${customerData.last_name}`,
        phone_number: customerData.phone_number
      }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Check if provider requires payment
  const requiresPayment = provider?.investigation_fee && provider.investigation_fee > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If payment is required and not completed, show payment popup
    if (requiresPayment && !paymentCompleted) {
      setShowPaymentPopup(true);
      return;
    }

    // Submit the service request
    await submitServiceRequest();
  };

  const submitServiceRequest = async () => {
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

      await axios.post(`${API}/jobs`, payload);
      
      toast.success('Demande de service envoyée avec succès !');
      setFormData({
        client_name: '',
        phone_number: '',
        service_type: '',
        description: '',
        location: '',
        preferred_date: '',
        preferred_time: ''
      });
      setPaymentCompleted(false);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de l\'envoi de la demande'));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentCompleted(true);
    setShowPaymentPopup(false);
    toast.success('Paiement effectué ! Envoi de votre demande...');
    // Automatically submit the request after payment
    submitServiceRequest();
  };

  return (
    <div>
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Demander un Service de {providerName}
      </h3>
      <p className="text-muted-foreground mb-6">
        Remplissez le formulaire ci-dessous pour envoyer une demande de service
      </p>

      {/* Investigation Fee Notice */}
      {requiresPayment && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Tarif d'Investigation Requis</p>
              <p className="text-sm text-amber-700">
                Ce prestataire demande un tarif d'investigation de{' '}
                <span className="font-bold">{Number(provider.investigation_fee).toLocaleString('fr-FR')} GNF</span>{' '}
                avant de traiter votre demande.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="client_name" className="font-heading text-xs uppercase tracking-wide">
              Votre Nom *
            </Label>
            <Input
              id="client_name"
              name="client_name"
              data-testid="request-client-name-input"
              value={formData.client_name}
              onChange={handleChange}
              required
              className="h-12"
              placeholder="Mamadou Diallo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number" className="font-heading text-xs uppercase tracking-wide">
              Numéro de Téléphone *
            </Label>
            <Input
              id="phone_number"
              name="phone_number"
              data-testid="request-phone-input"
              value={formData.phone_number}
              onChange={handleChange}
              required
              className="h-12 font-mono"
              placeholder="+224 620 00 00 00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service_type" className="font-heading text-xs uppercase tracking-wide">
            Type de Service *
          </Label>
          <Input
            id="service_type"
            name="service_type"
            data-testid="request-service-type-input"
            value={formData.service_type}
            onChange={handleChange}
            required
            className="h-12"
            placeholder="ex: Réparation électrique, Vidange voiture, Réparation tuyau"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="font-heading text-xs uppercase tracking-wide">
            Description du Travail *
          </Label>
          <Textarea
            id="description"
            name="description"
            data-testid="request-description-textarea"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            className="resize-none"
            placeholder="Décrivez en détail le service dont vous avez besoin..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="font-heading text-xs uppercase tracking-wide">
            Localisation *
          </Label>
          <Input
            id="location"
            name="location"
            data-testid="request-location-input"
            value={formData.location}
            onChange={handleChange}
            required
            className="h-12"
            placeholder="Commune de Matam, Conakry"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="preferred_date" className="font-heading text-xs uppercase tracking-wide">
              Date Préférée
            </Label>
            <Input
              id="preferred_date"
              name="preferred_date"
              type="date"
              data-testid="request-date-input"
              value={formData.preferred_date}
              onChange={handleChange}
              className="h-12"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred_time" className="font-heading text-xs uppercase tracking-wide">
              Heure Préférée
            </Label>
            <Input
              id="preferred_time"
              name="preferred_time"
              type="time"
              data-testid="request-time-input"
              value={formData.preferred_time}
              onChange={handleChange}
              className="h-12"
            />
          </div>
        </div>

        <Button
          type="submit"
          data-testid="submit-request-button"
          className="w-full h-12 font-heading font-bold text-base"
          disabled={loading}
        >
          {loading ? 'Envoi en cours...' : (
            requiresPayment && !paymentCompleted 
              ? `Payer ${Number(provider.investigation_fee).toLocaleString('fr-FR')} GNF et Envoyer`
              : 'Envoyer la Demande'
          )}
        </Button>
      </form>

      {/* Payment Popup */}
      <InvestigationFeePopup
        isOpen={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
        provider={provider}
        onPaymentSuccess={handlePaymentSuccess}
        customerName={formData.client_name}
        customerPhone={formData.phone_number}
      />
    </div>
  );
};

export default ServiceRequestForm;