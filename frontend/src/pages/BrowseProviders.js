import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, ShieldCheck, Star } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Traduction des professions en français
const translateProfession = (profession) => {
  const translations = {
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'Logistics': 'Logistique',
    'Other': 'Autres'
  };
  return translations[profession] || profession;
};

const BrowseProviders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [providerStats, setProviderStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, selectedCategory]);

  const fetchProviders = async () => {
    try {
      const response = await axios.get(`${API}/providers`);
      setProviders(response.data);
      
      // Fetch rating stats for each provider
      const statsPromises = response.data.map(provider => 
        axios.get(`${API}/reviews/${provider.id}/stats`)
          .then(res => ({ id: provider.id, stats: res.data }))
          .catch(() => ({ id: provider.id, stats: { total_reviews: 0, average_rating: 0 } }))
      );
      
      const stats = await Promise.all(statsPromises);
      const statsMap = {};
      stats.forEach(({ id, stats }) => {
        statsMap[id] = stats;
      });
      setProviderStats(statsMap);
    } catch (error) {
      toast.error('Échec du chargement des prestataires');
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    if (selectedCategory === 'All') {
      setFilteredProviders(providers);
    } else {
      setFilteredProviders(providers.filter(p => p.profession === selectedCategory));
    }
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    if (value !== 'All') {
      setSearchParams({ category: value });
    } else {
      setSearchParams({});
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement des prestataires...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                data-testid="back-button"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Accueil
              </Button>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Parcourir les Prestataires
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
            >
              Connexion Prestataire
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Filter Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                Prestataires de Services Disponibles
              </h2>
              <p className="text-muted-foreground">
                {filteredProviders.length} prestataire{filteredProviders.length !== 1 ? 's' : ''} trouvé{filteredProviders.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-full md:w-64">
              <Label htmlFor="category-filter" className="font-heading text-xs uppercase tracking-wide mb-2 block">
                Filtrer par Catégorie
              </Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger data-testid="category-filter" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Toutes les Catégories</SelectItem>
                  <SelectItem value="Electrician">Électricien</SelectItem>
                  <SelectItem value="Mechanic">Mécanicien</SelectItem>
                  <SelectItem value="Plumber">Plombier</SelectItem>
                  <SelectItem value="Logistics">Logistique</SelectItem>
                  <SelectItem value="Other">Autres</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Providers Grid */}
        {filteredProviders.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-lg text-muted-foreground">
              Aucun prestataire trouvé dans cette catégorie.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Card
                key={provider.id}
                className="p-6 hover:border-primary/50 transition-colors duration-300 cursor-pointer"
                data-testid={`provider-card-${provider.id}`}
                onClick={() => navigate(`/provider/${provider.id}`)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={provider.profile_picture ? `${BACKEND_URL}${provider.profile_picture}` : undefined}
                      alt={`${provider.first_name} ${provider.last_name}`}
                    />
                    <AvatarFallback className="text-lg font-heading bg-primary text-primary-foreground">
                      {provider.first_name[0]}{provider.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-heading font-bold text-foreground mb-1">
                      {provider.first_name} {provider.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">{translateProfession(provider.profession)}</p>
                    
                    {/* Rating Display */}
                    {providerStats[provider.id]?.total_reviews > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-foreground">
                            {providerStats[provider.id].average_rating}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({providerStats[provider.id].total_reviews} avis)
                        </span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {provider.online_status && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Disponible
                        </span>
                      )}
                      {provider.id_verification_picture && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                          <ShieldCheck className="h-3 w-3" />
                          Vérifié
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {provider.about_me && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {provider.about_me}
                  </p>
                )}

                <Button
                  className="w-full font-heading"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/provider/${provider.id}`);
                  }}
                >
                  Voir le Profil & Demander un Service
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import { Label } from '@/components/ui/label';

export default BrowseProviders;