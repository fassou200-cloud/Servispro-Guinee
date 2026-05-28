import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ShieldCheck, MessageSquare, Loader2, ArrowLeft } from 'lucide-react';
import { getErrorMessage } from '@/utils/helpers';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CODE_LENGTH = 6;

/**
 * Phone OTP verification page. Expects location.state with:
 *  - phone_number: string (E.164 or normalized)
 *  - redirectTo:   optional path to navigate to after successful verification
 *  - user_type:    'provider' | 'customer' | 'company' (for messaging)
 *  - autoSend:     bool (default true)
 */
export default function VerifyPhonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone_number, redirectTo = '/', user_type = 'provider', autoSend = true } =
    location.state || {};

  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const sentOnce = useRef(false);

  // Redirect away if we don't have a phone number
  useEffect(() => {
    if (!phone_number) {
      toast.error('Numéro de téléphone manquant.');
      navigate('/auth');
    }
  }, [phone_number, navigate]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async () => {
    if (!phone_number) return;
    setSending(true);
    try {
      await axios.post(`${API}/otp/send`, { phone_number });
      setSent(true);
      setResendIn(45);
      toast.success(`Code envoyé au ${phone_number}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Échec de l'envoi du code"));
    } finally {
      setSending(false);
    }
  };

  // Auto-send the first code on page load
  useEffect(() => {
    if (phone_number && autoSend && !sentOnce.current) {
      sentOnce.current = true;
      sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone_number]);

  const verifyCode = async () => {
    if (code.length !== CODE_LENGTH) {
      toast.error(`Le code doit contenir ${CODE_LENGTH} chiffres`);
      return;
    }
    setVerifying(true);
    try {
      await axios.post(`${API}/otp/verify`, { phone_number, code });
      toast.success('Numéro vérifié avec succès !');
      navigate(redirectTo, { replace: true });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Code invalide'));
    } finally {
      setVerifying(false);
    }
  };

  const openWhatsApp = () => {
    // Phase 1: WhatsApp opens click-to-chat with support. Real auto-send via Twilio in Phase 2.
    const supportPhone = '224620000000';
    const msg = encodeURIComponent(
      `Bonjour, je souhaite vérifier mon numéro ServisPro (${phone_number}). Veuillez m'envoyer le code de vérification.`
    );
    window.open(`https://wa.me/${supportPhone}?text=${msg}`, '_blank');
  };

  if (!phone_number) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-8" data-testid="verify-phone-card">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-6"
          data-testid="verify-phone-back"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Vérifiez votre numéro</h1>
          <p className="text-sm text-slate-500 mt-2">
            Nous avons envoyé un code à 6 chiffres au
            <br />
            <span className="font-semibold text-slate-700">+{phone_number}</span>
          </p>
        </div>

        <div className="space-y-4">
          <Input
            data-testid="verify-phone-code-input"
            type="text"
            inputMode="numeric"
            maxLength={CODE_LENGTH}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
            autoFocus
          />

          <Button
            data-testid="verify-phone-submit-btn"
            onClick={verifyCode}
            disabled={verifying || code.length !== CODE_LENGTH}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Vérifier le code'}
          </Button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex-1 h-px bg-slate-200" />
            ou
            <span className="flex-1 h-px bg-slate-200" />
          </div>

          <Button
            data-testid="verify-phone-resend-sms-btn"
            variant="outline"
            onClick={sendCode}
            disabled={sending || resendIn > 0}
            className="w-full h-11"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : resendIn > 0 ? (
              `Renvoyer par SMS dans ${resendIn}s`
            ) : (
              'Renvoyer le code par SMS'
            )}
          </Button>

          <Button
            data-testid="verify-phone-whatsapp-btn"
            variant="outline"
            onClick={openWhatsApp}
            className="w-full h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <MessageSquare className="h-4 w-4 mr-2" /> Recevoir via WhatsApp (support)
          </Button>
          <p className="text-[11px] text-slate-400 text-center">
            WhatsApp ouvre une discussion avec le support — un agent vous enverra le code manuellement.
          </p>
        </div>
      </Card>
    </div>
  );
}
