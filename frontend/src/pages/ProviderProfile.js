import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, ShieldCheck, Briefcase, Phone, Home, Building, Star, 
  MapPin, Clock, CheckCircle, MessageCircle, Calendar, User,
  Truck, Settings, Wrench, Droplet, Hammer, Flame, MoreHorizontal,
  ChevronRight, Award, ThumbsUp, FileText, ExternalLink, Trash2, Plus, Upload, Loader2, Pencil
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import ServiceRequestForm from '@/components/ServiceRequestForm';
import ReviewsList from '@/components/ReviewsList';
import InvestigationFeePopup from '@/components/InvestigationFeePopup';
import ServiceFeesDisplay from '@/components/ServiceFeesDisplay';
import ProviderProfileEdit from '@/components/ProviderProfileEdit';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const translateProfession = (profession, customProfession = null) => {
  // If profession is "Autres" and custom_profession is provided, use it
  if (profession === 'Autres' && customProfession) {
    return customProfession;
  }
  
  const translations = {
    'Electromecanicien': 'Électromécanicien',
    'Mecanicien': 'Mécanicien',
    'Plombier': 'Plombier',
    'Macon': 'Maçon',
    'Menuisier': 'Menuisier',
    'AgentImmobilier': 'Propriétaire immobilier',
    'Soudeur': 'Soudeur',
    'Autres': 'Autres Métiers',
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Other': 'Autres'
  };
  return translations[profession] || profession;
};

const categoryIcons = {
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
  const [serviceFees, setServiceFees] = useState(null);
  
  // Check if current user is the owner of this profile (provider viewing their own profile)
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Document management states
  const [deletingDocIndex, setDeletingDocIndex] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);
  
  // Profile edit modal state
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    fetchProvider();
    fetchReviewStats();
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
    
    // Check if provider is viewing their own profile
    const storedProvider = localStorage.getItem('provider');
    if (storedProvider) {
      const providerData = JSON.parse(storedProvider);
      setIsOwnProfile(providerData.id === providerId);
    }
  }, [providerId]);

  // Fetch service fees when provider is loaded - synced with admin settings
  useEffect(() => {
    if (provider?.profession) {
      axios.get(`${API}/service-fees/${provider.profession}`)
        .then(res => setServiceFees(res.data))
        .catch(() => setServiceFees({ frais_visite: 0, frais_prestation: 0 }));
    }
  }, [provider?.profession]);

  const fetchProvider = async () => {
    try {
      const response = await axios.get(`${API}/providers/${providerId}`);
      console.log('Provider data:', response.data);
      console.log('Documents:', response.data.documents);
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

  // Document management functions
  const handleDeleteDocument = async (docIndex) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }
    
    setDeletingDocIndex(docIndex);
    try {
      const token = localStorage.getItem('providerToken');
      await axios.delete(`${API}/providers/${providerId}/documents/${docIndex}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setProvider(prev => ({
        ...prev,
        documents: prev.documents.filter((_, idx) => idx !== docIndex)
      }));
      
      toast.success('Document supprimé avec succès');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setDeletingDocIndex(null);
    }
  };

  const handleAddDocument = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }
    
    setUploadingDoc(true);
    try {
      const token = localStorage.getItem('providerToken');
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await axios.post(`${API}/providers/${providerId}/documents`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update local state with the new document
      setProvider(prev => ({
        ...prev,
        documents: [...(prev.documents || []), response.data.document]
      }));
      
      toast.success('Document ajouté avec succès');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du téléchargement');
    } finally {
      setUploadingDoc(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

    // No payment required for service requests - show form directly
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
                  <span className="text-lg font-medium">{translateProfession(provider.profession, provider.custom_profession)}</span>
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

                {/* Service Fees Display - For ALL providers including Agent Immobilier */}
                <div className="mt-4">
                  <ServiceFeesDisplay profession={provider.profession} compact={true} />
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
              
              {/* Edit Profile Button - Only for owner */}
              {isOwnProfile && (
                <div className="md:ml-auto mt-4 md:mt-0">
                  <Button
                    size="lg"
                    onClick={() => setShowEditProfile(true)}
                    className="w-full md:w-auto h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/30 font-bold text-lg"
                    data-testid="edit-profile-btn"
                  >
                    <Pencil className="h-5 w-5 mr-2" />
                    Modifier mon profil
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Provider Details Card - Location, Experience, About */}
        <Card className="rounded-3xl border-0 shadow-lg mb-8 p-8">
          <h3 className="text-xl font-heading font-bold text-gray-900 mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-orange-500" />
            Informations du Prestataire
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Location Info */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Localisation</p>
                  <p className="font-semibold text-gray-900">
                    {provider.location || 'Non spécifiée'}
                  </p>
                  {provider.quartier && (
                    <p className="text-sm text-gray-600">Quartier: {provider.quartier}</p>
                  )}
                </div>
              </div>
              
              {/* Years of Experience */}
              {provider.years_experience && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Award className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Expérience</p>
                    <p className="font-semibold text-gray-900">
                      {provider.years_experience === '0-1' && "Moins d'1 an"}
                      {provider.years_experience === '1-2' && '1 - 2 ans'}
                      {provider.years_experience === '2-5' && '2 - 5 ans'}
                      {provider.years_experience === '5-10' && '5 - 10 ans'}
                      {provider.years_experience === '10-15' && '10 - 15 ans'}
                      {provider.years_experience === '15-20' && '15 - 20 ans'}
                      {provider.years_experience === '20+' && 'Plus de 20 ans'}
                      {!['0-1', '1-2', '2-5', '5-10', '10-15', '15-20', '20+'].includes(provider.years_experience) && provider.years_experience}
                    </p>
                  </div>
                </div>
              )}

              {/* Profession Group - Only visible to the provider themselves */}
              {isOwnProfile && provider.profession_group && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Catégorie</p>
                    <p className="font-semibold text-gray-900">{provider.profession_group}</p>
                  </div>
                </div>
              )}
            </div>

            {/* About Section */}
            <div>
              {provider.about_me ? (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-2 font-medium">À propos</p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {provider.about_me}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-gray-400 italic">Aucune description disponible</p>
                </div>
              )}
            </div>
          </div>

        </Card>

        {/* Documents Section - Only visible to the provider themselves */}
        {isOwnProfile && (
          <Card className="rounded-3xl border-0 shadow-lg mb-8 p-8" data-testid="provider-documents-section">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Mes Certifications & Documents ({provider.documents?.length || 0})
              </h3>
              
              {/* Add Document Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAddDocument}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  id="document-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDoc || (provider.documents?.length || 0) >= 10}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  size="sm"
                >
                  {uploadingDoc ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {provider.documents && provider.documents.length > 0 ? (
              <ul className="list-none m-0 p-0">
                {provider.documents.map((doc, idx) => {
                  const docUrl = `${BACKEND_URL}${doc.path}`;
                  return (
                    <li key={idx} className="mb-3 last:mb-0">
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-800 rounded-xl border border-orange-200 shadow-sm">
                        <div 
                          onClick={() => window.open(docUrl, '_blank')}
                          className="flex items-center gap-4 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                          role="button"
                          tabIndex={0}
                          data-testid={`provider-doc-${idx}`}
                        >
                          <div className="p-3 bg-white rounded-xl shadow-sm flex-shrink-0">
                            <FileText className="h-6 w-6 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-gray-900">{doc.filename || `Document ${idx + 1}`}</p>
                            {doc.uploaded_at && (
                              <p className="text-sm text-orange-600/80">
                                Ajouté le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-orange-600 flex-shrink-0">
                            <span className="text-sm font-medium">Voir</span>
                            <ExternalLink className="h-5 w-5" />
                          </div>
                        </div>
                        
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(idx);
                          }}
                          disabled={deletingDocIndex === idx}
                          className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex-shrink-0"
                          title="Supprimer ce document"
                          data-testid={`delete-doc-${idx}`}
                        >
                          {deletingDocIndex === idx ? (
                            <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5 text-red-600" />
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Upload className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun document téléchargé</p>
                <p className="text-sm text-gray-400 mt-1">Cliquez sur "Ajouter" pour télécharger vos certifications</p>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-4">
              Formats acceptés : PDF, DOC, DOCX, JPG, PNG. Taille max : 10 Mo. Maximum 10 documents.
            </p>
          </Card>
        )}

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
                provider={provider}
                onSuccess={() => {
                  setShowRequestForm(false);
                  toast.success('Demande de service envoyée avec succès !');
                }}
              />
            </div>
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
