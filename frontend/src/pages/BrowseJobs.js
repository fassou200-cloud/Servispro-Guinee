import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Briefcase, MapPin, Building2, Clock, DollarSign, Search, 
  Calendar, Users, ChevronRight, Home, Filter, X
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CONTRACT_TYPES = [
  { value: 'all', label: 'Tous les contrats' },
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Freelance', label: 'Freelance' },
  { value: 'Interim', label: 'Intérim' }
];

const BrowseJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [contractFilter, setContractFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const params = new URLSearchParams();
        if (contractFilter && contractFilter !== 'all') {
          params.append('contract_type', contractFilter);
        }
        if (locationFilter) {
          params.append('location', locationFilter);
        }
        
        const response = await axios.get(`${API}/job-offers?${params.toString()}`);
        setJobs(response.data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [contractFilter, locationFilter]);

  const filteredJobs = jobs.filter(job => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(search) ||
      job.company_name.toLowerCase().includes(search) ||
      job.description.toLowerCase().includes(search) ||
      job.location.toLowerCase().includes(search)
    );
  });

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Salaire non précisé';
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} GNF/mois`;
    if (min) return `À partir de ${min.toLocaleString()} GNF/mois`;
    return `Jusqu'à ${max.toLocaleString()} GNF/mois`;
  };

  const getContractColor = (type) => {
    switch (type) {
      case 'CDI': return 'bg-green-100 text-green-700 border-green-200';
      case 'CDD': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Stage': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Freelance': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Interim': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
                <Home className="h-4 w-4" />
                Accueil
              </Button>
              <h1 className="text-2xl font-heading font-bold text-slate-900">
                Offres d'Emploi
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/company/auth')}>
                <Building2 className="h-4 w-4 mr-2" />
                Espace Entreprise
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-heading font-bold mb-4">
              Trouvez Votre Prochain Emploi
            </h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Découvrez les meilleures opportunités d'emploi en Guinée auprès d'entreprises vérifiées
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-2 shadow-xl flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Rechercher un poste, une entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 pl-12 border-0 bg-slate-50 rounded-xl text-slate-900"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={contractFilter} onValueChange={setContractFilter}>
                  <SelectTrigger className="h-12 border-0 bg-slate-50 rounded-xl">
                    <SelectValue placeholder="Type de contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Input
                  placeholder="Ville..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-12 border-0 bg-slate-50 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white shadow-lg border-0 text-center">
            <p className="text-3xl font-bold text-blue-600">{jobs.length}</p>
            <p className="text-slate-600 text-sm">Offres Actives</p>
          </Card>
          <Card className="p-4 bg-white shadow-lg border-0 text-center">
            <p className="text-3xl font-bold text-green-600">
              {jobs.filter(j => j.contract_type === 'CDI').length}
            </p>
            <p className="text-slate-600 text-sm">CDI</p>
          </Card>
          <Card className="p-4 bg-white shadow-lg border-0 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {jobs.filter(j => j.contract_type === 'Stage').length}
            </p>
            <p className="text-slate-600 text-sm">Stages</p>
          </Card>
          <Card className="p-4 bg-white shadow-lg border-0 text-center">
            <p className="text-3xl font-bold text-amber-600">
              {new Set(jobs.map(j => j.company_id)).size}
            </p>
            <p className="text-slate-600 text-sm">Entreprises</p>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading font-bold text-slate-900">
                {filteredJobs.length} Offre{filteredJobs.length !== 1 ? 's' : ''} Disponible{filteredJobs.length !== 1 ? 's' : ''}
              </h3>
              {(searchTerm || contractFilter !== 'all' || locationFilter) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setContractFilter('all');
                    setLocationFilter('');
                  }}
                  className="text-slate-500"
                >
                  <X className="h-4 w-4 mr-1" />
                  Effacer les filtres
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Chargement des offres...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <Card className="p-12 text-center">
                <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">Aucune offre trouvée</h3>
                <p className="text-slate-500">Essayez de modifier vos critères de recherche</p>
              </Card>
            ) : (
              filteredJobs.map(job => (
                <Card 
                  key={job.id} 
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
                    selectedJob?.id === job.id ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-slate-200'
                  }`}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex gap-4">
                    {/* Company Logo */}
                    <div className="flex-shrink-0">
                      {job.company_logo ? (
                        <img 
                          src={`${BACKEND_URL}${job.company_logo}`}
                          alt={job.company_name}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-heading font-bold text-slate-900 mb-1">
                            {job.title}
                          </h4>
                          <p className="text-blue-600 font-medium">{job.company_name}</p>
                        </div>
                        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${getContractColor(job.contract_type)}`}>
                          {job.contract_type}
                        </span>
                      </div>

                      <p className="text-slate-600 text-sm mt-2 line-clamp-2">{job.description}</p>

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatSalary(job.salary_min, job.salary_max)}
                        </span>
                        {job.deadline && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Calendar className="h-4 w-4" />
                            Expire le {new Date(job.deadline).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0 self-center" />
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Job Detail Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {selectedJob ? (
                <Card className="p-6 border-0 shadow-xl">
                  {/* Company Header */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                    {selectedJob.company_logo ? (
                      <img 
                        src={`${BACKEND_URL}${selectedJob.company_logo}`}
                        alt={selectedJob.company_name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-heading font-bold text-slate-900">
                        {selectedJob.title}
                      </h3>
                      <p className="text-blue-600 font-medium">{selectedJob.company_name}</p>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Type de Contrat</p>
                        <p className="font-medium text-slate-900">{selectedJob.contract_type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Localisation</p>
                        <p className="font-medium text-slate-900">{selectedJob.location}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Salaire</p>
                        <p className="font-medium text-slate-900">
                          {formatSalary(selectedJob.salary_min, selectedJob.salary_max)}
                        </p>
                      </div>
                    </div>

                    {selectedJob.deadline && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Date Limite</p>
                          <p className="font-medium text-slate-900">
                            {new Date(selectedJob.deadline).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h4 className="font-heading font-bold text-slate-900 mb-2">Description</h4>
                    <p className="text-slate-600 text-sm whitespace-pre-line">{selectedJob.description}</p>
                  </div>

                  {/* Requirements */}
                  <div className="mb-6">
                    <h4 className="font-heading font-bold text-slate-900 mb-2">Exigences</h4>
                    <p className="text-slate-600 text-sm whitespace-pre-line">{selectedJob.requirements}</p>
                  </div>

                  {/* Apply Button */}
                  <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold">
                    Postuler Maintenant
                  </Button>

                  <p className="text-xs text-slate-500 text-center mt-3">
                    Publiée le {new Date(selectedJob.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </Card>
              ) : (
                <Card className="p-8 text-center border-0 shadow-lg bg-slate-50">
                  <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-heading font-bold text-slate-700 mb-2">
                    Sélectionnez une offre
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Cliquez sur une offre pour voir les détails
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-heading font-bold mb-4">
            Vous êtes une entreprise ?
          </h3>
          <p className="text-slate-400 mb-8 text-lg">
            Publiez vos offres d'emploi et trouvez les meilleurs talents en Guinée
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/company/auth')}
            className="h-14 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold text-lg"
          >
            <Building2 className="h-5 w-5 mr-2" />
            Créer un Compte Entreprise
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BrowseJobs;
