import { useState, useEffect } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  CreditCard, Smartphone, ArrowLeft, Loader2, CheckCircle, 
  Shield, Clock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceRequestForm = ({ providerId, providerName, provider, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: OTP, 4: Processing, 5: Success
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [serviceFees, setServiceFees] = useState(null);
  const [settings, setSettings] = useState({ devise: 'GNF' });
  
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
      setPaymentPhone(customerData.phone_number || '');
      setFormData(prev => ({
        ...prev,
        client_name: `${customerData.first_name} ${customerData.last_name}`,
        phone_number: customerData.phone_number
      }));
    }
    
    // Get service fees for this provider's profession
    if (provider?.profession) {
      axios.get(`${API}/service-fees/${provider.profession}`)
        .then(res => setServiceFees(res.data))
        .catch(() => setServiceFees({ frais_visite: 0 }));
    }
    
    // Get settings
    axios.get(`${API}/commission-rates`)
      .then(res => setSettings({ devise: res.data.devise || 'GNF' }))
      .catch(() => {});
  }, [provider?.profession]);

  const fraisVisite = serviceFees?.frais_visite || 0;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
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

  const handleContinueToPayment = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setStep(2);
    }
  };

  const handleSendOtp = () => {
    if (!paymentPhone) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }
    
    // Generate a random OTP for simulation
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setStep(3);
    toast.info(`Code de test : ${newOtp}`, { duration: 10000 });
  };

  const handleVerifyOtp = async () => {
    if (otp !== generatedOtp) {
      toast.error('Code OTP incorrect');
      return;
    }

    setStep(4);

    // Simulate payment processing
    setTimeout(async () => {
      await submitServiceRequest();
    }, 2000);
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
      
      setStep(5);
      toast.success('Paiement effectué et demande envoyée !');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de l\'envoi de la demande'));
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Success
  if (step === 5) {
    return (
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-heading font-bold text-green-800 mb-2">
            Demande Envoyée !
          </h3>
          <p className="text-green-600 mb-4">
            Votre paiement a été effectué et votre demande de service a été envoyée au prestataire.
          </p>
          <div className="p-4 bg-white rounded-xl border border-green-200 mb-4 text-left">
            <p className="text-sm text-slate-600">
              <strong>Prestataire :</strong> {providerName}
            </p>
            <p className="text-sm text-slate-600">
              <strong>Service :</strong> {formData.service_type}
            </p>
            <p className="text-sm text-slate-600">
              <strong>Montant payé :</strong> {formatPrice(fraisVisite)} {settings.devise}
            </p>
          </div>
          <Button onClick={onSuccess} className="bg-green-600 hover:bg-green-700 gap-2">
            <CheckCircle className="h-4 w-4" />
            Fermer
          </Button>
        </div>
      </Card>
    );
  }

  // Step 4: Processing
  if (step === 4) {
    return (
      <Card className="p-6 bg-white border-slate-200">
        <div className="text-center py-12">
          <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-600 animate-spin" />
          <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">
            Traitement en cours...
          </h3>
          <p className="text-slate-500">
            Veuillez patienter pendant que nous traitons votre paiement
          </p>
        </div>
      </Card>
    );
  }

  // Step 3: OTP Verification
  if (step === 3) {
    return (
      <Card className="p-6 bg-white border-slate-200">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setStep(2)}
            className="gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-900">
              Vérification OTP
            </h3>
          </div>
          <p className="text-slate-500">
            Entrez le code reçu par SMS au {paymentPhone}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Code OTP</Label>
            <Input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="h-14 text-center text-2xl font-mono tracking-widest"
            />
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2"
          >
            <CheckCircle className="h-5 w-5" />
            Confirmer le Paiement
          </Button>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Le code expire dans 5 minutes
          </p>
        </div>
      </Card>
    );
  }

  // Step 2: Payment
  if (step === 2) {
    return (
      <Card className="p-6 bg-white border-slate-200">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setStep(1)}
            className="gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-xl">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-900">
              Paiement des Frais de Service
            </h3>
          </div>
        </div>

        {/* Amount */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-green-700 font-medium">Montant à payer</span>
            <span className="text-2xl font-bold text-green-800">
              {formatPrice(fraisVisite)} {settings.devise}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-4">
          <Label>Mode de paiement</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('orange_money')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'orange_money'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-orange-300'
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-500 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <p className="font-medium text-slate-900">Orange Money</p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('mtn_money')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'mtn_money'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-slate-200 hover:border-yellow-300'
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-yellow-500 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <p className="font-medium text-slate-900">MTN Money</p>
            </button>
          </div>

          <div className="space-y-2">
            <Label>Numéro de téléphone</Label>
            <Input
              type="tel"
              value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)}
              placeholder="6XX XX XX XX"
              className="h-12"
            />
          </div>

          <Button
            onClick={handleSendOtp}
            disabled={loading || !paymentPhone}
            className={`w-full h-12 gap-2 ${
              paymentMethod === 'orange_money'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            Payer {formatPrice(fraisVisite)} {settings.devise}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Paiement sécurisé via {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN Money'}
          </p>
        </div>
      </Card>
    );
  }

  // Step 1: Form
  return (
    <div>
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Demander un Service de {providerName}
      </h3>
      <p className="text-muted-foreground mb-4">
        Remplissez le formulaire ci-dessous pour envoyer une demande de service
      </p>

      {/* Service Fee Notice */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Frais de Service à Payer</p>
            <p className="text-sm text-green-700">
              <span className="font-bold text-lg">{formatPrice(fraisVisite)} {settings.devise}</span>
              {' '}- Ce montant sera débité de votre compte Mobile Money après validation
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleContinueToPayment} className="space-y-6">
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
          className="w-full h-12 font-heading font-bold text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2"
          disabled={loading}
        >
          <CreditCard className="h-5 w-5" />
          {loading ? 'Envoi en cours...' : 'Continuer vers le Paiement'}
        </Button>
      </form>
    </div>
  );
};

export default ServiceRequestForm;
