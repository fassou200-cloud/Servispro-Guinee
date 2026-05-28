import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Loader2, Send } from 'lucide-react';
import { getErrorMessage, markPhoneVerifiedInSession } from '@/utils/helpers';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CODE_LENGTH = 6;

/**
 * Inline phone verification box. Hosts inside any modal/form.
 * Props:
 *  - phone: string (the number to verify)
 *  - onVerified(): callback when user has entered correct OTP
 *  - autoSend: bool (default true) — send code automatically on mount
 */
export default function PhoneVerifyBox({ phone, onVerified, autoSend = true }) {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const sentOnce = useRef(false);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async () => {
    if (!phone) return;
    setSending(true);
    try {
      await axios.post(`${API}/otp/send`, { phone_number: phone });
      setResendIn(45);
      toast.success('Code envoyé par SMS');
    } catch (e) {
      toast.error(getErrorMessage(e, "Échec de l'envoi du code"));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (phone && autoSend && !sentOnce.current) {
      sentOnce.current = true;
      sendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const verifyCode = async () => {
    if (code.length !== CODE_LENGTH) return;
    setVerifying(true);
    try {
      await axios.post(`${API}/otp/verify`, { phone_number: phone, code });
      markPhoneVerifiedInSession(phone);
      toast.success('Numéro vérifié !');
      onVerified?.();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Code invalide'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-3" data-testid="phone-verify-box">
      <div className="flex items-start gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <div className="text-sm text-slate-700">
          <p className="font-medium">Vérifiez votre numéro</p>
          <p className="text-xs text-slate-500">
            Un code à 6 chiffres a été envoyé au <span className="font-semibold">+{(phone || '').replace(/\D/g, '')}</span>
          </p>
        </div>
      </div>
      <Input
        data-testid="phone-verify-code-input"
        type="text"
        inputMode="numeric"
        maxLength={CODE_LENGTH}
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        className="text-center text-lg tracking-[0.4em] font-mono"
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          data-testid="phone-verify-submit-btn"
          type="button"
          onClick={verifyCode}
          disabled={verifying || code.length !== CODE_LENGTH}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Vérifier'}
        </Button>
        <Button
          data-testid="phone-verify-resend-btn"
          type="button"
          variant="outline"
          onClick={sendCode}
          disabled={sending || resendIn > 0}
          className="px-3"
          title="Renvoyer le code"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : resendIn > 0 ? (
            <span className="text-xs">{resendIn}s</span>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
