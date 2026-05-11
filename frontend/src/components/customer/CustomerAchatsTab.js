import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingBag, Package, Loader2 } from 'lucide-react';
import { getImageUrl } from '@/utils/imageUrl';

export const CustomerAchatsTab = ({
  navigate,
  productInquiries,
  loadingProductInquiries,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Mes Demandes de Produits</h2>
      <p className="text-gray-500 text-sm">Historique de tous les produits pour lesquels vous avez contacté un vendeur</p>

      {loadingProductInquiries ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" /></div>
      ) : productInquiries.length === 0 ? (
        <Card className="p-8 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-600">Aucune demande</h3>
          <p className="text-gray-400 text-sm mt-1">Vous n'avez pas encore contacté de vendeur sur Makiti</p>
          <Button className="mt-4 bg-orange-500 hover:bg-orange-600" onClick={() => navigate('/makiti')}>
            Explorer Makiti
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {productInquiries.map(inq => (
            <Card key={inq.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/makiti/product/${inq.product_id}`)}>
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                  {inq.product_photo ? (
                    <img src={getImageUrl(inq.product_photo)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-gray-300" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{inq.product_name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{inq.shop_name}</p>
                  {inq.product_price > 0 && (
                    <p className="text-orange-600 font-bold text-sm mt-1">{new Intl.NumberFormat('fr-FR').format(inq.product_price)} {inq.product_currency || 'GNF'}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{new Date(inq.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="mt-2 bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-600 line-clamp-2">{inq.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
