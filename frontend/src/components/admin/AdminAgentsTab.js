import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/utils/imageUrl';
import { AlertCircle, Building, CheckCircle, Home, Trash2, UserCheck, UserX } from 'lucide-react';

const AdminAgentsTab = ({
  agentsImmobilier,
  selectedAgent,
  setSelectedAgent,
  confirmDelete,
  getStatusBadge,
  handleApproveProvider,
  handleRejectProvider,
  BACKEND_URL,
  translateStatus
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="text-lg font-heading font-bold text-white mb-4">Agents Immobiliers</h2>
        {agentsImmobilier.length === 0 ? (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <p className="text-slate-400">Aucun agent immobilier inscrit</p>
          </Card>
        ) : (
          agentsImmobilier.map((agent) => (
            <Card
              key={agent.id}
              className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                selectedAgent?.id === agent.id ? 'border-amber-500' : 'hover:border-slate-600'
              }`}
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={getImageUrl(agent.profile_picture)}
                  />
                  <AvatarFallback className="bg-amber-600 text-white">
                    {agent.first_name[0]}{agent.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{agent.first_name} {agent.last_name}</h3>
                  <p className="text-sm text-slate-400">{agent.phone_number}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-purple-400">
                      <Building className="h-3 w-3 inline mr-1" />
                      {agent.rental_count || 0} annonce(s)
                    </span>
                    {agent.online_status && (
                      <span className="text-xs text-green-400">● En ligne</span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(agent.verification_status || 'pending')}`}>
                  {translateStatus(agent.verification_status || 'pending')}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Agent Detail */}
      <div>
        <h2 className="text-lg font-heading font-bold text-white mb-4">Détails de l'Agent</h2>
        {selectedAgent ? (
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={getImageUrl(selectedAgent.profile_picture)}
                />
                <AvatarFallback className="bg-amber-600 text-white text-2xl">
                  {selectedAgent.first_name[0]}{selectedAgent.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedAgent.first_name} {selectedAgent.last_name}</h3>
                <p className="text-amber-400">Propriétaire immobilier</p>
                <p className="text-sm text-slate-400">{selectedAgent.phone_number}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <Building className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{selectedAgent.rental_count || 0}</p>
                <p className="text-xs text-slate-400">Annonces</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${selectedAgent.online_status ? 'text-green-400' : 'text-slate-500'}`} />
                <p className="text-lg font-bold text-white">{selectedAgent.online_status ? 'En ligne' : 'Hors ligne'}</p>
                <p className="text-xs text-slate-400">Statut</p>
              </div>
            </div>

            {/* About */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">À Propos</h4>
              <p className="text-slate-400 bg-slate-700/50 p-3 rounded-lg">
                {selectedAgent.about_me || 'Aucune description fournie'}
              </p>
            </div>

            {/* ID Verification */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Pièce d'Identité</h4>
              {selectedAgent.id_verification_picture ? (
                <img
                  src={`${BACKEND_URL}${selectedAgent.id_verification_picture}`}
                  alt="Pièce d'identité"
                  className="w-full max-w-md rounded-lg border border-slate-600"
                />
              ) : (
                <div className="flex items-center gap-2 text-orange-400 bg-orange-900/20 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span>Aucune pièce d'identité fournie</span>
                </div>
              )}
            </div>

            {/* Listing info */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Inscrit le</h4>
              <p className="text-slate-400">{new Date(selectedAgent.created_at).toLocaleDateString('fr-FR')}</p>
            </div>

            {/* Actions */}
            {(selectedAgent.verification_status === 'pending' || !selectedAgent.verification_status) && (
              <div className="flex gap-3 pt-4 border-t border-slate-700 mb-4">
                <Button
                  onClick={() => handleApproveProvider(selectedAgent.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  onClick={() => handleRejectProvider(selectedAgent.id)}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                >
                  <UserX className="h-4 w-4" />
                  Rejeter
                </Button>
              </div>
            )}

            <Button
              onClick={() => confirmDelete('provider', selectedAgent.id, `${selectedAgent.first_name} ${selectedAgent.last_name}`)}
              variant="outline"
              className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer cet agent
            </Button>
          </Card>
        ) : (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <Home className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Sélectionnez un agent pour voir ses détails</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminAgentsTab;
