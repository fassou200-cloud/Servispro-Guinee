import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Trash2, MapPin, Calendar, Coins, Users, ChevronDown, ChevronUp, FileText } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const statusBadge = (s) => ({
  open: { label: 'Ouverte', cls: 'bg-green-100 text-green-700' },
  closed: { label: 'Fermée', cls: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Terminée', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Annulée', cls: 'bg-red-100 text-red-700' },
}[s] || { label: s, cls: 'bg-gray-100 text-gray-700' });

const MissionCard = ({
  mission, applications, isExpanded, onToggleExpand,
  onAcceptApp, onRejectApp, onComplete, onDelete, onRateProvider, onDownloadInvoice,
}) => {
  const s = statusBadge(mission.status);
  return (
    <Card className="p-4" data-testid={`mission-card-${mission.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg">{mission.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
            <Badge variant="outline" className="text-xs">{mission.job_type}</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{mission.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
            {mission.location_city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[mission.location_quartier, mission.location_commune, mission.location_city, mission.location_region].filter(Boolean).join(', ')}
              </span>
            )}
            {mission.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {mission.start_date}{mission.end_date ? ` → ${mission.end_date}` : ''}</span>}
            <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {mission.rate_negotiable ? 'À négocier' : `${fmt(mission.daily_rate)} GNF/jour`}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {mission.accepted_count || 0}/{mission.num_providers_needed} retenu(s) · {mission.applications_count || 0} candidature(s)</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mission.status === 'completed' && mission.accepted_count > 0 && (
            <Button size="sm" variant="ghost" onClick={() => onToggleExpand(mission.id)} className="gap-1 text-emerald-600">
              Actions terminales {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {mission.status !== 'completed' && mission.accepted_count > 0 && (
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => onComplete(mission)} data-testid={`complete-mission-${mission.id}`}>
              Marquer terminée
            </Button>
          )}
          {mission.accepted_count === 0 && mission.status !== 'completed' && (
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(mission.id)} data-testid={`delete-mission-${mission.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onToggleExpand(mission.id)} className="gap-1">
            Candidats {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t pt-3 space-y-2" data-testid={`applications-list-${mission.id}`}>
          {applications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucune candidature pour le moment.</p>
          ) : applications.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg" data-testid={`application-${a.id}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{a.provider_name || 'Prestataire'}</p>
                <p className="text-xs text-gray-500">
                  {a.provider_city}
                  {a.provider_phone && !a.phone_locked ? <> · <span className="font-mono text-emerald-700">{a.provider_phone}</span></> : null}
                  {a.phone_locked && a.phone_lock_reason === 'mission_completed' && (
                    <> · <span className="italic text-gray-400">🔒 contact masqué — mission terminée</span></>
                  )}
                  {a.phone_locked && a.phone_lock_reason !== 'mission_completed' && (
                    <> · <span className="italic text-gray-400">📞 visible après acceptation</span></>
                  )}
                </p>
                {a.cover_message && <p className="text-xs text-gray-600 mt-1 italic">« {a.cover_message} »</p>}
                {a.proposed_rate ? <p className="text-xs text-emerald-700 mt-1">Taux proposé : {fmt(a.proposed_rate)} GNF/jour</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {a.status === 'pending' && mission.status !== 'completed' ? (() => {
                  const quotaReached = (mission.accepted_count || 0) >= (mission.num_providers_needed || 1);
                  return (
                    <>
                      <Button
                        size="sm"
                        className={quotaReached ? 'bg-amber-500 hover:bg-amber-600 h-8' : 'bg-emerald-600 hover:bg-emerald-700 h-8'}
                        onClick={() => onAcceptApp(mission, a.id)}
                        data-testid={`accept-app-${a.id}`}
                        title={quotaReached ? `Quota atteint (${mission.accepted_count}/${mission.num_providers_needed})` : 'Accepter'}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> {quotaReached ? 'Accepter (quota plein)' : 'Accepter'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200" onClick={() => onRejectApp(mission.id, a.id)} data-testid={`reject-app-${a.id}`}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeter
                      </Button>
                    </>
                  );
                })() : a.status === 'pending' && mission.status === 'completed' ? (
                  <Badge className="bg-gray-500">Mission terminée</Badge>
                ) : (
                  <div className="flex flex-col gap-1.5 items-end">
                    <Badge variant={a.status === 'accepted' ? 'default' : 'secondary'} className={a.status === 'accepted' ? 'bg-emerald-600' : ''}>{a.status}</Badge>
                    {a.status === 'accepted' && mission.status === 'completed' && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-amber-600 border-amber-300" onClick={() => onRateProvider({ mission_id: mission.id, provider_id: a.provider_id, provider_name: a.provider_name })} data-testid={`rate-prov-${a.id}`}>
                          ⭐ Noter
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-emerald-600 border-emerald-300" onClick={() => onDownloadInvoice(mission.id, a.provider_id, mission.company_id)} data-testid={`invoice-${a.id}`}>
                          <FileText className="h-3 w-3 mr-1" /> Facture
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default MissionCard;
