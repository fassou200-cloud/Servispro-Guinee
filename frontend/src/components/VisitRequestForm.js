import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, Clock, User, Send, CheckCircle, 
  Eye, Loader2, X, LogIn
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
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const today = new Date().toISOString().split('T')[0];

  const handleLoginRedirect = () => {
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/customer/auth');
  };

  const handleSubmit = async () => {
    if (!formData.preferred_date) {
      toast.error('Veuillez sélectionner une date de visite');
      return;
    }

    setLoading(true);
    try {
      const customerName = customer.name || 
        (customer.first_name && customer.last_name 
          ? `${customer.first_name} ${customer.last_name}` 
          : customer.first_name || 'Client');

      const response = await axios.post(`${API}/visit-requests`, {
        rental_id: rental.id,
        customer_name: customerName,
        customer_phone: customer.phone_number,
        customer_email: customer.email || null,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time || null,
        message: formData.message || null
      });

      setSuccess(true);
      toast.success('Demande de visite envoyée !');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  // Not logged in
  if (!customer) {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        )}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <LogIn className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">Connexion Requise</h3>
          <p className="text-slate-500 mb-6">Vous devez être connecté pour demander une visite</p>
          <Button onClick={handleLoginRedirect} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <LogIn className="h-4 w-4" /> Se connecter
          </Button>
        </div>
      </Card>
    );
  }

  // Success
  if (success) {
    return (
      <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        )}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">Demande Envoyée !</h3>
          <p className="text-slate-500 mb-6">
            Votre demande de visite a été envoyée au propriétaire. Vous serez contacté prochainement.
          </p>
          <Button onClick={onClose} variant="outline">Fermer</Button>
        </div>
      </Card>
    );
  }

  // Form
  return (
    <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl relative">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full">
          <X className="h-5 w-5 text-slate-500" />
        </button>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Eye className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-xl font-heading font-bold text-slate-900">Demander une Visite</h3>
        </div>
        <p className="text-sm text-slate-500">Sélectionnez votre date préférée pour visiter cette propriété</p>
      </div>

      {/* Customer Info */}
      <div className="p-4 bg-slate-50 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()}</p>
            <p className="text-sm text-slate-500">{customer.phone_number}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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

        <Button
          onClick={handleSubmit}
          disabled={!formData.preferred_date || loading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl gap-2"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="h-5 w-5" />
              Envoyer la demande
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default VisitRequestForm;
