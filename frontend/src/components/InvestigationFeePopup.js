import { useState, useEffect } from 'react';
import { getErrorMessage } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { 
  X, Shield, AlertTriangle, CheckCircle, Phone, 
  CreditCard, Loader2, Info, MessageSquare, Copy,
  Download, Receipt, Clock, ArrowRight
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Banner image URL
const BANNER_URL = "https://static.prod-images.emergentagent.com/jobs/82801e0e-abef-4382-a14d-a50c3f3c5f88/images/9f30fae18e163c5a749a317ae068e33529aa05e2b379a3896365bb75dcfbb596.png";

// Generate random OTP code
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate transaction reference
const generateTransactionRef = (method) => {
  const prefix = method === 'orange_money' ? 'OM' : 'MTN';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
};

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
  
  // Multi-step flow
  const [step, setStep] = useState(1); // 1: Info, 2: OTP Sent, 3: Enter OTP, 4: Processing, 5: Success
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [otpError, setOtpError] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [paymentId, setPaymentId] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Reset state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEnteredOTP('');
      setOtpError('');
      setGeneratedOTP('');
      setTransactionRef('');
      setPhoneNumber(customerPhone || '');
    }
  }, [isOpen, customerPhone]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const investigationFee = provider?.investigation_fee || 0;

  // Step 1: Initiate payment and send OTP
  const handleInitiatePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setLoading(true);

    try {
      // Initiate payment in backend
      const response = await axios.post(`${API}/payments/initiate`, {
        job_id: `job_${Date.now()}`,
        provider_id: provider.id,
        customer_phone: phoneNumber,
        customer_name: customerName || 'Client',
        amount: investigationFee,
        payment_method: paymentMethod
      });

      setPaymentId(response.data.payment_id);
      
      // Generate OTP for simulation
      const otp = generateOTP();
      setGeneratedOTP(otp);
      
      // Move to OTP sent step
      setStep(2);
      setCountdown(60); // 60 seconds countdown
      
      // Simulate SMS delay then show OTP entry
      setTimeout(() => {
        setStep(3);
        // Show the OTP in a toast for demo purposes
        toast.info(`📱 Code OTP (simulation): ${otp}`, {
          duration: 10000,
          description: 'En production, ce code serait envoyé par SMS'
        });
      }, 2000);

    } catch (error) {
      toast.error(getErrorMessage(error, 'Erreur lors de l\'initiation du paiement'));
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP
  const handleVerifyOTP = async () => {
    setOtpError('');
    
    if (enteredOTP.length !== 6) {
      setOtpError('Le code doit contenir 6 chiffres');
      return;
    }

    // In simulation, accept the generated OTP or "123456" for testing
    if (enteredOTP !== generatedOTP && enteredOTP !== '123456') {
      setOtpError('Code incorrect. Veuillez réessayer.');
      return;
    }

    // Move to processing step
    setStep(4);
    setLoading(true);

    // Generate transaction details
    const txRef = generateTransactionRef(paymentMethod);
    setTransactionRef(txRef);
    setTransactionDate(new Date().toLocaleString('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short'
    }));

    // Simulate payment processing (2-4 seconds)
    const processingTime = 2000 + Math.random() * 2000;
    
    setTimeout(async () => {
      try {
        // Confirm payment in backend
        if (paymentId) {
          await axios.post(`${API}/payments/${paymentId}/confirm`);
        }
        
        setStep(5);
        toast.success('Paiement confirmé avec succès!');
      } catch (error) {
        toast.error('Erreur lors de la confirmation');
        setStep(1);
      } finally {
        setLoading(false);
      }
    }, processingTime);
  };

  // Resend OTP
  const handleResendOTP = () => {
    if (countdown > 0) return;
    
    const newOTP = generateOTP();
    setGeneratedOTP(newOTP);
    setCountdown(60);
    setEnteredOTP('');
    setOtpError('');
    
    toast.info(`📱 Nouveau code OTP (simulation): ${newOTP}`, {
      duration: 10000
    });
  };

  // Complete and close
  const handleComplete = () => {
    onPaymentSuccess && onPaymentSuccess();
    onClose();
  };

  // Copy transaction reference
  const copyTransactionRef = () => {
    navigator.clipboard.writeText(transactionRef);
    toast.success('Référence copiée!');
  };

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      // Step 1: Initial form
      case 1:
        return (
          <>
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
                    <p className="text-xs text-gray-500">Guinée</p>
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
                    <p className="text-xs text-gray-500">Mobile Money</p>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Phone Number Input */}
            <div className="mb-6">
              <Label htmlFor="payment_phone" className="font-heading text-xs uppercase tracking-wide">
                Numéro {paymentMethod === 'orange_money' ? 'Orange' : 'MTN'}
              </Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="payment_phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="620 00 00 00"
                  className="h-14 pl-10 text-lg font-mono"
                  maxLength={10}
                  data-testid="payment-phone-input"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Un code de confirmation sera envoyé à ce numéro
              </p>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handleInitiatePayment}
              disabled={loading || !phoneNumber || phoneNumber.length < 9}
              className={`w-full h-14 text-lg font-bold rounded-2xl gap-2 ${
                paymentMethod === 'orange_money'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-black'
              }`}
              data-testid="initiate-payment-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <ArrowRight className="h-5 w-5" />
                  Continuer
                </>
              )}
            </Button>
          </>
        );

      // Step 2: OTP Sending animation
      case 2:
        return (
          <div className="text-center py-8">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
              paymentMethod === 'orange_money' ? 'bg-orange-100' : 'bg-yellow-100'
            }`}>
              <MessageSquare className={`h-12 w-12 ${
                paymentMethod === 'orange_money' ? 'text-orange-500' : 'text-yellow-600'
              } animate-pulse`} />
            </div>
            <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
              Envoi du code de confirmation...
            </h3>
            <p className="text-gray-600 mb-4">
              Un SMS est en cours d'envoi au <strong>{phoneNumber}</strong>
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </div>
        );

      // Step 3: Enter OTP
      case 3:
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                paymentMethod === 'orange_money' ? 'bg-orange-100' : 'bg-yellow-100'
              }`}>
                <MessageSquare className={`h-10 w-10 ${
                  paymentMethod === 'orange_money' ? 'text-orange-500' : 'text-yellow-600'
                }`} />
              </div>
              <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
                Entrez le code de confirmation
              </h3>
              <p className="text-gray-600 text-sm">
                Un code à 6 chiffres a été envoyé au <strong>{phoneNumber}</strong>
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <Input
                type="text"
                value={enteredOTP}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setEnteredOTP(value);
                  setOtpError('');
                }}
                placeholder="• • • • • •"
                className="h-16 text-center text-3xl font-mono tracking-[0.5em] font-bold"
                maxLength={6}
                autoFocus
                data-testid="otp-input"
              />
              {otpError && (
                <p className="text-red-500 text-sm mt-2 text-center">{otpError}</p>
              )}
            </div>

            {/* Resend OTP */}
            <div className="text-center mb-6">
              {countdown > 0 ? (
                <p className="text-gray-500 text-sm">
                  Renvoyer le code dans <span className="font-bold">{countdown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResendOTP}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Renvoyer le code
                </button>
              )}
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerifyOTP}
              disabled={enteredOTP.length !== 6}
              className={`w-full h-14 text-lg font-bold rounded-2xl gap-2 ${
                paymentMethod === 'orange_money'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-black'
              }`}
              data-testid="verify-otp-btn"
            >
              Confirmer le paiement
            </Button>

            {/* Demo hint */}
            <p className="text-xs text-center text-gray-400 mt-4">
              💡 Mode démo : utilisez le code affiché ou "123456"
            </p>
          </div>
        );

      // Step 4: Processing
      case 4:
        return (
          <div className="text-center py-8">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
              paymentMethod === 'orange_money' ? 'bg-orange-100' : 'bg-yellow-100'
            }`}>
              <Loader2 className={`h-12 w-12 animate-spin ${
                paymentMethod === 'orange_money' ? 'text-orange-500' : 'text-yellow-600'
              }`} />
            </div>
            <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
              Traitement du paiement...
            </h3>
            <p className="text-gray-600 mb-2">
              Veuillez patienter pendant que nous traitons votre paiement.
            </p>
            <p className="text-sm text-gray-500">
              {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN Mobile Money'}
            </p>
            
            <div className="mt-6 flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        );

      // Step 5: Success with Receipt
      case 5:
        return (
          <div className="py-4">
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-heading font-bold text-green-700 mb-1">
                Paiement Réussi!
              </h3>
              <p className="text-gray-600 text-sm">
                Votre transaction a été effectuée avec succès
              </p>
            </div>

            {/* Receipt Card */}
            <div className="bg-gray-50 rounded-2xl p-5 mb-6 border-2 border-dashed border-gray-200">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <Receipt className="h-5 w-5 text-gray-500" />
                <span className="font-heading font-bold text-gray-700">Reçu de Transaction</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Référence</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">{transactionRef}</span>
                    <button onClick={copyTransactionRef} className="text-gray-400 hover:text-gray-600">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-900">{transactionDate}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Méthode</span>
                  <span className={`font-bold ${
                    paymentMethod === 'orange_money' ? 'text-orange-600' : 'text-yellow-600'
                  }`}>
                    {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Numéro</span>
                  <span className="font-mono text-gray-900">{phoneNumber}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Bénéficiaire</span>
                  <span className="text-gray-900">{provider?.first_name} {provider?.last_name}</span>
                </div>
                
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-700">Montant payé</span>
                  <span className="text-xl font-bold text-green-600">
                    {investigationFee.toLocaleString('fr-FR')} GNF
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleComplete}
                className="w-full h-14 text-lg font-bold rounded-2xl bg-green-600 hover:bg-green-700"
                data-testid="complete-payment-btn"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Continuer la demande
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                Un reçu a été envoyé par SMS au {phoneNumber}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header with Banner - Only show on step 1 */}
        {step === 1 && (
          <div className="relative">
            <img 
              src={BANNER_URL} 
              alt="Tarif d'investigation" 
              className="w-full h-40 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-400" />
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
        )}

        {/* Header for other steps */}
        {step > 1 && step < 5 && (
          <div className={`p-4 ${
            paymentMethod === 'orange_money' ? 'bg-orange-500' : 'bg-yellow-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className={`font-bold ${paymentMethod === 'mtn_momo' ? 'text-black' : 'text-white'}`}>
                    {paymentMethod === 'orange_money' ? 'OM' : 'MTN'}
                  </span>
                </div>
                <div className={paymentMethod === 'mtn_momo' ? 'text-black' : 'text-white'}>
                  <p className="font-bold">
                    {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN Mobile Money'}
                  </p>
                  <p className="text-sm opacity-80">
                    {investigationFee.toLocaleString('fr-FR')} GNF
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className={`h-5 w-5 ${paymentMethod === 'mtn_momo' ? 'text-black' : 'text-white'}`} />
              </button>
            </div>
          </div>
        )}

        {/* Success Header */}
        {step === 5 && (
          <div className="p-4 bg-green-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="text-white">
                  <p className="font-bold">Transaction Réussie</p>
                  <p className="text-sm opacity-80">{transactionRef}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {renderStep()}
        </div>

        {/* Progress indicator */}
        {step > 1 && step < 5 && (
          <div className="px-6 pb-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? (paymentMethod === 'orange_money' ? 'bg-orange-500' : 'bg-yellow-500') : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InvestigationFeePopup;
