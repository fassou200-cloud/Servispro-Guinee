import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Home, Building, DollarSign, Info, Sparkles, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AgentListingFeesCard = ({ providerId }) => {
  const [listingInfo, setListingInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListingInfo();
  }, [providerId]);

  const fetchListingInfo = async () => {
    try {
      const response = await axios.get(`${API}/agent-listing-info/${providerId}`);
      setListingInfo(response.data);
    } catch (err) {
      console.error('Error fetching listing info:', err);
      // Default values
      setListingInfo({
        total_listings: 0,
        free_listings_limit: 3,
        free_listings_remaining: 3,
        is_next_free: true,
        frais_annonce_location: 50000,
        frais_annonce_vente: 100000,
        devise: 'GNF'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  if (loading || !listingInfo) {
    return (
      <Card className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-200/50 animate-pulse">
        <div className="h-32"></div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-200/50">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-foreground">
            Tarifs des Annonces
          </h3>
          <p className="text-xs text-muted-foreground">
            Frais définis par la plateforme ServisPro
          </p>
        </div>
      </div>

      {/* Free Listings Status */}
      {listingInfo.free_listings_remaining > 0 ? (
        <div className="mb-4 p-3 bg-green-100 rounded-xl border border-green-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                {listingInfo.free_listings_remaining} annonce{listingInfo.free_listings_remaining > 1 ? 's' : ''} gratuite{listingInfo.free_listings_remaining > 1 ? 's' : ''} restante{listingInfo.free_listings_remaining > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-green-700">
                Vous avez publié {listingInfo.total_listings} annonce{listingInfo.total_listings > 1 ? 's' : ''} sur {listingInfo.free_listings_limit} gratuites
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-orange-100 rounded-xl border border-orange-200">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm font-semibold text-orange-800">
                Annonces gratuites épuisées
              </p>
              <p className="text-xs text-orange-700">
                Vous avez publié {listingInfo.total_listings} annonce{listingInfo.total_listings > 1 ? 's' : ''}. Les prochaines seront payantes.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Frais Annonce Location */}
        <div className="bg-background/80 p-3 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Building className="h-4 w-4" />
            <span className="text-xs font-medium">Location</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {listingInfo.is_next_free ? (
              <span className="text-green-600">GRATUIT</span>
            ) : (
              <>
                {formatPrice(listingInfo.frais_annonce_location)}
                <span className="text-xs font-normal text-muted-foreground ml-1">{listingInfo.devise}</span>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Par annonce
          </p>
        </div>

        {/* Frais Annonce Vente */}
        <div className="bg-background/80 p-3 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Home className="h-4 w-4" />
            <span className="text-xs font-medium">Vente</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {listingInfo.is_next_free ? (
              <span className="text-green-600">GRATUIT</span>
            ) : (
              <>
                {formatPrice(listingInfo.frais_annonce_vente)}
                <span className="text-xs font-normal text-muted-foreground ml-1">{listingInfo.devise}</span>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Par annonce
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1 text-blue-600">
          <Building className="h-3 w-3" />
          <span>{listingInfo.rentals_count || 0} location{(listingInfo.rentals_count || 0) > 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1 text-purple-600">
          <Home className="h-3 w-3" />
          <span>{listingInfo.sales_count || 0} vente{(listingInfo.sales_count || 0) > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-2 text-xs text-blue-700">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Les {listingInfo.free_listings_limit} premières annonces sont gratuites. 
            Au-delà, chaque annonce est facturée selon le tarif ci-dessus.
          </span>
        </div>
      </div>
    </Card>
  );
};

export default AgentListingFeesCard;
