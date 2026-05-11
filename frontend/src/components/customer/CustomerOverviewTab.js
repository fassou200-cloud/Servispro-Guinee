import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Search, Building, CheckCircle, Clock, Briefcase, ChevronRight,
  MapPin, Calendar, Star, Bell
} from 'lucide-react';

const translateProfession = (profession) => {
  const translations = {
    'Electrician': 'Électricien',
    'Mechanic': 'Mécanicien',
    'Plumber': 'Plombier',
    'ElectricienBatiment': 'Électricien bâtiment',
    'Electromecanicien': 'Électromécanicien',
    'Mecanicien': 'Mécanicien',
    'Macon': 'Maçon',
    'Menuisier': 'Menuisier',
    'AgentImmobilier': 'Propriétaire immobilier',
    'Soudeur': 'Soudeur',
    'Other': 'Autres'
  };
  return translations[profession] || profession;
};

const translateStatus = (status) => {
  const translations = {
    'Pending': 'En attente',
    'Accepted': 'Accepté',
    'Rejected': 'Refusé',
    'ProviderCompleted': 'En attente de confirmation',
    'Completed': 'Terminé'
  };
  return translations[status] || status;
};

const getStatusColor = (status) => {
  const colors = {
    'Pending': 'bg-orange-100 text-orange-700 border-orange-200',
    'Accepted': 'bg-blue-100 text-blue-700 border-blue-200',
    'Rejected': 'bg-gray-100 text-gray-600 border-gray-200',
    'ProviderCompleted': 'bg-purple-100 text-purple-700 border-purple-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
};

export const CustomerOverviewTab = ({
  navigate,
  jobs,
  loadingJobs,
  pendingConfirmation,
  pendingJobs,
  inProgressJobs,
  completedJobs,
  handleConfirmComplete,
  handleOpenRating,
}) => {
  return (
    <>
      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card
          className="group p-6 rounded-2xl border-0 shadow-lg bg-white hover:shadow-2xl transition-all cursor-pointer overflow-hidden relative"
          onClick={() => navigate('/browse')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
              <Search className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
              Trouver un Prestataire
            </h3>
            <p className="text-gray-600 mb-4">
              Électriciens, plombiers, mécaniciens et plus encore. Des professionnels vérifiés près de chez vous.
            </p>
            <div className="flex items-center gap-2 text-green-600 font-medium group-hover:gap-3 transition-all">
              Parcourir <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card
          className="group p-6 rounded-2xl border-0 shadow-lg bg-white hover:shadow-2xl transition-all cursor-pointer overflow-hidden relative"
          onClick={() => navigate('/rentals')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform">
              <Building className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
              Locations Immobilières
            </h3>
            <p className="text-gray-600 mb-4">
              Appartements et maisons disponibles à Conakry et partout en Guinée. Courte et longue durée.
            </p>
            <div className="flex items-center gap-2 text-purple-600 font-medium group-hover:gap-3 transition-all">
              Voir les locations <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Confirmations */}
      {pendingConfirmation.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Bell className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-gray-900">Action Requise</h3>
              <p className="text-sm text-gray-500">Services en attente de votre confirmation</p>
            </div>
          </div>

          <div className="space-y-4">
            {pendingConfirmation.map((job) => (
              <Card key={job.id} className="p-6 rounded-2xl border-2 border-purple-200 bg-purple-50/50 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-gray-900">{job.service_type}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
                        {translateStatus(job.status)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Prestataire: <strong>{job.provider_name}</strong> • {translateProfession(job.provider_profession)}
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{job.description}</p>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    )}
                    {job.scheduled_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(job.scheduled_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleConfirmComplete(job.id)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 rounded-xl"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmer le Service Terminé
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Jobs */}
      {pendingJobs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-gray-900">Demandes en Attente</h3>
              <p className="text-sm text-gray-500">{pendingJobs.length} demande(s) en attente de réponse du prestataire</p>
            </div>
          </div>

          <div className="space-y-4">
            {pendingJobs.map((job) => (
              <Card key={job.id} className="p-6 rounded-2xl border-2 border-orange-200 bg-orange-50/50 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-bold text-gray-900">{job.service_type}</h4>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-orange-100 text-orange-700 border-orange-200">
                        En attente
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Prestataire: <strong>{job.provider_name}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-lg">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-700 font-medium">En attente de réponse</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* In Progress Jobs */}
      {inProgressJobs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-gray-900">Services en Cours</h3>
              <p className="text-sm text-gray-500">{inProgressJobs.length} service(s) en cours de réalisation</p>
            </div>
          </div>

          <div className="space-y-4">
            {inProgressJobs.map((job) => (
              <Card key={job.id} className="p-6 rounded-2xl border-2 border-blue-200 bg-blue-50/50 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-bold text-gray-900">{job.service_type}</h4>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-blue-100 text-blue-700 border-blue-200">
                        En cours
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Prestataire: <strong>{job.provider_name}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-lg">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">Travail en cours</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-gray-900">Services Terminés</h3>
              <p className="text-sm text-gray-500">{completedJobs.length} service(s) complété(s) - Notez vos prestataires !</p>
            </div>
          </div>

          <div className="space-y-4">
            {completedJobs.map((job) => (
              <Card key={job.id} className="p-5 rounded-2xl border-2 border-green-200 bg-green-50/30 shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <h4 className="font-bold text-gray-900">{job.service_type}</h4>
                      {job.has_review ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          Noté
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                          À noter
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-1">
                      Prestataire: <strong>{job.provider_name}</strong>
                      {job.provider_profession && ` • ${job.provider_profession}`}
                    </p>
                    <p className="text-gray-500 text-sm mb-2">{job.description}</p>
                    <p className="text-xs text-gray-400">
                      Terminé le {job.completed_at ? new Date(job.completed_at).toLocaleDateString('fr-FR') : new Date(job.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {job.has_review ? (
                      <div className="flex items-center gap-1 px-4 py-2 bg-yellow-100 rounded-xl">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${star <= (job.review_rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleOpenRating(job)}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25 rounded-xl"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Noter le Prestataire
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {jobs.length === 0 && !loadingJobs && (
        <Card className="p-12 rounded-2xl border-0 shadow-lg bg-white text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <Briefcase className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune demande de service</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Vous n'avez pas encore fait de demande de service. Parcourez nos prestataires pour trouver le professionnel idéal.
          </p>
          <Button
            onClick={() => navigate('/browse')}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 rounded-xl"
          >
            <Search className="h-4 w-4 mr-2" />
            Trouver un Prestataire
          </Button>
        </Card>
      )}
    </>
  );
};
