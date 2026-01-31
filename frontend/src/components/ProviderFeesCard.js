import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Eye, Briefcase, DollarSign, Info } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProviderFeesCard = ({ profession }) => {
  const [fees, setFees] = useState(null);
  const [settings, setSettings] = useState({ devise: 'GNF' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [profession]);

  const fetchData = async () => {
    try {
      const [feesRes, settingsRes] = await Promise.all([
        axios.get(`${API}/service-fees/${profession}`),
        axios.get(`${API}/commission-rates`)
      ]);
      setFees(feesRes.data);
      setSettings({ devise: settingsRes.data.devise || 'GNF' });
    } catch (err) {
      console.error('Error fetching fees:', err);
      // Default to 0 if API fails - synced with admin settings
      setFees({
        profession: profession,
        frais_visite: 0,
        frais_prestation: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  if (loading || !fees) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-green-500/10 border-blue-200/50">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-foreground">
            Tarifs de votre Service
          </h3>
          <p className="text-xs text-muted-foreground">
            Frais définis par la plateforme ServisPro
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Frais de déplacement */}
        <div className="bg-background/80 p-4 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Frais de déplacement</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatPrice(fees.frais_visite)}
            <span className="text-sm font-normal text-muted-foreground ml-1">{settings.devise}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Payé par le client avant votre déplacement
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-2 text-xs text-blue-700">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Ce tarif est défini par ServisPro et appliqué à votre catégorie de métier. 
            Le client doit payer les frais de visite avant votre déplacement.
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ProviderFeesCard;
