import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Store, Phone, MapPin, Tag, MessageCircle, Check, Package, ChevronLeft, ChevronRight, Eye, Star, User } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StarRating = ({ rating, onRate, interactive = false, size = 'h-5 w-5' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        type="button"
        disabled={!interactive}
        onClick={() => interactive && onRate(star)}
        className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
      >
        <Star
          className={`${size} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      </button>
    ))}
  </div>
);

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactForm, setContactForm] = useState({ sender_name: '', sender_phone: '', message: '' });
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    setIsCustomerLoggedIn(!!token);
    fetchProduct();
    fetchReviews();
    // Check if user already contacted this product's seller
    try {
      const contacted = JSON.parse(localStorage.getItem('contacted_products') || '[]');
      if (contacted.includes(productId)) setPhoneRevealed(true);
    } catch {}
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/marketplace/products/${productId}`);
      setProduct(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API}/marketplace/products/${productId}/reviews`);
      setReviews(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!contactForm.sender_name || !contactForm.sender_phone || !contactForm.message) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API}/marketplace/products/${productId}/message`, contactForm);
      toast.success('Message envoyé au vendeur !');
      setShowContactForm(false);
      setContactForm({ sender_name: '', sender_phone: '', message: '' });
      // Reveal seller phone after sending message
      setPhoneRevealed(true);
      try {
        const contacted = JSON.parse(localStorage.getItem('contacted_products') || '[]');
        if (!contacted.includes(productId)) {
          contacted.push(productId);
          localStorage.setItem('contacted_products', JSON.stringify(contacted));
        }
      } catch {}
    } catch (err) {
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (reviewForm.rating === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }
    if (!reviewForm.comment.trim()) {
      toast.error('Veuillez écrire un commentaire');
      return;
    }
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('customerToken');
      await axios.post(`${API}/marketplace/products/${productId}/reviews`, reviewForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Avis publié avec succès !');
      setReviewForm({ rating: 0, comment: '' });
      fetchReviews();
      fetchProduct();
    } catch (err) {
      const msg = err.response?.data?.detail || "Erreur lors de la publication de l'avis";
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0);
  const avgRating = product?.avg_rating || 0;
  const reviewCount = product?.review_count || reviews.length;

  if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  if (!product) return <div className="flex items-center justify-center min-h-screen">Produit non trouvé</div>;

  const photos = product.photos || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Photos */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative">
              {photos.length > 0 ? (
                <img src={getImageUrl(photos[currentPhoto])} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-20 w-20 text-gray-300" />
                </div>
              )}
              {photos.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white"
                    onClick={() => setCurrentPhoto(p => (p - 1 + photos.length) % photos.length)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white"
                    onClick={() => setCurrentPhoto(p => (p + 1) % photos.length)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    className={`h-16 w-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${currentPhoto === idx ? 'border-orange-500' : 'border-transparent'}`}
                    onClick={() => setCurrentPhoto(idx)}
                  >
                    <img src={getImageUrl(photo)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 data-testid="product-name" className="text-2xl font-bold text-gray-900">{product.name}</h1>

            <div className="flex items-center gap-3 mt-3">
              {product.price_on_request ? (
                <span data-testid="product-price" className="text-2xl font-bold text-blue-600 italic">Prix sur demande</span>
              ) : (
                <>
                  <span data-testid="product-price" className="text-3xl font-bold text-orange-600">{formatPrice(product.price)} {product.currency || 'GNF'}</span>
                  {product.is_negotiable && (
                    <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">Négociable</span>
                  )}
                </>
              )}
            </div>

            {/* Rating Summary */}
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={Math.round(avgRating)} size="h-4 w-4" />
              <span className="text-sm text-gray-600 font-medium">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
              <span className="text-sm text-gray-400">({reviewCount} avis)</span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              {product.is_available ? (
                <span className="flex items-center gap-1 text-green-600 text-sm"><Check className="h-4 w-4" /> En stock</span>
              ) : (
                <span className="text-red-500 text-sm">Rupture de stock</span>
              )}
              <span className="text-gray-400 text-sm flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {product.total_views || 0} vues</span>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line">{product.description}</p>
            </div>

            {/* Product Characteristics */}
            {product.characteristics && Object.keys(product.characteristics).length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-2">Caractéristiques</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.characteristics).filter(([, v]) => v).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-medium text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shop Info */}
            {product.shop && (
              <Card className="p-4 mt-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/makiti/shop/${product.shop.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center overflow-hidden">
                    {product.shop.logo ? (
                      <img src={getImageUrl(product.shop.logo)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="h-6 w-6 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{product.shop.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {product.shop.sector && <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {product.shop.sector}</span>}
                      {product.shop.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {product.shop.location}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Contact Button */}
            <Button
              data-testid="contact-seller-btn"
              className="w-full mt-6 bg-green-500 hover:bg-green-600 gap-2 py-6 text-base"
              onClick={() => setShowContactForm(true)}
            >
              <MessageCircle className="h-5 w-5" />
              Contacter le vendeur
            </Button>

            {/* Phone - only revealed after sending a message */}
            {product.shop?.contact_phone && (
              phoneRevealed ? (
                <a
                  href={`tel:${product.shop.contact_phone}`}
                  className="flex items-center justify-center gap-2 mt-3 text-green-600 font-medium hover:underline"
                  data-testid="seller-phone-revealed"
                >
                  <Phone className="h-4 w-4" /> {product.shop.contact_phone}
                </a>
              ) : (
                <p className="flex items-center justify-center gap-2 mt-3 text-gray-400 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>Envoyez un message pour voir le numéro</span>
                </p>
              )
            )}

            {/* Contact Form Popup Modal */}
            {showContactForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowContactForm(false)}>
                <Card
                  data-testid="contact-form"
                  className="w-full sm:max-w-md p-6 bg-white relative rounded-t-2xl sm:rounded-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                    onClick={() => setShowContactForm(false)}
                  >
                    &times;
                  </button>
                  <h3 className="font-semibold text-gray-900 text-lg mb-4">Envoyer un message au vendeur</h3>
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <Input
                      data-testid="contact-name"
                      placeholder="Votre nom *"
                      value={contactForm.sender_name}
                      onChange={(e) => setContactForm({...contactForm, sender_name: e.target.value})}
                      required
                    />
                    <Input
                      data-testid="contact-phone"
                      placeholder="Votre numéro de téléphone *"
                      value={contactForm.sender_phone}
                      onChange={(e) => setContactForm({...contactForm, sender_phone: e.target.value})}
                      required
                    />
                    <Textarea
                      data-testid="contact-message"
                      placeholder={`Bonjour, je suis intéressé par "${product.name}"...`}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      rows={3}
                      required
                    />
                    <Button
                      data-testid="send-message-btn"
                      type="submit"
                      className="w-full bg-green-500 hover:bg-green-600 py-5 text-base"
                      disabled={sending}
                    >
                      {sending ? 'Envoi...' : 'Envoyer le message'}
                    </Button>
                  </form>
                  {!phoneRevealed && (
                    <p className="text-xs text-gray-400 text-center mt-3">Le numéro du vendeur sera visible après votre message</p>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12" data-testid="reviews-section">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            Avis des clients ({reviewCount})
          </h2>

          {/* Add Review Form - only for logged-in customers */}
          {isCustomerLoggedIn ? (
            <Card className="p-5 mb-6 border-orange-100" data-testid="review-form">
              <h3 className="font-semibold text-gray-900 mb-3">Laisser un avis</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Votre note :</p>
                  <StarRating rating={reviewForm.rating} onRate={(r) => setReviewForm({...reviewForm, rating: r})} interactive size="h-7 w-7" />
                </div>
                <Textarea
                  data-testid="review-comment"
                  placeholder="Partagez votre expérience avec ce produit..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                  rows={3}
                  required
                />
                <Button
                  data-testid="submit-review-btn"
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Publication...' : 'Publier mon avis'}
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-5 mb-6 bg-gray-50 text-center">
              <p className="text-gray-600 mb-3">Connectez-vous pour laisser un avis</p>
              <Button variant="outline" onClick={() => navigate('/customer/auth')} data-testid="login-to-review-btn">
                Se connecter
              </Button>
            </Card>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border">
              <Star className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">Aucun avis pour le moment</p>
              <p className="text-gray-400 text-sm">Soyez le premier à donner votre avis !</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <Card key={review.id} className="p-4" data-testid="review-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{review.customer_name}</p>
                        <StarRating rating={review.rating} size="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-3 ml-12">{review.comment}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
