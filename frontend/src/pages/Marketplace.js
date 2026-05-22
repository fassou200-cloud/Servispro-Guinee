import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Store, Package, MapPin, ShoppingBag, ArrowUpRight, Tag, Heart, Clock, ChevronLeft, ChevronRight, Smile, Send, Loader2, Sparkles } from 'lucide-react';
import { formatGuineanPhone } from '@/utils/phone';
import { toast } from 'sonner';
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

const PRODUCT_TYPE_OPTIONS = [
  { value: 'chaussures', label: 'Chaussures', image: 'https://images.unsplash.com/photo-1741787860473-0ea4d7405b24?w=300&h=300&fit=crop&q=80' },
  { value: 'vetements', label: 'Vêtements & Mode', image: 'https://images.unsplash.com/photo-1769184059649-0764a3f3d25c?w=300&h=300&fit=crop&q=80' },
  { value: 'voitures', label: 'Voitures', image: 'https://images.unsplash.com/photo-1758411898245-c2edbc1a1df8?w=300&h=300&fit=crop&q=80' },
  { value: 'cosmetiques', label: 'Cosmétiques', image: 'https://images.unsplash.com/photo-1680244169777-a3d7d758a264?w=300&h=300&fit=crop&q=80' },
  { value: 'electronique', label: 'Électronique', image: 'https://images.unsplash.com/photo-1754761986430-5d0d44d09d00?w=300&h=300&fit=crop&q=80' },
  { value: 'alimentation', label: 'Alimentation', image: 'https://images.unsplash.com/photo-1760108273055-e9bb6e7f3a0c?w=300&h=300&fit=crop&q=80' },
  { value: 'mobilier', label: 'Mobilier', image: 'https://images.unsplash.com/photo-1775494108186-8d7354660c64?w=300&h=300&fit=crop&q=80' },
  { value: 'bijoux', label: 'Bijoux', image: 'https://images.unsplash.com/photo-1775135946288-ab8f63edff52?w=300&h=300&fit=crop&q=80' },
];

// Quick-filter categories are no longer needed (offers come from admin now)

const Marketplace = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [viewMode, setViewMode] = useState('products');
  const [sortBy, setSortBy] = useState('smart');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [offerFilter, setOfferFilter] = useState('');
  const [limitedOffers, setLimitedOffers] = useState([]);
  const [offersActive, setOffersActive] = useState(false);
  const [offerExpiration, setOfferExpiration] = useState(null);
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('makiti_wishlist') || '[]'); } catch { return []; }
  });
  const slideInterval = useRef(null);
  const catScrollRef = useRef(null);
  const offersScrollRef = useRef(null);

  // Countdown timer state
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 });

  // Product suggestion modal (exit intent)
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [suggestName, setSuggestName] = useState('');
  const [suggestPhone, setSuggestPhone] = useState('');
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);

  const submitSuggestion = async () => {
    if (suggestion.trim().length < 3) {
      toast.error('Veuillez décrire le produit recherché');
      return;
    }
    if (!suggestName.trim()) {
      toast.error('Veuillez renseigner votre nom');
      return;
    }
    if (!suggestPhone.trim() || suggestPhone.trim().length < 8) {
      toast.error('Veuillez renseigner un numéro de téléphone valide');
      return;
    }
    setSuggestSubmitting(true);
    try {
      const customer = (() => {
        try { return JSON.parse(localStorage.getItem('customer') || 'null'); } catch { return null; }
      })();
      await axios.post(`${API}/makiti/product-suggestion`, {
        suggestion: suggestion.trim(),
        contact_name: suggestName.trim(),
        contact_phone: suggestPhone.trim(),
        customer_id: customer?.id || null,
      });
      toast.success('Merci ! Votre suggestion a été envoyée à notre équipe.');
      setShowSuggestModal(false);
      setSuggestion('');
      setSuggestName('');
      setSuggestPhone('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setSuggestSubmitting(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (viewMode === 'products') loadProducts();
    else loadShops();
  }, [searchQuery, selectedProductType, sortBy, viewMode]);

  // Debounced search query logging (admin visibility)
  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (q.length < 2) return;
    const customer = (() => {
      try { return JSON.parse(localStorage.getItem('customer') || 'null'); } catch { return null; }
    })();
    const timer = setTimeout(() => {
      axios.post(`${API}/makiti/search-log`, {
        query: q,
        results_count: viewMode === 'products' ? products.length : shops.length,
        customer_id: customer?.id || null,
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Exit-intent detection — show "suggest a product" modal once per session
  useEffect(() => {
    if (sessionStorage.getItem('makiti_exit_modal_shown')) return;

    let timeoutId;
    const handleMouseLeave = (e) => {
      // Trigger only when the cursor exits via the top edge (likely about to close tab / change URL)
      if (e.clientY <= 0 && !sessionStorage.getItem('makiti_exit_modal_shown')) {
        sessionStorage.setItem('makiti_exit_modal_shown', '1');
        setShowSuggestModal(true);
      }
    };
    // Mobile fallback: show after 60s on page if not shown yet
    timeoutId = setTimeout(() => {
      if (!sessionStorage.getItem('makiti_exit_modal_shown')) {
        sessionStorage.setItem('makiti_exit_modal_shown', '1');
        setShowSuggestModal(true);
      }
    }, 60000);

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timeoutId);
    };
  }, []);

  // Carousel auto-advance
  useEffect(() => {
    slideInterval.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(slideInterval.current);
  }, []);

  // Countdown timer — counts down to real offer expiration date
  useEffect(() => {
    if (!offerExpiration) return;
    const target = new Date(offerExpiration);
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offerExpiration]);

  // Auto-scroll offers carousel
  useEffect(() => {
    const el = offersScrollRef.current;
    if (!el || limitedOffers.length === 0) return;
    let scrollPos = 0;
    const speed = 1; // px per frame
    let paused = false;
    let raf;
    const step = () => {
      if (!paused && el) {
        scrollPos += speed;
        if (scrollPos >= el.scrollWidth - el.clientWidth) {
          scrollPos = 0;
        }
        el.scrollLeft = scrollPos;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const pause = () => { paused = true; };
    const resume = () => { paused = false; scrollPos = el.scrollLeft; };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause);
    el.addEventListener('touchend', resume);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
    };
  }, [limitedOffers]);

  const goToSlide = (idx) => {
    setCurrentSlide(idx);
    clearInterval(slideInterval.current);
    slideInterval.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
  };

  const loadData = async () => {
    try {
      const [catRes, prodRes, shopRes, offersRes] = await Promise.all([
        axios.get(`${API}/product-categories`),
        axios.get(`${API}/marketplace/products`),
        axios.get(`${API}/marketplace/shops`),
        axios.get(`${API}/marketplace/limited-offers`).catch(() => ({ data: { offers: [], is_active: false } })),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
      setShops(shopRes.data);
      if (offersRes.data.is_active && offersRes.data.offers?.length > 0) {
        setLimitedOffers(offersRes.data.offers);
        setOffersActive(true);
        setOfferExpiration(offersRes.data.expiration_date);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy) params.append('sort_by', sortBy);
      const customer = (() => {
        try { return JSON.parse(localStorage.getItem('customer') || 'null'); } catch { return null; }
      })();
      if (customer?.id) params.append('customer_id', customer.id);
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

  const formatPrice = (p) => new Intl.NumberFormat('fr-FR').format(p || 0);

  const toggleWishlist = (id, e) => {
    e.stopPropagation();
    setWishlist(prev => {
      const isAdding = !prev.includes(id);
      const next = isAdding ? [...prev, id] : prev.filter(x => x !== id);
      localStorage.setItem('makiti_wishlist', JSON.stringify(next));
      // Track favorite for popularity score (fire & forget)
      const customer = (() => {
        try { return JSON.parse(localStorage.getItem('customer') || 'null'); } catch { return null; }
      })();
      axios.post(`${API}/makiti/favorite-toggle`, {
        product_id: id,
        action: isAdding ? 'add' : 'remove',
        customer_id: customer?.id || null,
      }).catch(() => {});
      return next;
    });
  };

  // Filtering logic
  const baseFiltered = selectedProductType
    ? products.filter(p => p.product_type === selectedProductType)
    : products;

  const filteredProducts = offerFilter
    ? baseFiltered.filter(p => {
        const pt = (p.product_type || '').toLowerCase();
        return pt === offerFilter.toLowerCase() || (p.name || '').toLowerCase().includes(offerFilter.toLowerCase());
      })
    : baseFiltered;

  const slide = HERO_SLIDES[currentSlide];
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="min-h-screen bg-white">
      {/* ──────── HEADER ──────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <span className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight">ServicePro</span>
            <span className="text-sm text-orange-500 font-semibold -ml-0.5">Makiti</span>
          </div>

          <nav className="hidden md:flex items-center gap-5 ml-3">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Accueil</button>
            <button onClick={() => navigate('/browse')} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Professionnels</button>
            <button onClick={() => navigate('/rentals')} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Locations</button>
          </nav>

          {/* Desktop search */}
          <div className="flex-1 max-w-md mx-auto hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                data-testid="marketplace-search"
                className="pl-10 h-9 text-sm bg-gray-50 border-gray-200 rounded-full focus:ring-orange-400"
                placeholder="Rechercher un produit ou une boutique..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isCustomerAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={() => navigate('/customer/auth')} data-testid="marketplace-login-btn" className="text-sm font-medium">
                Se connecter
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')} className="text-sm">Mon Dashboard</Button>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              data-testid="marketplace-search-mobile"
              className="pl-10 h-9 text-sm bg-gray-50 border-gray-200 rounded-full"
              placeholder="Rechercher un produit ou une boutique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* ──────── HERO CAROUSEL ──────── */}
      <section className="relative" data-testid="hero-carousel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 rounded-2xl sm:rounded-3xl mt-4 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center min-h-[260px] sm:min-h-[340px] lg:min-h-[400px]">
              {/* Text */}
              <div className="flex-1 px-6 sm:px-10 lg:px-14 py-8 sm:py-10 z-10 relative">
                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900 leading-tight" key={currentSlide}>
                  {slide.title}
                </h1>
                <p className="text-gray-700/70 text-sm sm:text-base mt-3 sm:mt-4 max-w-md leading-relaxed">
                  {slide.subtitle}
                </p>
                <button
                  onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-5 sm:mt-7 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-colors"
                  data-testid="hero-cta-btn"
                >
                  {slide.cta}
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>
              {/* Image */}
              <div className="hidden md:block flex-1 relative self-stretch">
                <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover object-top" key={`img-${currentSlide}`} />
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/80 via-orange-400/30 to-transparent" />
              </div>
            </div>
            {/* Dots */}
            <div className="flex items-center justify-center gap-2 pb-4 relative z-10">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`transition-all rounded-full ${idx === currentSlide ? 'w-8 h-2.5 bg-orange-700' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/70'}`}
                  data-testid={`carousel-dot-${idx}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────── OFFRES A DUREE LIMITEE ──────── */}
      {offersActive && limitedOffers.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10" data-testid="limited-offers-section">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 shrink-0">Offres à durée limitée</h2>

          {/* Countdown timer pill */}
          {offerExpiration && (
          <div className="flex items-center gap-1.5 border border-orange-300 rounded-full px-4 py-1.5 text-orange-600 text-sm font-medium shrink-0">
            <Clock className="h-3.5 w-3.5" />
            <span>Expire dans:</span>
            <span className="font-bold tabular-nums">{countdown.d}j : {pad(countdown.h)}h : {pad(countdown.m)}m : {pad(countdown.s)}s</span>
          </div>
          )}
        </div>

        {/* Limited-offer product row (auto-scrolling carousel) */}
        <div
          ref={offersScrollRef}
          className="flex gap-4 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {limitedOffers.map(offer => {
            const product = offer.product;
            if (!product) return null;
            const discountedPrice = Math.round(product.price * (1 - offer.discount_percent / 100));
            return (
              <div
                key={`offer-${offer.id}`}
                className="shrink-0 w-[220px] sm:w-[260px] group cursor-pointer"
                onClick={() => navigate(`/makiti/product/${product.id}`)}
                data-testid={`offer-card-${offer.id}`}
              >
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                  {product.photos?.length > 0 ? (
                    <img src={getImageUrl(product.photos[0])} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-gray-300" /></div>
                  )}
                  {/* Discount badge - only show if discount > 0 */}
                  {offer.discount_percent > 0 && (
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-sm font-bold px-2.5 py-1 rounded-lg shadow-sm">
                      -{offer.discount_percent}%
                    </span>
                  )}
                  {/* Heart */}
                  <button
                    onClick={(e) => toggleWishlist(product.id, e)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center hover:bg-white transition-colors"
                    data-testid={`wishlist-offer-${product.id}`}
                  >
                    <Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                  </button>
                </div>
                <div className="mt-2.5 px-0.5">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{product.shop_name}</p>
                  {offer.discount_percent > 0 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-400 text-xs line-through">{formatPrice(product.price)} {product.currency || 'GNF'}</span>
                      <span className="text-red-600 font-bold text-sm">{formatPrice(discountedPrice)} {product.currency || 'GNF'}</span>
                    </div>
                  ) : (
                    <p className="text-orange-600 font-bold text-sm mt-1">
                      {product.price_on_request
                        ? <span className="text-blue-600 italic text-xs">Prix sur demande</span>
                        : <>{formatPrice(product.price)} {product.currency || 'GNF'}</>
                      }
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* ──────── ACHETER PAR CATEGORIE ──────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10" data-testid="category-section">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Acheter par catégorie</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => catScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
              data-testid="cat-scroll-left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => catScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
              className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white hover:bg-orange-600 transition-colors"
              data-testid="cat-scroll-right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          ref={catScrollRef}
          className="flex gap-5 sm:gap-8 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {/* "Tout" category */}
          <button
            onClick={() => setSelectedProductType('')}
            className="flex flex-col items-center gap-2 shrink-0 group"
            data-testid="category-all"
          >
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 transition-all ${
              selectedProductType === '' ? 'border-orange-500 shadow-lg shadow-orange-200' : 'border-gray-200 group-hover:border-orange-300'
            }`}>
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            </div>
            <span className={`text-xs sm:text-sm font-medium ${selectedProductType === '' ? 'text-orange-600' : 'text-gray-700'}`}>Tout</span>
          </button>
          {PRODUCT_TYPE_OPTIONS.map(cat => {
            const isActive = selectedProductType === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedProductType(isActive ? '' : cat.value)}
                className="flex flex-col items-center gap-2 shrink-0 group"
                data-testid={`category-${cat.value}`}
              >
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 transition-all ${
                  isActive ? 'border-orange-500 shadow-lg shadow-orange-200' : 'border-gray-200 group-hover:border-orange-300'
                }`}>
                  <img src={cat.image} alt={cat.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className={`text-xs sm:text-sm font-medium ${isActive ? 'text-orange-600' : 'text-gray-700'}`}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ──────── MAIN CONTENT ──────── */}
      <div className="max-w-7xl mx-auto px-4 py-6" id="products-section">
        {/* Toggle + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            <Button data-testid="view-products-btn" variant={viewMode === 'products' ? 'default' : 'outline'} size="sm"
              onClick={() => setViewMode('products')} className={viewMode === 'products' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
              <Package className="h-4 w-4 mr-1" /> Produits ({filteredProducts.length})
            </Button>
            <Button data-testid="view-shops-btn" variant={viewMode === 'shops' ? 'default' : 'outline'} size="sm"
              onClick={() => setViewMode('shops')} className={viewMode === 'shops' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
              <Store className="h-4 w-4 mr-1" /> Boutiques ({shops.length})
            </Button>
          </div>
          {viewMode === 'products' && (
            <select data-testid="sort-filter" className="px-3 py-2 border rounded-lg text-sm bg-white" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="smart">Pour vous</option>
              <option value="popular">Populaires</option>
              <option value="recent">Plus récents</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          )}
        </div>

        {loading && <div className="text-center py-16 text-gray-500">Chargement...</div>}

        {/* ── Products Grid ── */}
        {!loading && viewMode === 'products' && (
          filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">Aucun produit disponible</h3>
              <p className="text-gray-400 mt-2">Les vendeurs ajoutent bientôt leurs produits</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/makiti/product/${product.id}`)}
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                    {product.photos?.length > 0 ? (
                      <img src={getImageUrl(product.photos[0])} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-12 w-12 text-gray-300" /></div>
                    )}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                      {(() => {
                        try {
                          const created = new Date(product.created_at);
                          const ageDays = (Date.now() - created.getTime()) / 86400000;
                          if (ageDays <= 7) {
                            return (
                              <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1" data-testid={`new-badge-${product.id}`}>
                                <Sparkles className="h-3 w-3" /> Nouveau
                              </span>
                            );
                          }
                        } catch {}
                        return null;
                      })()}
                      {product.is_negotiable && (
                        <span className="bg-orange-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm">Négociable</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                      data-testid={`wishlist-grid-${product.id}`}
                    >
                      <Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                    </button>
                  </div>
                  <div className="mt-2.5 px-0.5">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{product.shop_name}</p>
                    <p className="text-orange-600 font-bold mt-1.5">
                      {product.price_on_request
                        ? <span className="text-blue-600 italic text-sm">Prix sur demande</span>
                        : <>{formatPrice(product.price)} {product.currency || 'GNF'}</>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Shops Grid ── */}
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
                <Card key={shop.id} data-testid={`shop-card-${shop.id}`}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/makiti/shop/${shop.id}`)}>
                  <div className="h-32 bg-gradient-to-br from-orange-400 to-yellow-300 relative">
                    {shop.banner && <img src={getImageUrl(shop.banner)} alt="" className="w-full h-full object-cover" />}
                    <div className="absolute -bottom-6 left-4">
                      <div className="h-14 w-14 rounded-xl bg-white shadow-md flex items-center justify-center overflow-hidden border-2 border-white">
                        {shop.logo ? <img src={getImageUrl(shop.logo)} alt={shop.name} className="w-full h-full object-cover" /> : <Store className="h-7 w-7 text-orange-500" />}
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
                        <Package className="h-3 w-3" /><span>{shop.total_products || 0} produits</span>
                      </div>
                      {shop.location && (
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <MapPin className="h-3 w-3" /><span>{shop.location}</span>
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

      {/* Product Suggestion Modal (Exit Intent) */}
      <Dialog open={showSuggestModal} onOpenChange={setShowSuggestModal}>
        <DialogContent className="sm:max-w-lg" data-testid="suggest-product-modal">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-orange-100 shadow-lg shadow-orange-500/30 bg-gradient-to-br from-orange-100 to-amber-100">
                  <img
                    src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&q=80&crop=faces"
                    alt="Assistant Makiti souriant"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-md">
                  <Smile className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <DialogTitle className="text-xl">Vous cherchez un produit ?</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600">
              Dites-nous ce que vous aimeriez trouver sur Makiti et notre équipe travaillera à le rendre disponible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Quel produit recherchez-vous ? *</label>
              <Textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Ex: Lave-linge automatique 8kg, smartphone reconditionné, vélo électrique..."
                rows={3}
                className="resize-none"
                data-testid="suggest-text-input"
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-400 mt-1">{suggestion.length}/500</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Votre nom *</label>
                <Input
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder="Pour vous recontacter"
                  data-testid="suggest-name-input"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Téléphone *</label>
                <Input
                  value={suggestPhone}
                  onChange={(e) => setSuggestPhone(e.target.value)}
                  onBlur={(e) => setSuggestPhone(formatGuineanPhone(e.target.value))}
                  placeholder="+224..."
                  type="tel"
                  data-testid="suggest-phone-input"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSuggestModal(false)}
                className="flex-1"
                data-testid="suggest-cancel-btn"
              >
                Non merci
              </Button>
              <Button
                onClick={submitSuggestion}
                disabled={suggestSubmitting || suggestion.trim().length < 3 || !suggestName.trim() || !suggestPhone.trim()}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                data-testid="suggest-submit-btn"
              >
                {suggestSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Envoyer ma suggestion</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketplace;
