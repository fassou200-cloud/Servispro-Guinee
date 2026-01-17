import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, Clock, User, Phone, Mail, Send, CheckCircle, 
  Eye, Loader2, AlertCircle, X 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VisitRequestForm = ({ rental, onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    preferred_date: '',
    preferred_time: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [fraisVisite, setFraisVisite] = useState(100000);
  const [submitted, setSubmitted] = useState(false);

  // Load customer data if logged in
  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      const customer = JSON.parse(storedCustomer);
      setFormData(prev => ({
        ...prev,
        customer_name: customer.name || '',
        customer_phone: customer.phone_number || '',
        customer_email: customer.email || ''
      }));
    }
    
    // Get frais de visite for AgentImmobilier
    axios.get(`${API}/service-fees/AgentImmobilier`)
      .then(res => setFraisVisite(res.data.frais_visite || 100000))
      .catch(() => setFraisVisite(100000));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.customer_phone || !formData.preferred_date) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/visit-requests`, {
        rental_id: rental.id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || null,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time || null,
        message: formData.message || null
      });

      setSubmitted(true);
      toast.success('Demande de visite envoyée avec succès !');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Error submitting visit request:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  if (submitted) {
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
            Votre demande de visite a été envoyée au propriétaire. 
            Vous serez contacté(e) pour confirmer la visite.
          </p>
          <div className="p-4 bg-white rounded-xl border border-green-200 mb-4">
            <p className="text-sm text-slate-600">
              <strong>Propriété :</strong> {rental.title}
            </p>
            <p className="text-sm text-slate-600">
              <strong>Date souhaitée :</strong> {new Date(formData.preferred_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {formData.preferred_time && (
              <p className="text-sm text-slate-600">
                <strong>Heure :</strong> {formData.preferred_time}
              </p>
            )}
          </div>
          <Button onClick={onClose} variant="outline" className="gap-2">
            Fermer
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl">
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
          Remplissez ce formulaire pour demander une visite de cette propriété
        </p>
      </div>

      {/* Frais de visite info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-800">Frais de Visite</span>
          </div>
          <span className="text-xl font-bold text-blue-700">
            {formatPrice(fraisVisite)} GNF
          </span>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Ce montant sera à payer avant la visite si votre demande est acceptée.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="customer_name" className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            Nom complet *
          </Label>
          <Input
            id="customer_name"
            name="customer_name"
            value={formData.customer_name}
            onChange={handleChange}
            placeholder="Votre nom complet"
            required
            className="h-12"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="customer_phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-500" />
            Téléphone *
          </Label>
          <Input
            id="customer_phone"
            name="customer_phone"
            type="tel"
            value={formData.customer_phone}
            onChange={handleChange}
            placeholder="620 XX XX XX"
            required
            className="h-12"
          />
        </div>

        {/* Email (optional) */}
        <div className="space-y-2">
          <Label htmlFor="customer_email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-500" />
            Email (optionnel)
          </Label>
          <Input
            id="customer_email"
            name="customer_email"
            type="email"
            value={formData.customer_email}
            onChange={handleChange}
            placeholder="votre@email.com"
            className="h-12"
          />
        </div>

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
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Envoyer la Demande
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};

export default VisitRequestForm;
