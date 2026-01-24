import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Search, MapPin, Home, Building, Bed, Bath, Square, 
  Phone, MessageCircle, X, ChevronLeft, ChevronRight, User, Mail, DollarSign, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BrowsePropertySales = ({ isCustomerAuthenticated }) => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [customer, setCustomer] = useState(null);
  const [inquiryForm, setInquiryForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    message: '',
    budget_range: '',
    financing_type: 'cash'
  });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  useEffect(() => {
    fetchProperties();
    // Load customer info if authenticated
    if (isCustomerAuthenticated) {
      const storedCustomer = localStorage.getItem('customer');
      if (storedCustomer) {
        const customerData = JSON.parse(storedCustomer);
        setCustomer(customerData);
        setInquiryForm(prev => ({
          ...prev,
          customer_name: customerData.full_name || '',
          customer_phone: customerData.phone || '',
          customer_email: customerData.email || ''
        }));
      }
    }
  }, [isCustomerAuthenticated]);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API}/property-sales?approved_only=true`);
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Erreur lors du chargement des propriétés');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    setCurrentImageIndex(0);
    setShowDetailModal(true);
  };

  const handleInquiryClick = () => {
    if (!isCustomerAuthenticated) {
      toast.error('Veuillez vous connecter pour envoyer une demande');
      navigate('/customer/auth');
      return;
    }
    setShowDetailModal(false);
    setShowInquiryModal(true);
  };

  const submitInquiry = async (e) => {
    e.preventDefault();
    
    if (!customer) {
      toast.error('Veuillez vous connecter pour soumettre une demande');
      navigate('/customer/auth');
      return;
    }
    
    if (!inquiryForm.customer_name || !inquiryForm.customer_phone || !inquiryForm.message) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmittingInquiry(true);
    try {
      const customerToken = localStorage.getItem('customerToken');
      await axios.post(`${API}/property-sales/${selectedProperty.id}/inquiries`, {
        property_id: selectedProperty.id,
        customer_name: inquiryForm.customer_name,
        customer_phone: inquiryForm.customer_phone,
        customer_email: inquiryForm.customer_email || null,
        message: inquiryForm.message,
        budget_range: inquiryForm.budget_range || null,
        financing_type: inquiryForm.financing_type || 'cash'
      }, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      
      toast.success('Votre demande a été envoyée ! Vous pouvez suivre son statut dans votre tableau de bord.');
      setShowInquiryModal(false);
      setSelectedProperty(null);
      setInquiryForm({
        customer_name: customer?.full_name || '',
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || '',
        message: '',
        budget_range: '',
        financing_type: 'cash'
      });
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      if (error.response?.status === 401) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        navigate('/customer/auth');
      } else {
        toast.error('Erreur lors de l\'envoi de votre demande. Veuillez réessayer.');
      }
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const filteredProperties = properties.filter(property => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      property.title?.toLowerCase().includes(query) ||
      property.location?.toLowerCase().includes(query) ||
      property.property_type?.toLowerCase().includes(query)
    );
  });

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return 'Prix sur demande';
    return new Intl.NumberFormat('fr-GN').format(price) + ' GNF';
  };

  const translatePropertyType = (type) => {
    const types = {
      'villa': 'Villa',
      'apartment': 'Appartement',
      'house': 'Maison',
      'land': 'Terrain',
      'commercial': 'Commercial',
      'other': 'Autre'
    };
    return types[type] || type;
  };

  const nextImage = () => {
    if (selectedProperty?.photos?.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedProperty.photos.length);
    }
  };

  const prevImage = () => {
    if (selectedProperty?.photos?.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedProperty.photos.length) % selectedProperty.photos.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Accueil
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-xl font-bold text-gray-900">Ventes Immobilières</h1>
            </div>
            
            {/* Search */}
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher une propriété..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>

            {/* Auth Button */}
            {!isCustomerAuthenticated ? (
              <Button onClick={() => navigate('/customer/auth')} className="bg-emerald-600 hover:bg-emerald-700">
                Se connecter
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate('/customer/dashboard')}>
                Mon compte
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredProperties.length} propriété{filteredProperties.length !== 1 ? 's' : ''} disponible{filteredProperties.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length === 0 ? (
          <div className="text-center py-16">
            <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune propriété disponible</h3>
            <p className="text-gray-500">Revenez bientôt pour découvrir nos nouvelles offres</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card 
                key={property.id} 
                onClick={() => handlePropertyClick(property)}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              >
                {/* Property Image */}
                <div className="relative h-48 bg-gray-200">
                  {property.photos && property.photos.length > 0 ? (
                    <img
                      src={`${BACKEND_URL}${property.photos[0]}`}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                      <Home className="h-16 w-16 text-emerald-300" />
                    </div>
                  )}
                  {/* Price Badge */}
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {formatPrice(property.price)}
                  </div>
                  {/* Property Type */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                    {translatePropertyType(property.property_type)}
                  </div>
                  {/* Photos count */}
                  {property.photos?.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs">
                      {property.photos.length} photos
                    </div>
                  )}
                </div>

                {/* Property Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                    {property.title}
                  </h3>
                  
                  {/* Location */}
                  <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{property.location}</span>
                  </div>

                  {/* Features */}
                  <div className="flex items-center gap-4 text-gray-600 text-sm mb-4">
                    {property.bedrooms && (
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span>{property.bedrooms} ch.</span>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span>{property.bathrooms} sdb.</span>
                      </div>
                    )}
                    {property.area && (
                      <div className="flex items-center gap-1">
                        <Square className="h-4 w-4" />
                        <span>{property.area} m²</span>
                      </div>
                    )}
                  </div>

                  {/* Click to view */}
                  <p className="text-emerald-600 text-sm font-medium">
                    Cliquer pour voir les détails →
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Property Detail Modal */}
      {showDetailModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Close Button */}
            <button 
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 z-10 bg-white/90 rounded-full p-2 hover:bg-white"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex flex-col md:flex-row h-full">
              {/* Image Gallery */}
              <div className="md:w-1/2 relative bg-gray-900">
                {selectedProperty.photos && selectedProperty.photos.length > 0 ? (
                  <>
                    <img
                      src={`${BACKEND_URL}${selectedProperty.photos[currentImageIndex]}`}
                      alt={selectedProperty.title}
                      className="w-full h-64 md:h-full object-cover"
                    />
                    {selectedProperty.photos.length > 1 && (
                      <>
                        <button 
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                          {currentImageIndex + 1} / {selectedProperty.photos.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-64 md:h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                    <Home className="h-24 w-24 text-emerald-300" />
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="md:w-1/2 p-6 overflow-y-auto max-h-[60vh] md:max-h-full">
                <div className="mb-4">
                  <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium mb-2">
                    {translatePropertyType(selectedProperty.property_type)}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProperty.title}</h2>
                </div>

                {/* Price */}
                <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-emerald-600 mb-1">Prix de vente</p>
                  <p className="text-3xl font-bold text-emerald-700">{formatPrice(selectedProperty.price)}</p>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="h-5 w-5" />
                  <span>{selectedProperty.location}</span>
                </div>

                {/* Features */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {selectedProperty.bedrooms && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <Bed className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                      <p className="font-bold text-gray-900">{selectedProperty.bedrooms}</p>
                      <p className="text-xs text-gray-500">Chambres</p>
                    </div>
                  )}
                  {selectedProperty.bathrooms && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <Bath className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                      <p className="font-bold text-gray-900">{selectedProperty.bathrooms}</p>
                      <p className="text-xs text-gray-500">Salles de bain</p>
                    </div>
                  )}
                  {selectedProperty.area && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <Square className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                      <p className="font-bold text-gray-900">{selectedProperty.area}</p>
                      <p className="text-xs text-gray-500">m²</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedProperty.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600 text-sm">{selectedProperty.description}</p>
                  </div>
                )}

                {/* Contact Button */}
                <Button 
                  onClick={handleInquiryClick}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12"
                >
                  <MessageCircle className="h-5 w-5" />
                  {isCustomerAuthenticated ? 'Envoyer une demande' : 'Se connecter pour contacter'}
                </Button>

                {!isCustomerAuthenticated && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Vous devez être connecté pour envoyer une demande
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Modal */}
      {showInquiryModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Demande d'achat</h3>
                <button 
                  onClick={() => setShowInquiryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Property Summary */}
              <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-gray-900">{selectedProperty.title}</h4>
                <p className="text-sm text-gray-500">{selectedProperty.location}</p>
                <p className="text-emerald-600 font-bold mt-1">{formatPrice(selectedProperty.price)}</p>
              </div>

              <form onSubmit={submitInquiry} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Votre nom *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      value={inquiryForm.customer_name}
                      onChange={(e) => setInquiryForm({...inquiryForm, customer_name: e.target.value})}
                      placeholder="Entrez votre nom"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Votre téléphone *</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      value={inquiryForm.customer_phone}
                      onChange={(e) => setInquiryForm({...inquiryForm, customer_phone: e.target.value})}
                      placeholder="Ex: 620 00 00 00"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Email (optionnel)</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={inquiryForm.customer_email}
                      onChange={(e) => setInquiryForm({...inquiryForm, customer_email: e.target.value})}
                      placeholder="votre@email.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Votre budget</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      value={inquiryForm.budget_range}
                      onChange={(e) => setInquiryForm({...inquiryForm, budget_range: e.target.value})}
                      placeholder="Ex: 500 000 000 GNF"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Type de financement</Label>
                  <Select 
                    value={inquiryForm.financing_type} 
                    onValueChange={(value) => setInquiryForm({...inquiryForm, financing_type: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Comptant</SelectItem>
                      <SelectItem value="credit">Crédit bancaire</SelectItem>
                      <SelectItem value="installment">Paiement échelonné</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Message *</Label>
                  <Textarea
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                    placeholder="Décrivez votre intérêt pour cette propriété..."
                    className="mt-1"
                    rows={4}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInquiryModal(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingInquiry}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {submittingInquiry ? 'Envoi...' : 'Envoyer la demande'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowsePropertySales;
