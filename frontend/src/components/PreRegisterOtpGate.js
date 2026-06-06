import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/utils/helpers';

const API = process.env.REACT_APP_BACKEND_URL + '/api';
const CODE_LENGTH = 6;
const RESEND_COOLDOWN_S = 45;

/**
 * Two-step registration gate.
 *
 * Step 1: Call POST /auth/pre-register with the phone (+ user_type).
 *         Backend validates Guinean format + uniqueness + sends OTP.
 * Step 2: User enters the 6-digit OTP. We do NOT verify it here — the
 *         parent's `onVerified(otpCode)` callback runs the actual
 *         /auth/.../register POST with the otp_code field.
 *
 * Props
 *  - phoneNumber : string (+224…)  — full number in E.164
 *  - userType    : 'provider' | 'customer' | 'company'
 *  - onVerified  : (otpCode: string) => Promise<void>
 *  - onCancel    : () => void
 *  - submitting  : boolean  — bound to the parent's "is creating account" state
 *  - submitLabel : optional — defaults to "Créer mon compte"
 */
export default function PreRegisterOtpGate({
  phoneNumber,
  userType,
  onVerified,
  onCancel,
  submitting = false,
  submitLabel = 'Créer mon compte',
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [deliveryError, setDeliveryError] = useState(null);
  const sentOnce = useRef(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Poll delivery status every 4 seconds while waiting for the user to enter the code.
  // Stops on failure or when the code is submitted.
  useEffect(() => {
    if (!sent || deliveryError) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    const checkDelivery = async () => {
      try {
        const { data } = await axios.get(`${API}/otp/delivery-status`, {
          params: { phone_number: phoneNumber },
        });
        if (data.status === 'failed') {
          setDeliveryError(data.message || 'Numéro invalide. Le SMS n\u2019a pas pu être livré.');
        }
      } catch {
        /* ignore polling errors */
      }
    };
    pollRef.current = setInterval(checkDelivery, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sent, deliveryError, phoneNumber]);

  const sendCode = async () => {
    if (!phoneNumber) return;
    setSending(true);
    setDeliveryError(null);
    try {
      await axios.post(`${API}/auth/pre-register`, {
        phone_number: phoneNumber,
        user_type: userType,
      });
      setSent(true);
      setResendIn(RESEND_COOLDOWN_S);
      toast.success(`Code envoyé au ${phoneNumber}`);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Échec de l\u2019envoi du code'));
    } finally {
      setSending(false);
    }
  };

  // Auto-send the code on mount
  useEffect(() => {
    if (phoneNumber && !sentOnce.current) {
      sentOnce.current = true;
      sendCode();
    }
  }, [phoneNumber]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length !== CODE_LENGTH || !/^\d+$/.test(code)) {
      toast.error(`Le code doit contenir ${CODE_LENGTH} chiffres`);
      return;
    }
    onVerified(code);
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 space-y-4" data-testid="pre-register-otp-gate">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h3 className="font-semibold text-emerald-900">Vérification du numéro</h3>
          <p className="text-sm text-emerald-800">
            Un code de vérification a été envoyé par SMS au <strong>{phoneNumber}</strong>.
            Saisissez-le ci-dessous pour finaliser la création de votre compte.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="otp-code">Code reçu par SMS</Label>
          <Input
            id="otp-code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={CODE_LENGTH}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            className="text-center text-2xl tracking-[0.5em] font-mono mt-1"
            data-testid="pre-register-otp-input"
            autoFocus
          />
          <p className="text-xs text-emerald-700 mt-1">
            Le code expire dans 10 minutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
            disabled={submitting || code.length !== CODE_LENGTH}
            data-testid="pre-register-submit-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création en cours…
              </>
            ) : (
              submitLabel
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={sendCode}
            disabled={sending || resendIn > 0}
            data-testid="pre-register-resend-btn"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            {resendIn > 0 ? `Renvoyer (${resendIn}s)` : 'Renvoyer le code'}
          </Button>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-emerald-700 hover:underline"
            data-testid="pre-register-back-btn"
          >
            ← Modifier mes informations
          </button>
        )}
      </form>

      {!sent && !sending && !deliveryError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Le code n&apos;a pas pu être envoyé. Vérifiez votre numéro et cliquez sur « Renvoyer le code ».
        </p>
      )}
      {deliveryError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-800" data-testid="otp-delivery-failed">
          <p className="font-semibold mb-1">❌ Numéro invalide</p>
          <p className="text-xs leading-relaxed">{deliveryError}</p>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-2 text-xs text-red-700 hover:underline font-medium"
              data-testid="otp-delivery-failed-back"
            >
              ← Saisir un autre numéro
            </button>
          )}
        </div>
      )}
    </div>
  );
}
