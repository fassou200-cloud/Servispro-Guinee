import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  MessageSquarePlus, 
  Bug, 
  AlertTriangle, 
  Lightbulb, 
  Sparkles, 
  HelpCircle,
  Send,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const feedbackTypes = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500', bgColor: 'bg-red-100', description: 'Signaler un problème technique' },
  { value: 'issue', label: 'Problème', icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-100', description: 'Signaler un dysfonctionnement' },
  { value: 'feature', label: 'Nouvelle Fonctionnalité', icon: Lightbulb, color: 'text-blue-500', bgColor: 'bg-blue-100', description: 'Proposer une nouvelle fonction' },
  { value: 'improvement', label: 'Amélioration', icon: Sparkles, color: 'text-purple-500', bgColor: 'bg-purple-100', description: 'Suggérer une amélioration' },
  { value: 'other', label: 'Autre', icon: HelpCircle, color: 'text-gray-500', bgColor: 'bg-gray-100', description: 'Autre commentaire' }
];

const FeedbackButton = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    user_name: '',
    user_email: '',
    user_phone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.type) {
      toast.error('Veuillez sélectionner un type de feedback');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }
    if (formData.description.trim().length < 20) {
      toast.error('La description doit contenir au moins 20 caractères');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/feedback`, {
        ...formData,
        page_url: window.location.href,
        user_type: localStorage.getItem('customerToken') ? 'client' : 
                   localStorage.getItem('token') ? 'provider' : 
                   localStorage.getItem('companyToken') ? 'company' : 'visitor'
      });

      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setFormData({ type: '', title: '', description: '', user_name: '', user_email: '', user_phone: '' });
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erreur lors de l\'envoi du feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = feedbackTypes.find(t => t.value === formData.type);

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full shadow-lg shadow-orange-500/30 transition-all hover:scale-105 ${className}`}
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span className="font-medium">Feedback</span>
      </button>

      {/* Feedback Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 max-h-[90vh] overflow-y-auto">
          {submitted ? (
            <div className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Merci !</h3>
              <p className="text-gray-600">Votre feedback a été envoyé avec succès.</p>
              <p className="text-gray-500 text-sm mt-2">Notre équipe l'examinera rapidement.</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <MessageSquarePlus className="h-6 w-6 text-orange-500" />
                  Envoyer un Feedback
                </DialogTitle>
                <DialogDescription>
                  Aidez-nous à améliorer ServisPro en partageant vos idées ou en signalant des problèmes
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Feedback Type Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Type de feedback *
                  </Label>
                  <RadioGroup 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    className="grid grid-cols-2 gap-3"
                  >
                    {feedbackTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <div key={type.value} className="flex items-center">
                          <RadioGroupItem value={type.value} id={`type-${type.value}`} className="sr-only" />
                          <Label
                            htmlFor={`type-${type.value}`}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              formData.type === type.value
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-orange-300'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg ${type.bgColor} flex items-center justify-center`}>
                              <Icon className={`h-5 w-5 ${type.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{type.label}</p>
                              <p className="text-xs text-gray-500">{type.description}</p>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                    Titre *
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Résumez votre feedback en quelques mots"
                    className="border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description détaillée *
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Décrivez le problème ou votre suggestion en détail... (minimum 20 caractères)"
                    className="min-h-[120px] resize-none border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-400 text-right">{formData.description.length}/1000</p>
                </div>

                {/* Contact Info (Optional) */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Informations de contact (optionnel)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      name="user_name"
                      value={formData.user_name}
                      onChange={handleChange}
                      placeholder="Votre nom"
                      className="border-gray-200 focus:border-orange-500"
                    />
                    <Input
                      name="user_phone"
                      value={formData.user_phone}
                      onChange={handleChange}
                      placeholder="Téléphone"
                      className="border-gray-200 focus:border-orange-500"
                    />
                  </div>
                  <Input
                    name="user_email"
                    type="email"
                    value={formData.user_email}
                    onChange={handleChange}
                    placeholder="Email (pour vous recontacter)"
                    className="border-gray-200 focus:border-orange-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !formData.type || !formData.title.trim() || formData.description.trim().length < 20}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
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
