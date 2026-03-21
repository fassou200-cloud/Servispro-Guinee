import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Store, Phone, MapPin, Tag, MessageCircle, Check, Package, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactForm, setContactForm] = useState({ sender_name: '', sender_phone: '', message: '' });

  useEffect(() => {
    fetchProduct();
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
    } catch (err) {
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  if (!product) return <div className="flex items-center justify-center min-h-screen">Produit non trouvé</div>;

  const photos = product.photos || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
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
              <span data-testid="product-price" className="text-3xl font-bold text-orange-600">{formatPrice(product.price)} GNF</span>
              {product.is_negotiable && (
                <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">Négociable</span>
              )}
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

            {/* Shop Info */}
            {product.shop && (
              <Card className="p-4 mt-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/marketplace/shop/${product.shop.id}`)}>
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
              onClick={() => setShowContactForm(!showContactForm)}
            >
              <MessageCircle className="h-5 w-5" />
              Contacter le vendeur
            </Button>

            {product.shop?.contact_phone && (
              <a
                href={`tel:${product.shop.contact_phone}`}
                className="flex items-center justify-center gap-2 mt-3 text-green-600 font-medium hover:underline"
              >
                <Phone className="h-4 w-4" /> {product.shop.contact_phone}
              </a>
            )}

            {/* Contact Form Modal */}
            {showContactForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowContactForm(false)}>
                <Card data-testid="contact-form" className="w-full max-w-md p-6 bg-white relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
                    onClick={() => setShowContactForm(false)}
                  >
                    &times;
                  </button>
                  <h3 className="font-semibold text-gray-900 text-lg mb-4">Envoyer un message au vendeur</h3>
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <Input
                      data-testid="contact-name"
                      placeholder="Votre nom"
                      value={contactForm.sender_name}
                      onChange={(e) => setContactForm({...contactForm, sender_name: e.target.value})}
                      required
                    />
                    <Input
                      data-testid="contact-phone"
                      placeholder="Votre numéro de téléphone"
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
                      className="w-full bg-green-500 hover:bg-green-600"
                      disabled={sending}
                    >
                      {sending ? 'Envoi...' : 'Envoyer le message'}
                    </Button>
                  </form>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
