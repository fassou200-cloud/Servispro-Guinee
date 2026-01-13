import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { 
  X, Shield, AlertTriangle, CheckCircle, Phone, 
  CreditCard, Loader2, Info
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Banner image URL
const BANNER_URL = "https://static.prod-images.emergentagent.com/jobs/82801e0e-abef-4382-a14d-a50c3f3c5f88/images/9f30fae18e163c5a749a317ae068e33529aa05e2b379a3896365bb75dcfbb596.png";

const InvestigationFeePopup = ({ 
  isOpen, 
  onClose, 
  provider, 
  onPaymentSuccess,
  customerName,
  customerPhone 
}) => {
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [phoneNumber, setPhoneNumber] = useState(customerPhone || '');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null, 'pending', 'success', 'error'
  const [paymentId, setPaymentId] = useState(null);

  if (!isOpen) return null;

  const investigationFee = provider?.investigation_fee || 0;

  const handlePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setLoading(true);
    setPaymentStatus('pending');

    try {
      // Step 1: Initiate payment
      const response = await axios.post(`${API}/payments/initiate`, {
        job_id: `job_${Date.now()}`, // Temporary job ID
        provider_id: provider.id,
        customer_phone: phoneNumber,
        customer_name: customerName || 'Client',
        amount: investigationFee,
        payment_method: paymentMethod
      });

      setPaymentId(response.data.payment_id);

      // Step 2: Simulate payment confirmation (MOCK)
      // In production, this would be handled by a webhook from the payment provider
      setTimeout(async () => {
        try {
          await axios.post(`${API}/payments/${response.data.payment_id}/confirm`);
          setPaymentStatus('success');
          toast.success('Paiement confirmé avec succès!');
          
          // Call success callback after a short delay
          setTimeout(() => {
            onPaymentSuccess && onPaymentSuccess();
          }, 2000);
        } catch (error) {
          setPaymentStatus('error');
          toast.error('Erreur lors de la confirmation du paiement');
        }
      }, 3000); // Simulate 3 second payment processing

    } catch (error) {
      setPaymentStatus('error');
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const resetPayment = () => {
    setPaymentStatus(null);
    setPaymentId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header with Banner */}
        <div className="relative">
          <img 
            src={BANNER_URL} 
            alt="Tarif d'investigation" 
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
              <Shield className="h-6 w-6 text-amber-400" />
              Tarif d'Investigation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            data-testid="close-popup-btn"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Terms Card */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-bold mb-2">Conditions du Tarif d'Investigation :</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span><strong>Non remboursable</strong> si le prestataire se présente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span><strong>Remboursé à 100%</strong> si le prestataire ne se présente pas</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {paymentStatus === 'success' ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-heading font-bold text-green-700 mb-2">
                Paiement Réussi!
              </h3>
              <p className="text-gray-600 mb-4">
                Votre paiement de {investigationFee.toLocaleString('fr-FR')} GNF a été confirmé.
              </p>
              <p className="text-sm text-gray-500">
                Vous pouvez maintenant envoyer votre demande de service.
              </p>
            </div>
          ) : paymentStatus === 'pending' ? (
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 mx-auto mb-4 text-amber-500 animate-spin" />
              <h3 className="text-xl font-heading font-bold text-gray-700 mb-2">
                Traitement du Paiement...
              </h3>
              <p className="text-gray-600">
                Veuillez confirmer le paiement sur votre téléphone.
              </p>
              <p className="text-sm text-amber-600 mt-4">
                {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN Mobile Money'}
              </p>
            </div>
          ) : paymentStatus === 'error' ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-xl font-heading font-bold text-red-700 mb-2">
                Échec du Paiement
              </h3>
              <p className="text-gray-600 mb-4">
                Une erreur s'est produite lors du paiement.
              </p>
              <Button onClick={resetPayment} variant="outline" className="gap-2">
                Réessayer
              </Button>
            </div>
          ) : (
            <>
              {/* Provider Info & Amount */}
              <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Prestataire</p>
                    <p className="font-bold text-gray-900">
                      {provider?.first_name} {provider?.last_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Montant à payer</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {investigationFee.toLocaleString('fr-FR')} GNF
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <Label className="font-heading text-xs uppercase tracking-wide mb-3 block">
                  Méthode de Paiement
                </Label>
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    paymentMethod === 'orange_money' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-orange-300'
                  }`}>
                    <RadioGroupItem 
                      value="orange_money" 
                      id="orange_money"
                      className="absolute top-3 right-3"
                    />
                    <label htmlFor="orange_money" className="cursor-pointer">
                      <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-2">
                        <span className="text-white font-bold text-lg">OM</span>
                      </div>
                      <p className="font-bold text-gray-900">Orange Money</p>
                    </label>
                  </div>

                  <div className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    paymentMethod === 'mtn_momo' 
                      ? 'border-yellow-500 bg-yellow-50' 
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}>
                    <RadioGroupItem 
                      value="mtn_momo" 
                      id="mtn_momo"
                      className="absolute top-3 right-3"
                    />
                    <label htmlFor="mtn_momo" className="cursor-pointer">
                      <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-2">
                        <span className="text-black font-bold text-lg">MTN</span>
                      </div>
                      <p className="font-bold text-gray-900">MTN MoMo</p>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Phone Number Input */}
              <div className="mb-6">
                <Label htmlFor="payment_phone" className="font-heading text-xs uppercase tracking-wide">
                  Numéro de Téléphone {paymentMethod === 'orange_money' ? 'Orange' : 'MTN'}
                </Label>
                <div className="relative mt-2">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="payment_phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="620 00 00 00"
                    className="h-14 pl-10 text-lg font-mono"
                    data-testid="payment-phone-input"
                  />
                </div>
              </div>

              {/* Pay Button */}
              <Button
                onClick={handlePayment}
                disabled={loading || !phoneNumber}
                className={`w-full h-14 text-lg font-bold rounded-2xl gap-2 ${
                  paymentMethod === 'orange_money'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                }`}
                data-testid="pay-investigation-fee-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Payer {investigationFee.toLocaleString('fr-FR')} GNF
                  </>
                )}
              </Button>

              {/* Mock Notice */}
              <p className="text-xs text-center text-gray-400 mt-4">
                Mode démo - Paiement simulé pour test
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default InvestigationFeePopup;
