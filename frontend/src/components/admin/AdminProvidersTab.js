import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/utils/imageUrl';
import { AlertCircle, Ban, CheckCircle, ChevronLeft, ChevronRight, ExternalLink, Eye, FileText, Loader2, Pencil, Power, RefreshCw, Trash2, UserCheck, UserX, XCircle } from 'lucide-react';

const AdminProvidersTab = ({
  loadedTabs,
  providerPage,
  providers,
  selectedProvider,
  tabLoading,
  setProviderPage,
  setSelectedProvider,
  sortedAndPaginatedProviders,
  confirmDelete,
  getStatusBadge,
  handleApproveProvider,
  handleRejectProvider,
  handleToggleProviderActive,
  openEditAboutModal,
  openEditProfileModal,
  refreshTabData,
  BACKEND_URL,
  translateProfession,
  translateStatus
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Providers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-white">
            Liste des Prestataires ({sortedAndPaginatedProviders.totalItems})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshTabData('providers')}
            disabled={tabLoading}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${tabLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {tabLoading && !loadedTabs['providers'] ? (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-slate-400">Chargement des prestataires...</p>
          </Card>
        ) : providers.length === 0 ? (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <p className="text-slate-400">Aucun prestataire inscrit</p>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {sortedAndPaginatedProviders.items.map((provider) => (
                <Card
                  key={provider.id}
                  className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                    selectedProvider?.id === provider.id ? 'border-amber-500' : 'hover:border-slate-600'
                  }`}
                  onClick={() => setSelectedProvider(provider)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={getImageUrl(provider.profile_picture)}
                      />
                      <AvatarFallback className="bg-slate-700 text-white">
                        {provider.first_name[0]}{provider.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-white">
                        {provider.first_name} {provider.last_name}
                      </h3>
                      <p className="text-sm text-slate-400">{translateProfession(provider.profession)}</p>
                      <p className="text-xs text-slate-500">{provider.phone_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.is_active === false && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-900/50 text-red-400 border border-red-700">
                          Désactivé
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(provider.verification_status || 'pending')}`}>
                        {translateStatus(provider.verification_status || 'pending')}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {sortedAndPaginatedProviders.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  Page {sortedAndPaginatedProviders.currentPage} sur {sortedAndPaginatedProviders.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProviderPage(p => Math.max(1, p - 1))}
                    disabled={providerPage === 1}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, sortedAndPaginatedProviders.totalPages) }, (_, i) => {
                      let pageNum;
                      if (sortedAndPaginatedProviders.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (providerPage <= 3) {
                        pageNum = i + 1;
                      } else if (providerPage >= sortedAndPaginatedProviders.totalPages - 2) {
                        pageNum = sortedAndPaginatedProviders.totalPages - 4 + i;
                      } else {
                        pageNum = providerPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={providerPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setProviderPage(pageNum)}
                          className={providerPage === pageNum
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "border-slate-600 text-slate-300 hover:bg-slate-700"
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProviderPage(p => Math.min(sortedAndPaginatedProviders.totalPages, p + 1))}
                    disabled={providerPage === sortedAndPaginatedProviders.totalPages}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Provider Detail */}
      <div>
        <h2 className="text-lg font-heading font-bold text-white mb-4">
          Détails du Prestataire
        </h2>
        {selectedProvider ? (
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={getImageUrl(selectedProvider.profile_picture)}
                />
                <AvatarFallback className="bg-slate-700 text-white text-2xl">
                  {selectedProvider.first_name[0]}{selectedProvider.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">
                    {selectedProvider.first_name} {selectedProvider.last_name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditProfileModal(selectedProvider)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 h-7 px-2"
                    data-testid="edit-profile-btn"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-slate-400">{translateProfession(selectedProvider.profession)}</p>
                <p className="text-sm text-slate-500">{selectedProvider.phone_number}</p>
              </div>
            </div>

            {/* About Me */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-300 uppercase">À Propos</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditAboutModal(selectedProvider)}
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 h-8 px-2"
                  data-testid="edit-about-btn"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              </div>
              <p className="text-slate-400 bg-slate-700/50 p-3 rounded-lg whitespace-pre-wrap">
                {selectedProvider.about_me || 'Aucune description fournie'}
              </p>
            </div>

            {/* ID Verification */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Pièce d'Identité</h4>
              {selectedProvider.id_verification_picture ? (
                <img
                  src={`${BACKEND_URL}${selectedProvider.id_verification_picture}`}
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

            {/* Provider Documents */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Documents Justificatifs</h4>
              {selectedProvider.documents && selectedProvider.documents.length > 0 ? (
                <ul className="list-none m-0 p-0">
                  {selectedProvider.documents.map((doc, idx) => {
                    const docUrl = `${BACKEND_URL}${doc.path}`;
                    return (
                      <li key={idx} className="mb-2 last:mb-0">
                        <div
                          onClick={() => window.open(docUrl, '_blank')}
                          className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                          role="button"
                          tabIndex={0}
                          data-testid={`admin-provider-doc-${idx}`}
                        >
                          <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0">
                            <FileText className="h-5 w-5 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-sm font-medium truncate">{doc.filename || `Document ${idx + 1}`}</p>
                            {doc.uploaded_at && (
                              <p className="text-slate-500 text-xs">
                                Ajouté le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 bg-slate-700/30 p-3 rounded-lg">
                  <FileText className="h-5 w-5" />
                  <span>Aucun document justificatif fourni</span>
                </div>
              )}
            </div>

            {/* Profile Photo */}
            {selectedProvider.profile_picture && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Photo de Profil</h4>
                <img
                  src={getImageUrl(selectedProvider.profile_picture)}
                  alt="Photo de profil"
                  className="w-32 h-32 rounded-xl object-cover border border-slate-600"
                />
              </div>
            )}

            {/* Additional Info */}
            {(selectedProvider.years_experience || selectedProvider.profession_group) && (
              <div className="mb-6 grid grid-cols-2 gap-3">
                {selectedProvider.years_experience && (
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">Expérience</p>
                    <p className="text-slate-200 font-medium">
                      {selectedProvider.years_experience === '0-1' && "Moins d'1 an"}
                      {selectedProvider.years_experience === '1-2' && '1 - 2 ans'}
                      {selectedProvider.years_experience === '2-5' && '2 - 5 ans'}
                      {selectedProvider.years_experience === '5-10' && '5 - 10 ans'}
                      {selectedProvider.years_experience === '10-15' && '10 - 15 ans'}
                      {selectedProvider.years_experience === '15-20' && '15 - 20 ans'}
                      {selectedProvider.years_experience === '20+' && 'Plus de 20 ans'}
                    </p>
                  </div>
                )}
                {selectedProvider.profession_group && (
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">Catégorie</p>
                    <p className="text-slate-200 font-medium">{selectedProvider.profession_group}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {(selectedProvider.verification_status === 'pending' || !selectedProvider.verification_status) && (
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <Button
                  onClick={() => handleApproveProvider(selectedProvider.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  onClick={() => handleRejectProvider(selectedProvider.id)}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                >
                  <UserX className="h-4 w-4" />
                  Rejeter
                </Button>
              </div>
            )}

            {selectedProvider.verification_status === 'approved' && (
              <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span>Ce prestataire a été approuvé</span>
              </div>
            )}

            {selectedProvider.verification_status === 'rejected' && (
              <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                <XCircle className="h-5 w-5" />
                <span>Ce prestataire a été rejeté</span>
              </div>
            )}

            {/* Active Status Indicator */}
            <div className={`mt-4 flex items-center justify-between p-3 rounded-lg ${
              selectedProvider.is_active === false ? 'bg-red-900/20' : 'bg-green-900/20'
            }`}>
              <div className="flex items-center gap-2">
                {selectedProvider.is_active === false ? (
                  <>
                    <Ban className="h-5 w-5 text-red-400" />
                    <span className="text-red-400">Compte désactivé</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-green-400">Compte actif</span>
                  </>
                )}
              </div>
              <Button
                onClick={() => handleToggleProviderActive(selectedProvider.id)}
                size="sm"
                className={selectedProvider.is_active === false
                  ? 'bg-green-600 hover:bg-green-700 gap-2'
                  : 'bg-orange-600 hover:bg-orange-700 gap-2'
                }
              >
                <Power className="h-4 w-4" />
                {selectedProvider.is_active === false ? 'Activer' : 'Désactiver'}
              </Button>
            </div>

            {/* Delete Button */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <Button
                onClick={() => confirmDelete('provider', selectedProvider.id, `${selectedProvider.first_name} ${selectedProvider.last_name}`)}
                variant="outline"
                className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer ce prestataire
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <Eye className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Sélectionnez un prestataire pour voir ses détails</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminProvidersTab;
