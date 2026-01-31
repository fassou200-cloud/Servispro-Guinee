import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Eye, Briefcase, DollarSign, Info, Truck } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceFeesDisplay = ({ profession, showTitle = true, compact = false }) => {
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ devise: 'GNF' });

  useEffect(() => {
    fetchFees();
    fetchSettings();
  }, [profession]);

  const fetchFees = async () => {
    try {
      const response = await axios.get(`${API}/service-fees/${profession}`);
      setFees(response.data);
    } catch (err) {
      console.error('Error fetching service fees:', err);
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

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/commission-rates`);
      setSettings({ devise: response.data.devise || 'GNF' });
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  if (loading || !fees) {
    return null;
  }

  // Don't show if frais_visite is 0
  if (fees.frais_visite === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-3 text-sm">
        {fees.frais_visite > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">
            <Truck className="h-3.5 w-3.5" />
            <span className="font-medium">Frais de déplacement: {formatPrice(fees.frais_visite)} {settings.devise}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <Truck className="h-5 w-5 text-green-600" />
          <h3 className="font-heading font-semibold text-slate-800">
            Frais de déplacement
          </h3>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {fees.frais_visite > 0 && (
          <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Truck className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Frais de déplacement</span>
            </div>
            <p className="text-xl font-bold text-slate-800">
              {formatPrice(fees.frais_visite)}
              <span className="text-sm font-normal text-slate-500 ml-1">{settings.devise}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Payé avant le déplacement
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Ce tarif est défini par la plateforme ServisPro. Le client doit payer les frais de déplacement avant le déplacement du prestataire.
        </span>
      </div>
    </Card>
  );
};

export default ServiceFeesDisplay;
