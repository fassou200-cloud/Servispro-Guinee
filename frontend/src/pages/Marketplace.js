import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Store, Package, MapPin, ShoppingBag, ArrowUpRight, Tag, Shirt, Car, Sparkles, Cpu, UtensilsCrossed, Sofa, MoreHorizontal, Footprints, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HERO_SLIDES = [
  {
    title: 'Boutiques et produits en Guinée',
    subtitle: 'Trouvez rapidement les produits dont vous avez besoin en explorant des boutiques locales en Guinée, avec des offres compétitives et une navigation simple.',
    image: 'https://images.unsplash.com/photo-1713256752744-fad1d7a8684c?w=800&q=80',
    cta: 'Explorer les boutiques',
  },
  {
    title: 'Mode & accessoires tendance',
    subtitle: 'Découvrez les dernières tendances en chaussures, vêtements et accessoires proposés par les vendeurs guinéens.',
    image: 'https://images.unsplash.com/photo-1758525223709-2dc38e53f55d?w=800&q=80',
    cta: 'Voir les produits',
  },
  {
    title: 'Électronique & high-tech',
    subtitle: 'Téléphones, ordinateurs, gadgets et bien plus. Comparez les prix et trouvez les meilleures offres.',
    image: 'https://images.unsplash.com/photo-1758525223677-b718f428fc87?w=800&q=80',
    cta: 'Parcourir',
  },
];

const Marketplace = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [viewMode, setViewMode] = useState('products');
  const [sortBy, setSortBy] = useState('recent');
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null);

  const PRODUCT_TYPE_OPTIONS = [
    { value: 'chaussures', label: 'Chaussures', icon: Footprints, color: 'bg-amber-500' },
    { value: 'vetements', label: 'Vêtements & Mode', icon: Shirt, color: 'bg-pink-500' },
    { value: 'voitures', label: 'Voitures', icon: Car, color: 'bg-blue-500' },
    { value: 'cosmetiques', label: 'Cosmétiques', icon: Sparkles, color: 'bg-purple-500' },
    { value: 'electronique', label: 'Électronique', icon: Cpu, color: 'bg-cyan-500' },
    { value: 'alimentation', label: 'Alimentation', icon: UtensilsCrossed, color: 'bg-green-500' },
    { value: 'mobilier', label: 'Mobilier', icon: Sofa, color: 'bg-orange-600' },
    { value: 'autre', label: 'Autre', icon: MoreHorizontal, color: 'bg-gray-500' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (viewMode === 'products') loadProducts();
    else loadShops();
  }, [searchQuery, selectedCategory, selectedProductType, sortBy, viewMode]);

  // Auto-advance carousel
  useEffect(() => {
    slideInterval.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(slideInterval.current);
  }, []);

  const goToSlide = (idx) => {
    setCurrentSlide(idx);
    clearInterval(slideInterval.current);
    slideInterval.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
  };

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
      const res = await axios.get(`${API}/marketplace/shops?${params}`);
      setShops(res.data);
    } catch (err) { console.error(err); }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0);

  const filteredProducts = selectedProductType
    ? products.filter(p => p.product_type === selectedProductType)
    : products;

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <span className="font-bold text-lg sm:text-xl text-gray-900">ServisPro</span>
            <span className="text-xs text-orange-500 font-semibold">Makiti</span>
          </div>

          {/* Nav links - desktop */}
          <nav className="hidden md:flex items-center gap-5 ml-4">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-900 text-sm font-medium">Accueil</button>
            <button onClick={() => navigate('/browse')} className="text-gray-500 hover:text-gray-900 text-sm font-medium">Professionnels</button>
            <button onClick={() => navigate('/rentals')} className="text-gray-500 hover:text-gray-900 text-sm font-medium">Locations</button>
          </nav>

          {/* Search bar - in header like Figma */}
          <div className="flex-1 max-w-lg mx-auto hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                data-testid="marketplace-search"
                className="pl-10 h-10 text-sm bg-gray-50 border-gray-200 rounded-full"
                placeholder="Rechercher un produit ou une boutique..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Auth / Account */}
          <div className="flex items-center gap-2 shrink-0">
            {!isCustomerAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={() => navigate('/customer/auth')} data-testid="marketplace-login-btn" className="text-sm">
                Se connecter
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')} className="text-sm">Mon Dashboard</Button>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              data-testid="marketplace-search-mobile"
              className="pl-10 h-10 text-sm bg-gray-50 border-gray-200 rounded-full"
              placeholder="Rechercher un produit ou une boutique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Hero Carousel */}
      <section className="relative overflow-hidden" data-testid="hero-carousel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 rounded-2xl sm:rounded-3xl mt-4 overflow-hidden">
            {/* Content */}
            <div className="flex flex-col md:flex-row items-center min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]">
              {/* Text side */}
              <div className="flex-1 px-6 sm:px-10 lg:px-14 py-8 sm:py-10 z-10 relative">
                <h1
                  className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900 leading-tight"
                  style={{ transition: 'opacity 0.4s' }}
                  key={currentSlide}
                >
                  {slide.title}
                </h1>
                <p className="text-gray-700/80 text-sm sm:text-base mt-3 sm:mt-4 max-w-md leading-relaxed">
                  {slide.subtitle}
                </p>
                <button
                  onClick={() => {
                    const el = document.getElementById('products-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-5 sm:mt-7 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-colors"
                  data-testid="hero-cta-btn"
                >
                  {slide.cta}
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>

              {/* Image side */}
              <div className="hidden md:block flex-1 relative self-stretch">
                <img
                  src={slide.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  key={`img-${currentSlide}`}
                />
                {/* Gradient overlay to blend with orange */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/80 via-orange-400/30 to-transparent" />
              </div>
            </div>

            {/* Carousel dots */}
            <div className="flex items-center justify-center gap-2 pb-5 relative z-10">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`transition-all rounded-full ${
                    idx === currentSlide
                      ? 'w-8 h-2.5 bg-orange-700'
                      : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/70'
                  }`}
                  data-testid={`carousel-dot-${idx}`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Bar */}
      <section className="bg-white border-b sticky top-[57px] sm:top-[57px] z-40 mt-4">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setSelectedProductType('')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedProductType === ''
                  ? 'bg-orange-500 text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid="category-all"
            >
              <ShoppingBag className="h-5 w-5" />
              Tout
            </button>
            {PRODUCT_TYPE_OPTIONS.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedProductType === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedProductType(isActive ? '' : cat.value)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? `${cat.color} text-white shadow-md scale-105`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  data-testid={`category-${cat.value}`}
                >
                  <Icon className="h-5 w-5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6" id="products-section">
        {/* View Toggle + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            <Button
              data-testid="view-products-btn"
              variant={viewMode === 'products' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('products')}
              className={viewMode === 'products' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <Package className="h-4 w-4 mr-1" /> Produits ({filteredProducts.length})
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
          filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">Aucun produit disponible</h3>
              <p className="text-gray-400 mt-2">Les vendeurs ajoutent bientôt leurs produits</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map(product => (
                <Card
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => navigate(`/makiti/product/${product.id}`)}
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
                    <p className="text-orange-600 font-bold mt-2">
                      {product.price_on_request
                        ? <span className="text-blue-600 italic text-sm">Prix sur demande</span>
                        : <>{formatPrice(product.price)} {product.currency || 'GNF'}</>
                      }
                    </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {shops.map(shop => (
                <Card
                  key={shop.id}
                  data-testid={`shop-card-${shop.id}`}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/makiti/shop/${shop.id}`)}
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
