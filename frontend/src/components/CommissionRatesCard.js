import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Percent, Briefcase, Home, Building, Car, Clock, Info, AlertCircle 
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Map user profession/sector to commission domain
const getDomainForUser = (profession, sector = null) => {
  // For companies, check sector
  if (sector) {
    if (sector === 'Immobilier') {
      return ['location_courte', 'location_longue', 'vente'];
    }
    if (sector === 'Transport') {
      return ['location_vehicule'];
    }
    return ['prestation'];
  }
  
  // For providers, check profession
  if (profession === 'AgentImmobilier') {
    return ['location_courte', 'location_longue', 'vente'];
  }
  if (['Camionneur', 'Tracteur', 'Voiture'].includes(profession)) {
    return ['location_vehicule'];
  }
  
  // Default for other professions (service providers)
  return ['prestation'];
};

// Get icon for domain
const getDomainIcon = (domain) => {
  const icons = {
    prestation: Briefcase,
    location_courte: Clock,
    location_longue: Home,
    vente: Building,
    location_vehicule: Car
  };
  return icons[domain] || Percent;
};

// Get color for domain
const getDomainColor = (domain) => {
  const colors = {
    prestation: 'text-orange-500 bg-orange-500/10',
    location_courte: 'text-cyan-500 bg-cyan-500/10',
    location_longue: 'text-green-500 bg-green-500/10',
    vente: 'text-amber-500 bg-amber-500/10',
    location_vehicule: 'text-purple-500 bg-purple-500/10'
  };
  return colors[domain] || 'text-gray-500 bg-gray-500/10';
};

const CommissionRatesCard = ({ profession, sector, compact = false }) => {
  const [rates, setRates] = useState(null);
  const [serviceFees, setServiceFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [profession]);

  const fetchData = async () => {
    try {
      const [ratesRes, feesRes] = await Promise.all([
        axios.get(`${API}/commission-rates`),
        profession ? axios.get(`${API}/service-fees/${profession}`) : Promise.resolve({ data: null })
      ]);
      setRates(ratesRes.data);
      setServiceFees(feesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (error || !rates) {
    return null; // Don't show on error
  }

  const userDomains = getDomainForUser(profession, sector);
  const relevantRates = userDomains.map(domain => ({
    domain,
    ...rates.rates[domain]
  }));

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
        <Info className="h-4 w-4 text-primary" />
        <span>Commission plateforme:</span>
        {relevantRates.map((rate, idx) => (
          <span key={rate.domain} className="font-semibold text-foreground">
            {idx > 0 && ' | '}
            {rate.label}: <span className="text-primary">{rate.rate}%</span>
          </span>
        ))}
      </div>
    );
  }

  // Check if this is a service provider (not real estate or vehicle)
  const isServiceProvider = !['AgentImmobilier', 'Camionneur', 'Tracteur', 'Voiture'].includes(profession) && !sector;
  const showServiceFees = isServiceProvider && serviceFees && (serviceFees.frais_visite > 0 || serviceFees.frais_prestation > 0);

  return (
    <div className="space-y-4">
      {/* Service Fees Card for Service Providers */}
      {showServiceFees && (
        <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-green-500/10 border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Briefcase className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground text-sm">
                Tarifs de votre Service
              </h3>
              <p className="text-xs text-muted-foreground">
                Frais définis par la plateforme ServisPro
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {serviceFees.frais_visite > 0 && (
              <div className="bg-background/80 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Frais de Visite</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatPrice(serviceFees.frais_visite)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{rates?.devise || 'GNF'}</span>
                </p>
              </div>
            )}
            {serviceFees.frais_prestation > 0 && (
              <div className="bg-background/80 p-3 rounded-lg border border-green-200">
                <div className="flex items-center gap-1.5 text-green-600 mb-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Frais de Prestation</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatPrice(serviceFees.frais_prestation)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{rates?.devise || 'GNF'}</span>
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Commission Rates Card */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Percent className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-sm">
              Commission ServisPro
            </h3>
            <p className="text-xs text-muted-foreground">
              Taux applicables à votre activité
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          {relevantRates.map((rate) => {
            const Icon = getDomainIcon(rate.domain);
            const colorClass = getDomainColor(rate.domain);
            
            return (
              <div 
                key={rate.domain}
                className="flex items-center justify-between p-2 bg-background/60 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-foreground">{rate.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-primary">{rate.rate}</span>
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Ces commissions sont prélevées automatiquement sur chaque transaction effectuée via la plateforme.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CommissionRatesCard;
