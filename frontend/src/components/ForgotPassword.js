import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Phone, KeyRound, Send, Loader2, CheckCircle, Lock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForgotPassword = ({ userType = 'provider', onBack, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Enter OTP, 3: New password, 4: Success
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testOtp, setTestOtp] = useState(''); // For development

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, {
        phone_number: phoneNumber,
        user_type: userType
      });
      
      // In development, show the OTP
      if (response.data.otp_for_testing) {
        setTestOtp(response.data.otp_for_testing);
        toast.info(`Code de test: ${response.data.otp_for_testing}`, { duration: 15000 });
      }
      
      toast.success('Code OTP envoyé !');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    
    if (!otp) {
      toast.error('Veuillez entrer le code OTP');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        phone_number: phoneNumber,
        user_type: userType,
        otp: otp,
        new_password: newPassword
      });
      
      toast.success('Mot de passe réinitialisé avec succès !');
      setStep(4);
      
      // Auto redirect after 2 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeLabel = () => {
    switch (userType) {
      case 'provider': return 'Prestataire';
      case 'customer': return 'Client';
      case 'company': return 'Entreprise';
      default: return 'Utilisateur';
    }
  };

  return (
    <Card className="p-8 rounded-3xl shadow-xl border-0 bg-white max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
          <KeyRound className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">
          Mot de passe oublié
        </h2>
        <p className="text-slate-500 text-sm">
          {step === 1 && `Entrez votre numéro de téléphone (${getUserTypeLabel()})`}
          {step === 2 && 'Entrez le code OTP et votre nouveau mot de passe'}
          {step === 4 && 'Votre mot de passe a été réinitialisé'}
        </p>
      </div>

      {/* Step 1: Enter phone number */}
      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Numéro de téléphone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="6XX XX XX XX"
                className="pl-10 h-12 rounded-xl"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Envoyer le code OTP
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la connexion
          </Button>
        </form>
      )}

      {/* Step 2: Enter OTP and new password */}
      {step === 2 && (
        <form onSubmit={handleVerifyAndReset} className="space-y-6">
          {/* Show test OTP in development */}
          {testOtp && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-xs text-amber-600 mb-1">Code de test (dev)</p>
              <p className="text-2xl font-mono font-bold text-amber-700">{testOtp}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Code OTP</Label>
            <Input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Entrez le code à 6 chiffres"
              className="h-12 rounded-xl text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Nouveau mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="pl-10 h-12 rounded-xl"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Confirmer le mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                className="pl-10 h-12 rounded-xl"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Réinitialiser le mot de passe
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep(1)}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Changer de numéro
          </Button>
        </form>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-700 mb-2">Succès !</h3>
            <p className="text-slate-500">
              Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.
            </p>
          </div>
          <Button
            onClick={onBack || onSuccess}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600"
          >
            Retour à la connexion
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ForgotPassword;
