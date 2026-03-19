import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Package, MapPin, Phone, Mail, ArrowLeft, Tag, Eye } from 'lucide-react';
import axios from 'axios';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ShopDetail = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShop();
  }, [shopId]);

  const fetchShop = async () => {
    try {
      const res = await axios.get(`${API}/marketplace/shops/${shopId}`);
      setShop(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  if (!shop) return <div className="flex items-center justify-center min-h-screen">Boutique non trouvée</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/marketplace')} data-testid="back-to-marketplace">
            <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
          </Button>
        </div>
      </header>

      {/* Shop Banner */}
      <div className="h-48 sm:h-64 bg-gradient-to-br from-orange-400 to-yellow-300 relative">
        {shop.banner && <img src={getImageUrl(shop.banner)} alt="" className="w-full h-full object-cover" />}
      </div>

      {/* Shop Info */}
      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-10">
        <div className="flex items-end gap-4 mb-6">
          <div className="h-24 w-24 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
            {shop.logo ? (
              <img src={getImageUrl(shop.logo)} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              <Store className="h-10 w-10 text-orange-500" />
            )}
          </div>
          <div className="pb-1">
            <h1 data-testid="shop-name" className="text-2xl font-bold text-gray-900">{shop.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-sm text-orange-600">
                <Tag className="h-3.5 w-3.5" /> {shop.sector}
              </span>
              {shop.location && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5" /> {shop.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-3">A propos</h3>
              <p className="text-sm text-gray-600 mb-4">{shop.description}</p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4 text-green-500" />
                  <a href={`tel:${shop.contact_phone}`} className="hover:text-green-600">{shop.contact_phone}</a>
                </div>
                {shop.contact_email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span>{shop.contact_email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Package className="h-4 w-4 text-orange-500" />
                  <span>{shop.products?.length || 0} produits</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Products */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Produits ({shop.products?.length || 0})</h2>
            {(!shop.products || shop.products.length === 0) ? (
              <div className="text-center py-12 bg-white rounded-xl border">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun produit dans cette boutique</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {shop.products.map(product => (
                  <Card
                    key={product.id}
                    data-testid={`shop-product-${product.id}`}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                    onClick={() => navigate(`/marketplace/product/${product.id}`)}
                  >
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {product.photos?.length > 0 ? (
                        <img src={getImageUrl(product.photos[0])} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-gray-300" /></div>
                      )}
                      {product.is_negotiable && (
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">Négociable</span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                      <p className="text-orange-600 font-bold mt-2">{formatPrice(product.price)} GNF</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopDetail;
