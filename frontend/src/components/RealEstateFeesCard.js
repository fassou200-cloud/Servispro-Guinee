import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Home, DollarSign, Building, Gift, Info, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RealEstateFeesCard = ({ providerId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (providerId) fetchListingInfo();
  }, [providerId]);

  const fetchListingInfo = async () => {
    try {
      const res = await axios.get(`${API}/agent-listing-info/${providerId}`);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching listing info:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0);

  if (loading || !data) return null;

  return (
    <Card data-testid="real-estate-fees-card" className="p-5 border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-emerald-100 rounded-xl">
          <Building className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-foreground">Tarifs des Annonces</h3>
          <p className="text-xs text-muted-foreground">Frais de publication sur ServisPro</p>
        </div>
      </div>

      {/* Free listings banner */}
      {data.free_listings_remaining > 0 ? (
        <div data-testid="free-listings-banner" className="flex items-center gap-3 p-3 mb-4 bg-green-100 border border-green-200 rounded-xl">
          <Gift className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              {data.free_listings_remaining} annonce{data.free_listings_remaining > 1 ? 's' : ''} gratuite{data.free_listings_remaining > 1 ? 's' : ''} restante{data.free_listings_remaining > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-green-600">
              Vos {data.free_listings_limit} premieres annonces sont offertes !
            </p>
          </div>
        </div>
      ) : (
        <div data-testid="no-free-listings-banner" className="flex items-center gap-3 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Annonces gratuites épuisées</p>
            <p className="text-xs text-amber-600">
              Vos {data.free_listings_limit} annonces gratuites ont été utilisées. Les prochaines seront payantes.
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div data-testid="total-listings-count" className="text-center p-3 bg-white/70 rounded-xl border border-emerald-100">
          <p className="text-2xl font-bold text-emerald-700">{data.total_listings}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div data-testid="rentals-count" className="text-center p-3 bg-white/70 rounded-xl border border-blue-100">
          <p className="text-2xl font-bold text-blue-600">{data.rentals_count}</p>
          <p className="text-xs text-muted-foreground">Locations</p>
        </div>
        <div data-testid="sales-count" className="text-center p-3 bg-white/70 rounded-xl border border-purple-100">
          <p className="text-2xl font-bold text-purple-600">{data.sales_count}</p>
          <p className="text-xs text-muted-foreground">Ventes</p>
        </div>
      </div>

      {/* Fee cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div data-testid="rental-fee-card" className="p-4 bg-white/80 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Home className="h-4 w-4" />
            <span className="text-sm font-medium">Annonce Location</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {data.is_next_free ? (
              <span className="text-green-600">Gratuit</span>
            ) : (
              <>
                {formatPrice(data.frais_annonce_location)}
                <span className="text-sm font-normal text-muted-foreground ml-1">{data.devise}</span>
              </>
            )}
          </p>
        </div>
        <div data-testid="sale-fee-card" className="p-4 bg-white/80 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Annonce Vente</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {data.is_next_free ? (
              <span className="text-green-600">Gratuit</span>
            ) : (
              <>
                {formatPrice(data.frais_annonce_vente)}
                <span className="text-sm font-normal text-muted-foreground ml-1">{data.devise}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
        <div className="flex items-start gap-2 text-xs text-emerald-700">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Les tarifs sont définis par ServisPro. Les {data.free_listings_limit} premieres annonces (location ou vente) sont gratuites. 
            Au-dela, des frais de publication s'appliquent.
          </span>
        </div>
      </div>
    </Card>
  );
};

export default RealEstateFeesCard;
