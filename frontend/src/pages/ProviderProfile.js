import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, ShieldCheck, Briefcase, Phone, Home, Building, Star, 
  MapPin, Clock, CheckCircle, MessageCircle, Calendar, User,
  Truck, Settings, Wrench, Droplet, Hammer, Flame, MoreHorizontal,
  ChevronRight, Award, ThumbsUp
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import ServiceRequestForm from '@/components/ServiceRequestForm';
import ReviewForm from '@/components/ReviewForm';
import ReviewsList from '@/components/ReviewsList';
import InvestigationFeePopup from '@/components/InvestigationFeePopup';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const translateProfession = (profession) => {
  const translations = {
    'Logisticien': 'Logisticien',
    'Electromecanicien': 'Électromécanicien',
    'Mecanicien': 'Mécanicien',
    'Plombier': 'Plombier',
    'Macon': 'Maçon',
    'Menuisier': 'Menuisier',
    'AgentImmobilier': 'Agent Immobilier',
    'Soudeur': 'Soudeur',
    'Autres': 'Autres Métiers',
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Logistics': 'Logistique',
    'Other': 'Autres'
  };
  return translations[profession] || profession;
};

const categoryIcons = {
  'Logisticien': Truck,
  'Electromecanicien': Settings,
  'Mecanicien': Wrench,
  'Plombier': Droplet,
  'Macon': Hammer,
  'Menuisier': Hammer,
  'AgentImmobilier': Building,
  'Soudeur': Flame,
  'Autres': MoreHorizontal
};

const categoryColors = {
  'Logisticien': 'from-blue-500 to-blue-600',
  'Electromecanicien': 'from-purple-500 to-purple-600',
  'Mecanicien': 'from-orange-500 to-orange-600',
  'Plombier': 'from-cyan-500 to-cyan-600',
  'Macon': 'from-amber-500 to-amber-600',
  'Menuisier': 'from-yellow-500 to-yellow-600',
  'AgentImmobilier': 'from-emerald-500 to-emerald-600',
  'Soudeur': 'from-red-500 to-red-600',
  'Autres': 'from-gray-500 to-gray-600'
};

const ProviderProfile = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [refreshReviews, setRefreshReviews] = useState(0);
  const [customer, setCustomer] = useState(null);
  const [reviewStats, setReviewStats] = useState(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    fetchProvider();
    fetchReviewStats();
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
  }, [providerId]);

  const fetchProvider = async () => {
    try {
      const response = await axios.get(`${API}/providers/${providerId}`);
      setProvider(response.data);
    } catch (error) {
      toast.error('Échec du chargement du profil');
      navigate('/browse');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const response = await axios.get(`${API}/reviews/${providerId}/stats`);
      setReviewStats(response.data);
    } catch (error) {
      console.error('Failed to fetch review stats');
    }
  };

  const handleRequestService = () => {
    if (provider?.profession === 'AgentImmobilier') {
      navigate('/rentals');
      return;
    }
    
    if (!provider?.online_status) {
      toast.error('Ce prestataire est actuellement indisponible');
      return;
    }
    
    if (!isCustomerAuthenticated && !localStorage.getItem('customerToken')) {
      toast.error('Veuillez vous connecter pour demander un service');
      navigate('/customer/auth');
      return;
    }

    // Check if provider has investigation fee and payment not yet completed
    if (provider?.investigation_fee && provider.investigation_fee > 0 && !paymentCompleted) {
      setShowPaymentPopup(true);
      return;
    }
    
    setShowRequestForm(!showRequestForm);
  };

  const handlePaymentSuccess = () => {
    setPaymentCompleted(true);
    setShowPaymentPopup(false);
    setShowRequestForm(true);
    toast.success('Paiement réussi ! Vous pouvez maintenant envoyer votre demande.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) return null;

  const Icon = categoryIcons[provider.profession] || MoreHorizontal;
  const colorClass = categoryColors[provider.profession] || 'from-gray-500 to-gray-600';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/browse')}
              className="gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Accueil
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {/* Profile Hero */}
        <Card className="overflow-hidden rounded-3xl border-0 shadow-xl mb-8">
          {/* Header Gradient */}
          <div className={`h-40 md:h-48 bg-gradient-to-r ${colorClass} relative`}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl" />
            </div>
            
            {/* Status Badge */}
            <div className="absolute top-6 right-6">
              {provider.online_status ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  En ligne
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm text-white/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  Hors ligne
                </span>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="relative px-6 md:px-10 pb-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 md:-mt-20">
              {/* Avatar */}
              <Avatar className="h-32 w-32 md:h-40 md:w-40 ring-4 ring-white shadow-2xl">
                <AvatarImage
                  src={provider.profile_picture ? `${BACKEND_URL}${provider.profile_picture}` : undefined}
                  alt={`${provider.first_name} ${provider.last_name}`}
                />
                <AvatarFallback className="text-4xl md:text-5xl font-bold bg-white text-gray-700">
                  {provider.first_name[0]}{provider.last_name[0]}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 pt-4 md:pt-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900">
                    {provider.first_name} {provider.last_name}
                  </h1>
                  {provider.id_verification_picture && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                      <ShieldCheck className="h-4 w-4" />
                      Vérifié
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-medium">{translateProfession(provider.profession)}</span>
                </div>

                {/* Rating */}
                {reviewStats?.total_reviews > 0 && (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-5 w-5 ${i < Math.round(reviewStats.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-xl font-bold text-gray-900">{reviewStats.average_rating}</span>
                    </div>
                    <span className="text-gray-500">({reviewStats.total_reviews} avis)</span>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-3">
                  {provider.profession !== 'AgentImmobilier' && provider.price && (
                    <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-amber-700 text-sm">Tarif: </span>
                      <span className="font-bold text-amber-900">{Number(provider.price).toLocaleString('fr-FR')} GNF</span>
                    </div>
                  )}
                  {provider.profession !== 'AgentImmobilier' && provider.investigation_fee && (
                    <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-amber-700 text-sm">Tarif d'investigation: </span>
                      <span className="font-bold text-amber-900">{Number(provider.investigation_fee).toLocaleString('fr-FR')} GNF</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              <div className="md:ml-auto">
                {provider.profession === 'AgentImmobilier' ? (
                  <Button
                    size="lg"
                    onClick={() => navigate('/rentals')}
                    className="w-full md:w-auto h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-xl shadow-emerald-500/30 font-bold text-lg"
                  >
                    <Building className="h-5 w-5 mr-2" />
                    Voir les Locations
                  </Button>
                ) : provider.online_status ? (
                  <Button
                    size="lg"
                    onClick={handleRequestService}
                    className="w-full md:w-auto h-14 px-8 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-xl shadow-green-500/30 font-bold text-lg"
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    {showRequestForm ? 'Masquer' : 'Demander un Service'}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    disabled
                    className="w-full md:w-auto h-14 px-8 rounded-2xl font-bold text-lg"
                  >
                    <Clock className="h-5 w-5 mr-2" />
                    Indisponible
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Service Request Form */}
        {showRequestForm && provider.profession !== 'AgentImmobilier' && provider.online_status && (
          <Card className="rounded-3xl border-0 shadow-xl mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6">
              <h3 className="text-2xl font-heading font-bold text-white flex items-center gap-3">
                <MessageCircle className="h-6 w-6" />
                Demander un Service
              </h3>
              <p className="text-green-100 mt-1">Décrivez votre besoin et envoyez votre demande</p>
            </div>
            <div className="p-8">
              <ServiceRequestForm
                providerId={provider.id}
                providerName={`${provider.first_name} ${provider.last_name}`}
                onSuccess={() => {
                  setShowRequestForm(false);
                  toast.success('Demande de service envoyée avec succès !');
                }}
              />
            </div>
          </Card>
        )}

        {/* About Section */}
        {provider.about_me && (
          <Card className="rounded-3xl border-0 shadow-lg mb-8 p-8">
            <h3 className="text-xl font-heading font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              À Propos
            </h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {provider.about_me}
            </p>
          </Card>
        )}

        {/* Reviews Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Reviews Stats */}
          {reviewStats?.total_reviews > 0 && (
            <Card className="rounded-3xl border-0 shadow-lg p-8 lg:col-span-1">
              <h3 className="text-xl font-heading font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Évaluations
              </h3>
              
              <div className="text-center mb-6">
                <p className="text-5xl font-bold text-gray-900">{reviewStats.average_rating}</p>
                <div className="flex justify-center gap-1 my-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-6 w-6 ${i < Math.round(reviewStats.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <p className="text-gray-500">{reviewStats.total_reviews} avis</p>
              </div>

              {/* Rating Breakdown */}
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = reviewStats.rating_breakdown?.[rating] || 0;
                  const percentage = reviewStats.total_reviews > 0 ? (count / reviewStats.total_reviews) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-3">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Reviews List */}
          <div className={reviewStats?.total_reviews > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Card className="rounded-3xl border-0 shadow-lg p-8">
              <h3 className="text-xl font-heading font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-blue-500" />
                Avis des Clients
              </h3>
              <ReviewsList providerId={providerId} refreshTrigger={refreshReviews} />
            </Card>
          </div>
        </div>

        {/* Leave Review */}
        {customer && (
          <Card className="rounded-3xl border-0 shadow-lg mt-8 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
              <h3 className="text-2xl font-heading font-bold text-white flex items-center gap-3">
                <Star className="h-6 w-6" />
                Laisser un Avis
              </h3>
              <p className="text-blue-100 mt-1">Partagez votre expérience avec ce prestataire</p>
            </div>
            <div className="p-8">
              <ReviewForm
                providerId={providerId}
                onSuccess={() => {
                  setRefreshReviews(prev => prev + 1);
                  fetchReviewStats();
                }}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Investigation Fee Payment Popup */}
      <InvestigationFeePopup
        isOpen={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
        provider={provider}
        onPaymentSuccess={handlePaymentSuccess}
        customerName={customer ? `${customer.first_name} ${customer.last_name}` : ''}
        customerPhone={customer?.phone_number || ''}
      />
    </div>
  );
};

export default ProviderProfile;
