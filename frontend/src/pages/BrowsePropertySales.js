import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Search, MapPin, Home, Building, Bed, Bath, Square, 
  Phone, MessageCircle, ChevronRight, Filter, X
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
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

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

  const handleInquiry = (property) => {
    setSelectedProperty(property);
    setShowInquiryModal(true);
  };

  const submitInquiry = async (e) => {
    e.preventDefault();
    if (!inquiryForm.name || !inquiryForm.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmittingInquiry(true);
    try {
      await axios.post(`${API}/property-sales/${selectedProperty.id}/inquiries`, {
        name: inquiryForm.name,
        phone: inquiryForm.phone,
        message: inquiryForm.message || 'Intéressé par cette propriété'
      });
      toast.success('Votre demande a été envoyée avec succès !');
      setShowInquiryModal(false);
      setInquiryForm({ name: '', phone: '', message: '' });
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la demande');
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
    return new Intl.NumberFormat('fr-GN').format(price);
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
                    {formatPrice(property.price)} GNF
                  </div>
                  {/* Property Type */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                    {translatePropertyType(property.property_type)}
                  </div>
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
                        <span>{property.bedrooms}</span>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span>{property.bathrooms}</span>
                      </div>
                    )}
                    {property.area && (
                      <div className="flex items-center gap-1">
                        <Square className="h-4 w-4" />
                        <span>{property.area} m²</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button 
                    onClick={() => handleInquiry(property)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contacter le vendeur
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Inquiry Modal */}
      {showInquiryModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Contacter le vendeur</h3>
              <button 
                onClick={() => setShowInquiryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Property Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-gray-900">{selectedProperty.title}</h4>
              <p className="text-sm text-gray-500">{selectedProperty.location}</p>
              <p className="text-emerald-600 font-bold mt-1">{formatPrice(selectedProperty.price)} GNF</p>
            </div>

            <form onSubmit={submitInquiry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre nom *
                </label>
                <Input
                  type="text"
                  value={inquiryForm.name}
                  onChange={(e) => setInquiryForm({...inquiryForm, name: e.target.value})}
                  placeholder="Entrez votre nom"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre téléphone *
                </label>
                <Input
                  type="tel"
                  value={inquiryForm.phone}
                  onChange={(e) => setInquiryForm({...inquiryForm, phone: e.target.value})}
                  placeholder="Ex: 620 00 00 00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optionnel)
                </label>
                <textarea
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                  placeholder="Votre message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
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
                  {submittingInquiry ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowsePropertySales;
