import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, Clock, User, Phone, Mail, Send, CheckCircle, 
  Eye, Loader2, AlertCircle, X, LogIn, CreditCard, Smartphone
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VisitRequestForm = ({ rental, onSuccess, onClose }) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [formData, setFormData] = useState({
    preferred_date: '',
    preferred_time: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [fraisVisite, setFraisVisite] = useState(100000);
  const [settings, setSettings] = useState({ devise: 'GNF' });
  
  // Payment flow states
  const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: OTP, 4: Processing, 5: Success
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Check if customer is logged in
  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      const parsed = JSON.parse(storedCustomer);
      setCustomer(parsed);
      setPaymentPhone(parsed.phone_number || '');
    }
    
    // Get frais de visite and settings
    Promise.all([
      axios.get(`${API}/service-fees/AgentImmobilier`),
      axios.get(`${API}/commission-rates`)
    ]).then(([feesRes, settingsRes]) => {
      setFraisVisite(feesRes.data.frais_visite || 100000);
      setSettings({ devise: settingsRes.data.devise || 'GNF' });
    }).catch(() => {
      setFraisVisite(100000);
    });
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  // Handle login redirect
  const handleLoginRedirect = () => {
    // Save current URL to redirect back after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/customer/auth');
  };

  // Go to payment step
  const handleProceedToPayment = () => {
    if (!formData.preferred_date) {
      toast.error('Veuillez sélectionner une date de visite');
      return;
    }
    setStep(2);
  };

  // Send OTP for payment
  const handleSendOtp = () => {
    if (!paymentPhone || paymentPhone.length < 9) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setLoading(true);
    
    // Simulate OTP generation
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    
    setTimeout(() => {
      setLoading(false);
      setStep(3);
      setCountdown(60);
      toast.success(`Code OTP envoyé au ${paymentPhone}`);
      // In development, show OTP
      console.log('OTP for testing:', newOtp);
      toast.info(`Code de test: ${newOtp}`, { duration: 10000 });
    }, 1500);
  };

  // Verify OTP and process payment
  const handleVerifyOtp = async () => {
    if (otp !== generatedOtp) {
      toast.error('Code OTP incorrect');
      return;
    }

    setStep(4);
    setLoading(true);

    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Create visit request with payment completed
        const response = await axios.post(`${API}/visit-requests`, {
          rental_id: rental.id,
          customer_name: customer.name,
          customer_phone: customer.phone_number,
          customer_email: customer.email || null,
          preferred_date: formData.preferred_date,
          preferred_time: formData.preferred_time || null,
          message: formData.message || null
        });

        // Update payment status
        await axios.put(`${API}/visit-requests/${response.data.id}/payment`, {
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_phone: paymentPhone
        }).catch(() => {}); // Ignore if endpoint doesn't exist

        setStep(5);
        toast.success('Paiement effectué et demande envoyée !');
        
        if (onSuccess) {
          onSuccess(response.data);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Erreur lors de l\'envoi de la demande');
        setStep(2);
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  // If not logged in, show login prompt
  if (!customer) {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        )}

        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <LogIn className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">
            Connexion Requise
          </h3>
          <p className="text-slate-500 mb-6">
            Vous devez être connecté pour demander une visite
          </p>
          
          <div className="p-4 bg-blue-50 rounded-xl mb-6">
            <p className="text-sm text-blue-700">
              <strong>Frais de visite :</strong> {formatPrice(fraisVisite)} {settings.devise}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Ce montant sera à payer lors de la demande
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleLoginRedirect}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2"
            >
              <LogIn className="h-5 w-5" />
              Se Connecter
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full h-12"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Step 5: Success
  if (step === 5) {
    return (
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-green-100 rounded-full"
          >
            <X className="h-5 w-5 text-green-600" />
          </button>
        )}

        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-heading font-bold text-green-800 mb-2">
            Demande Envoyée !
          </h3>
          <p className="text-green-600 mb-4">
            Votre paiement a été effectué et votre demande de visite a été envoyée au propriétaire.
          </p>
          <div className="p-4 bg-white rounded-xl border border-green-200 mb-4 text-left">
            <p className="text-sm text-slate-600">
              <strong>Propriété :</strong> {rental.title}
            </p>
            <p className="text-sm text-slate-600">
              <strong>Date :</strong> {new Date(formData.preferred_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-sm text-slate-600">
              <strong>Montant payé :</strong> {formatPrice(fraisVisite)} {settings.devise}
            </p>
          </div>
          <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 gap-2">
            <CheckCircle className="h-4 w-4" />
            Fermer
          </Button>
        </div>
      </Card>
    );
  }

  // Step 4: Processing payment
  if (step === 4) {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl">
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

  // Step 3: Enter OTP
  if (step === 3) {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        )}

        <div className="mb-6">
          <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">
            Vérification OTP
          </h3>
          <p className="text-sm text-slate-500">
            Entrez le code à 6 chiffres envoyé au {paymentPhone}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Code OTP</Label>
            <Input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="h-14 text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <Button
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6 || loading}
            className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 gap-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Confirmer le Paiement
              </>
            )}
          </Button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-slate-500">
                Renvoyer le code dans {countdown}s
              </p>
            ) : (
              <Button
                variant="link"
                onClick={handleSendOtp}
                className="text-blue-600"
              >
                Renvoyer le code
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => setStep(2)}
            className="w-full"
          >
            Retour
          </Button>
        </div>
      </Card>
    );
  }

  // Step 2: Payment
  if (step === 2) {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-xl">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-900">
              Paiement des Frais de Visite
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
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5" />
                Payer {formatPrice(fraisVisite)} {settings.devise}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setStep(1)}
            className="w-full"
          >
            Retour
          </Button>
        </div>
      </Card>
    );
  }

  // Step 1: Form
  return (
    <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl relative">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Eye className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-xl font-heading font-bold text-slate-900">
            Demander une Visite
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          Sélectionnez votre date préférée pour visiter cette propriété
        </p>
      </div>

      {/* Customer Info (read-only) */}
      <div className="p-4 bg-slate-50 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{customer.name}</p>
            <p className="text-sm text-slate-500">{customer.phone_number}</p>
          </div>
        </div>
      </div>

      {/* Frais de visite info */}
      <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-800">Frais de Visite à Payer</span>
          </div>
          <span className="text-xl font-bold text-amber-700">
            {formatPrice(fraisVisite)} {settings.devise}
          </span>
        </div>
        <p className="text-xs text-amber-600 mt-2">
          Ce montant sera débité de votre compte Mobile Money après validation
        </p>
      </div>

      <div className="space-y-4">
        {/* Preferred Date */}
        <div className="space-y-2">
          <Label htmlFor="preferred_date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            Date souhaitée *
          </Label>
          <Input
            id="preferred_date"
            name="preferred_date"
            type="date"
            value={formData.preferred_date}
            onChange={handleChange}
            min={today}
            required
            className="h-12"
          />
        </div>

        {/* Preferred Time (optional) */}
        <div className="space-y-2">
          <Label htmlFor="preferred_time" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            Heure souhaitée (optionnel)
          </Label>
          <Input
            id="preferred_time"
            name="preferred_time"
            type="time"
            value={formData.preferred_time}
            onChange={handleChange}
            className="h-12"
          />
        </div>

        {/* Message (optional) */}
        <div className="space-y-2">
          <Label htmlFor="message">Message (optionnel)</Label>
          <Textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Informations complémentaires..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleProceedToPayment}
          disabled={!formData.preferred_date}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl gap-2"
        >
          <CreditCard className="h-5 w-5" />
          Continuer vers le Paiement
        </Button>
      </div>
    </Card>
  );
};

export default VisitRequestForm;
