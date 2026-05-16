import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Send,
  CheckCircle2,
  User,
  FileText,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { formatGuineanPhone } from '@/utils/phone';
import GuineaFlag from '@/components/GuineaFlag';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FeedbackButton = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_name: '',
    title: '',
    description: '',
    user_phone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.user_name.trim()) {
      toast.error('Veuillez entrer votre nom');
      return;
    }
    const phoneDigits = formData.user_phone.replace(/[^\d]/g, '');
    if (phoneDigits.length < 8) {
      toast.error('Le numéro de téléphone est obligatoire (minimum 8 chiffres)');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }
    if (formData.description.trim().length < 10) {
      toast.error('Le message doit contenir au moins 10 caractères');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/feedback`, {
        type: 'contact',
        title: formData.title.trim(),
        description: formData.description.trim(),
        user_name: formData.user_name.trim(),
        user_phone: formData.user_phone.trim(),
        user_email: '',
        page_url: window.location.href,
        user_type: localStorage.getItem('customerToken') ? 'client' : 
                   localStorage.getItem('token') ? 'provider' : 
                   localStorage.getItem('companyToken') ? 'company' : 'visitor'
      });

      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setFormData({ user_name: '', title: '', description: '', user_phone: '' });
      }, 2500);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Contact Button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full shadow-lg shadow-green-500/30 transition-all hover:scale-105 ${className}`}
        data-testid="contact-us-btn"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium">Contactez-nous</span>
      </button>

      {/* Contact Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 max-h-[90vh] overflow-y-auto">
          {submitted ? (
            <div className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Envoyé !</h3>
              <p className="text-gray-600">Merci de nous avoir contacté.</p>
              <p className="text-gray-500 text-sm mt-2">Notre équipe vous répondra dans les plus brefs délais.</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <MessageCircle className="h-6 w-6 text-green-500" />
                  Contactez-nous
                </DialogTitle>
                <DialogDescription>
                  Envoyez-nous un message et notre équipe vous répondra rapidement
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="user_name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    Votre Nom *
                  </Label>
                  <Input
                    id="user_name"
                    name="user_name"
                    value={formData.user_name}
                    onChange={handleChange}
                    placeholder="Entrez votre nom complet"
                    className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                    data-testid="contact-name-input"
                  />
                </div>

                {/* Phone (Required) */}
                <div className="space-y-2">
                  <Label htmlFor="user_phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <GuineaFlag className="h-3 w-4" />
                    Téléphone *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10"><GuineaFlag /></span>
                    <Input
                      id="user_phone"
                      name="user_phone"
                      type="tel"
                      value={formData.user_phone}
                      onChange={handleChange}
                      onBlur={(e) => setFormData((prev) => ({ ...prev, user_phone: formatGuineanPhone(e.target.value) }))}
                      placeholder="Ex: 224 6XX XXX XXX"
                      required
                      className="pl-12 border-gray-200 focus:border-green-500 focus:ring-green-500"
                      data-testid="contact-phone-input"
                    />
                  </div>
                </div>

                {/* Title/Subject */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    Objet *
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Ex: Question sur les services, Demande d'information..."
                    className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                    data-testid="contact-title-input"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                    Votre Message *
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Décrivez en détail ce que vous souhaitez... (minimum 10 caractères)"
                    className="min-h-[120px] resize-none border-gray-200 focus:border-green-500 focus:ring-green-500"
                    maxLength={1000}
                    data-testid="contact-message-input"
                  />
                  <p className="text-xs text-gray-400 text-right">{formData.description.length}/1000</p>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !formData.user_name.trim() || !formData.title.trim() || formData.description.trim().length < 10}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    data-testid="contact-submit-btn"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Envoi...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Envoyer
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FeedbackButton;
