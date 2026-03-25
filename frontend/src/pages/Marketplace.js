import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Store, Package, MapPin, Filter, ShoppingBag, ArrowRight, Tag, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Marketplace = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [viewMode, setViewMode] = useState('products'); // 'products' or 'shops'
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (viewMode === 'products') loadProducts();
    else loadShops();
  }, [searchQuery, selectedCategory, selectedSector, sortBy, viewMode]);

  const loadData = async () => {
    try {
      const [catRes, prodRes, shopRes] = await Promise.all([
        axios.get(`${API}/product-categories`),
        axios.get(`${API}/marketplace/products`),
        axios.get(`${API}/marketplace/shops`)
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
      setShops(shopRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (sortBy) params.append('sort_by', sortBy);
      const res = await axios.get(`${API}/marketplace/products?${params}`);
      setProducts(res.data);
    } catch (err) { console.error(err); }
  };

  const loadShops = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedSector) params.append('sector', selectedSector);
      const res = await axios.get(`${API}/marketplace/shops?${params}`);
      setShops(res.data);
    } catch (err) { console.error(err); }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0);

  const sectors = [...new Set(shops.map(s => s.sector).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-10 w-10 rounded-xl bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <span className="font-bold text-xl text-gray-900">ServisPro</span>
              <span className="text-xs text-orange-500 ml-2 font-semibold">Makiti</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900 font-medium text-sm">Accueil</button>
            <button onClick={() => navigate('/browse')} className="text-gray-600 hover:text-gray-900 font-medium text-sm">Professionnels</button>
            <button onClick={() => navigate('/rentals')} className="text-gray-600 hover:text-gray-900 font-medium text-sm">Locations</button>
          </nav>
          <div className="flex items-center gap-3">
            {!isCustomerAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/customer/auth')} data-testid="marketplace-login-btn">Se connecter</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>Mon Dashboard</Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Makiti
          </h1>
          <p className="text-orange-100 text-base sm:text-lg mb-8">
            Découvrez les boutiques et produits des vendeurs en Guinée
          </p>
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              data-testid="marketplace-search"
              className="pl-12 py-6 text-base bg-white border-0 rounded-xl shadow-lg"
              placeholder="Rechercher un produit ou une boutique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* View Toggle + Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              data-testid="view-products-btn"
              variant={viewMode === 'products' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('products')}
              className={viewMode === 'products' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <Package className="h-4 w-4 mr-1" /> Produits ({products.length})
            </Button>
            <Button
              data-testid="view-shops-btn"
              variant={viewMode === 'shops' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('shops')}
              className={viewMode === 'shops' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <Store className="h-4 w-4 mr-1" /> Boutiques ({shops.length})
            </Button>
          </div>
          <div className="flex gap-2">
            {viewMode === 'products' && categories.length > 0 && (
              <select
                data-testid="category-filter"
                className="px-3 py-2 border rounded-lg text-sm bg-white"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Toutes catégories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {viewMode === 'shops' && sectors.length > 0 && (
              <select
                data-testid="sector-filter"
                className="px-3 py-2 border rounded-lg text-sm bg-white"
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
              >
                <option value="">Tous secteurs</option>
                {sectors.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {viewMode === 'products' && (
              <select
                data-testid="sort-filter"
                className="px-3 py-2 border rounded-lg text-sm bg-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Plus récents</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="popular">Populaires</option>
              </select>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-500">Chargement...</div>
        )}

        {/* Products Grid */}
        {!loading && viewMode === 'products' && (
          products.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">Aucun produit disponible</h3>
              <p className="text-gray-400 mt-2">Les vendeurs ajoutent bientôt leurs produits</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <Card
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => navigate(`/marketplace/product/${product.id}`)}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {product.photos?.length > 0 ? (
                      <img
                        src={getImageUrl(product.photos[0])}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    {product.is_negotiable && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">Négociable</span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{product.shop_name}</p>
                    <p className="text-orange-600 font-bold mt-2">{formatPrice(product.price)} GNF</p>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Shops Grid */}
        {!loading && viewMode === 'shops' && (
          shops.length === 0 ? (
            <div className="text-center py-16">
              <Store className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">Aucune boutique disponible</h3>
              <p className="text-gray-400 mt-2">Les vendeurs créent bientôt leurs boutiques</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.map(shop => (
                <Card
                  key={shop.id}
                  data-testid={`shop-card-${shop.id}`}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/marketplace/shop/${shop.id}`)}
                >
                  <div className="h-32 bg-gradient-to-br from-orange-400 to-yellow-300 relative">
                    {shop.banner && (
                      <img src={getImageUrl(shop.banner)} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute -bottom-6 left-4">
                      <div className="h-14 w-14 rounded-xl bg-white shadow-md flex items-center justify-center overflow-hidden border-2 border-white">
                        {shop.logo ? (
                          <img src={getImageUrl(shop.logo)} alt={shop.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="h-7 w-7 text-orange-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-8">
                    <h3 className="font-bold text-gray-900">{shop.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-orange-600 font-medium">{shop.sector}</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-2 line-clamp-2">{shop.description}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Package className="h-3 w-3" />
                        <span>{shop.total_products || 0} produits</span>
                      </div>
                      {shop.location && (
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <MapPin className="h-3 w-3" />
                          <span>{shop.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Marketplace;
