import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertTriangle, Bug, Calendar, CheckCircle, Clock, HelpCircle, Lightbulb, Loader2, MessageSquare, Save, Sparkles, Trash2, UserCircle } from 'lucide-react';

const AdminFeedbacksTab = ({
  feedbackFilter,
  feedbackStats,
  feedbacks,
  loadedTabs,
  selectedFeedback,
  tabLoading,
  setFeedbackFilter,
  setFeedbacks,
  setSelectedFeedback,
  API,
  adminApi
}) => {
  return (
    <div className="space-y-6">
      {tabLoading && !loadedTabs['feedbacks'] ? (
        <Card className="p-8 bg-slate-800 border-slate-700 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500 mx-auto mb-2" />
          <p className="text-slate-400">Chargement des feedbacks...</p>
        </Card>
      ) : (
        <>
          {/* Feedback Stats */}
          {feedbackStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-pink-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{feedbackStats.total}</p>
                    <p className="text-xs text-slate-400">Total</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Bug className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{feedbackStats.by_type.bug}</p>
                    <p className="text-xs text-slate-400">Bugs</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{feedbackStats.by_type.issue}</p>
                    <p className="text-xs text-slate-400">Problèmes</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{feedbackStats.by_type.feature}</p>
                    <p className="text-xs text-slate-400">Fonctionnalités</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{feedbackStats.by_status.new}</p>
                    <p className="text-xs text-slate-400">Nouveaux</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Tous' },
              { value: 'new', label: 'Nouveaux', color: 'bg-yellow-600' },
              { value: 'in_progress', label: 'En cours', color: 'bg-blue-600' },
              { value: 'resolved', label: 'Résolus', color: 'bg-green-600' },
              { value: 'closed', label: 'Fermés', color: 'bg-slate-600' }
            ].map((filter) => (
              <Button
                key={filter.value}
                variant={feedbackFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedbackFilter(filter.value)}
                className={feedbackFilter === filter.value ? (filter.color || 'bg-pink-600') : 'border-slate-600 text-slate-300'}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Feedbacks List */}
          <div className="grid gap-4">
            {feedbacks
              .filter(fb => feedbackFilter === 'all' || fb.status === feedbackFilter)
              .map((feedback) => {
                const typeConfig = {
                  bug: { icon: Bug, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Bug' },
                  issue: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Problème' },
                  feature: { icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Fonctionnalité' },
                  improvement: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Amélioration' },
                  other: { icon: HelpCircle, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Autre' }
                };
                const statusConfig = {
                  new: { color: 'bg-yellow-500', label: 'Nouveau' },
                  in_progress: { color: 'bg-blue-500', label: 'En cours' },
                  resolved: { color: 'bg-green-500', label: 'Résolu' },
                  closed: { color: 'bg-slate-500', label: 'Fermé' }
                };
                const TypeIcon = typeConfig[feedback.type]?.icon || HelpCircle;
                const typeInfo = typeConfig[feedback.type] || typeConfig.other;
                const statusInfo = statusConfig[feedback.status] || statusConfig.new;

                return (
                  <Card
                    key={feedback.id}
                    className={`p-5 bg-slate-800 border-slate-700 cursor-pointer hover:border-pink-500/50 transition-colors overflow-hidden ${selectedFeedback?.id === feedback.id ? 'border-pink-500' : ''}`}
                    onClick={() => setSelectedFeedback(selectedFeedback?.id === feedback.id ? null : feedback)}
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`h-12 w-12 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className={`h-6 w-6 ${typeInfo.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="font-bold text-white break-words min-w-0 flex-1">{feedback.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${typeInfo.bg} ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm line-clamp-2 break-words">{feedback.description}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                          {feedback.user_name && (
                            <span className="flex items-center gap-1">
                              <UserCircle className="h-3.5 w-3.5" />
                              {feedback.user_name}
                            </span>
                          )}
                          {feedback.user_type && (
                            <span className="px-2 py-0.5 bg-slate-700 rounded">
                              {feedback.user_type}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(feedback.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedFeedback?.id === feedback.id && (
                      <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                        <div className="bg-slate-900/50 p-4 rounded-lg">
                          <p className="text-slate-300 whitespace-pre-wrap">{feedback.description}</p>
                        </div>

                        {(feedback.user_email || feedback.user_phone || feedback.page_url) && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {feedback.user_email && (
                              <div>
                                <span className="text-slate-500">Email:</span>
                                <span className="text-slate-300 ml-2">{feedback.user_email}</span>
                              </div>
                            )}
                            {feedback.user_phone && (
                              <div>
                                <span className="text-slate-500">Téléphone:</span>
                                <span className="text-slate-300 ml-2">{feedback.user_phone}</span>
                              </div>
                            )}
                            {feedback.page_url && (
                              <div className="col-span-2">
                                <span className="text-slate-500">Page:</span>
                                <a href={feedback.page_url} target="_blank" rel="noopener noreferrer" className="text-pink-400 ml-2 hover:underline">
                                  {feedback.page_url}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Admin Notes */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-400">Notes Admin</label>
                          <Textarea
                            value={feedback.admin_notes || ''}
                            onChange={(e) => setSelectedFeedback({...feedback, admin_notes: e.target.value})}
                            placeholder="Ajouter des notes..."
                            className="bg-slate-900 border-slate-700 text-slate-300 min-h-[80px]"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await adminApi.put(`${API}/admin/feedbacks/${feedback.id}?status=in_progress`);
                                setFeedbacks(prev => prev.map(f => f.id === feedback.id ? {...f, status: 'in_progress'} : f));
                                toast.success('Statut mis à jour');
                              } catch (error) {
                                toast.error('Erreur');
                              }
                            }}
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                          >
                            En cours
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await adminApi.put(`${API}/admin/feedbacks/${feedback.id}?status=resolved`);
                                setFeedbacks(prev => prev.map(f => f.id === feedback.id ? {...f, status: 'resolved'} : f));
                                toast.success('Marqué comme résolu');
                              } catch (error) {
                                toast.error('Erreur');
                              }
                            }}
                            className="border-green-500 text-green-400 hover:bg-green-500/20"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Résolu
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await adminApi.put(`${API}/admin/feedbacks/${feedback.id}?status=closed`);
                                setFeedbacks(prev => prev.map(f => f.id === feedback.id ? {...f, status: 'closed'} : f));
                                toast.success('Feedback fermé');
                              } catch (error) {
                                toast.error('Erreur');
                              }
                            }}
                            className="border-slate-500 text-slate-400 hover:bg-slate-500/20"
                          >
                            Fermer
                          </Button>
                          <Button
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await adminApi.put(`${API}/admin/feedbacks/${feedback.id}`, null, {
                                  params: { admin_notes: selectedFeedback.admin_notes }
                                });
                                setFeedbacks(prev => prev.map(f => f.id === feedback.id ? {...f, admin_notes: selectedFeedback.admin_notes} : f));
                                toast.success('Notes sauvegardées');
                              } catch (error) {
                                toast.error('Erreur');
                              }
                            }}
                            className="bg-pink-600 hover:bg-pink-700"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Sauvegarder Notes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm('Supprimer ce feedback ?')) {
                                try {
                                  await adminApi.delete(`${API}/admin/feedbacks/${feedback.id}`);
                                  setFeedbacks(prev => prev.filter(f => f.id !== feedback.id));
                                  setSelectedFeedback(null);
                                  toast.success('Feedback supprimé');
                                } catch (error) {
                                  toast.error('Erreur');
                                }
                              }
                            }}
                            className="border-red-500 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>

          {feedbacks.filter(fb => feedbackFilter === 'all' || fb.status === feedbackFilter).length === 0 && (
            <Card className="p-12 bg-slate-800 border-slate-700 text-center">
              <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Aucun feedback trouvé</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AdminFeedbacksTab;
