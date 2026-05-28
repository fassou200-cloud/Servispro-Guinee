import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Coins, MapPin, Calendar, Loader2, AlertTriangle, CheckCircle, Clock, XCircle, FileText, Send, List, Map as MapIcon, Filter } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar';
import MissionsMap from '@/components/interim/MissionsMap';
import MissionFilters, { EMPTY_FILTERS, applyMissionFilters } from '@/components/interim/MissionFilters';
import {
  ApplyMissionDialog,
  PayCommissionDialog,
  TimesheetSubmitDialog,
  RateCompanyDialog,
  DeclineMissionDialog,
} from '@/components/interim/dialogs/ProviderInterimDialogs';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const COMMISSION_LABEL = {
  pending: { label: 'À payer', cls: 'bg-orange-100 text-orange-700' },
  submitted: { label: 'En vérification', cls: 'bg-blue-100 text-blue-700' },
  validated: { label: 'Validée', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejetée', cls: 'bg-red-100 text-red-700' },
};

const ProviderInterimTab = ({ user }) => {
  const [view, setView] = useState('missions');             // missions | applications | commissions | availability | timesheets
  const [missions, setMissions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [availability, setAvailability] = useState({ manual_unavailable_dates: [], mission_busy_dates: [] });
  const [ratingsReceived, setRatingsReceived] = useState({ count: 0, average: 0, ratings: [] });
  const [loading, setLoading] = useState(true);
  const [applyTo, setApplyTo] = useState(null);             // mission object
  const [applyForm, setApplyForm] = useState({ cover_message: '', proposed_rate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [payingFor, setPayingFor] = useState(null);         // commission object
  const [payForm, setPayForm] = useState({ payment_method: 'orange_money', transfer_reference: '', sender_phone: '', note: '' });
  const [payMethods, setPayMethods] = useState([]);
  const [decliningMission, setDecliningMission] = useState(null);  // mission object to decline
  const [missionsMode, setMissionsMode] = useState('list');         // 'list' | 'map'
  const [missionFilters, setMissionFilters] = useState(EMPTY_FILTERS);

  const suspended = user?.interim_suspended;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a, c, ts, av, r] = await Promise.all([
        axios.get(`${API}/interim/missions`, auth()),
        axios.get(`${API}/interim/applications/mine`, auth()),
        axios.get(`${API}/interim/commissions/mine`, auth()),
        axios.get(`${API}/interim/timesheets/mine`, auth()),
        axios.get(`${API}/interim/availability/mine`, auth()),
        axios.get(`${API}/interim/ratings/provider/${user.id}`),
      ]);
      setMissions(m.data || []);
      setApplications(a.data || []);
      setCommissions(c.data || []);
      setTimesheets(ts.data || []);
      setAvailability(av.data || { manual_unavailable_dates: [], mission_busy_dates: [] });
      setRatingsReceived(r.data || { count: 0, average: 0, ratings: [] });
    } catch {
      toast.error('Erreur de chargement');
    } finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openApply = (mission) => {
    if (suspended) { toast.error('Compte intérim suspendu : réglez votre commission d\'abord'); return; }
    setApplyTo(mission);
    setApplyForm({ cover_message: '', proposed_rate: '' });
  };

  const submitApply = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/interim/missions/${applyTo.id}/apply`, {
        cover_message: applyForm.cover_message,
        proposed_rate: Number(applyForm.proposed_rate) || 0,
      }, auth());
      toast.success('Candidature envoyée !');
      setApplyTo(null); loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    } finally { setSubmitting(false); }
  };

  const openPay = async (commission) => {
    setPayingFor(commission);
    setPayForm({ payment_method: 'orange_money', transfer_reference: '', sender_phone: '', note: '' });
    try {
      const res = await axios.get(`${API}/interim/payment-methods`, auth());
      setPayMethods(res.data.payment_methods || []);
    } catch {/* */}
  };

  const submitPay = async () => {
    if (!payForm.transfer_reference.trim()) { toast.error('La référence du transfert est obligatoire'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/interim/commissions/${payingFor.id}/submit-payment`, payForm, auth());
      toast.success('Preuve de paiement envoyée — en attente de vérification');
      setPayingFor(null); loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    } finally { setSubmitting(false); }
  };

  const declineMission = async () => {
    if (!decliningMission) return;
    try {
      await axios.post(`${API}/interim/missions/${decliningMission.id}/decline`, {}, auth());
      toast.success('Mission masquée');
      setDecliningMission(null);
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
      setDecliningMission(null);
    }
  };

  const toggleUnavailableDate = async (dateStr) => {
    const current = new Set(availability.manual_unavailable_dates || []);
    if (current.has(dateStr)) current.delete(dateStr); else current.add(dateStr);
    try {
      const res = await axios.put(`${API}/interim/availability`, { unavailable_dates: Array.from(current) }, auth());
      setAvailability((a) => ({ ...a, manual_unavailable_dates: res.data.unavailable_dates }));
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const [tsModalApp, setTsModalApp] = useState(null);
  const [tsForm, setTsForm] = useState({ notes: '', worked_days: [] });   // worked_days = [{date, hours}]

  const openTimesheet = (app) => {
    const existing = timesheets.find(t => t.mission_id === app.mission_id);
    if (existing) {
      const wd = existing.worked_days && existing.worked_days.length
        ? existing.worked_days
        : (existing.worked_dates || []).map(d => ({ date: d, hours: 8 }));
      setTsForm({ notes: existing.notes || '', worked_days: wd });
    } else {
      setTsForm({ notes: '', worked_days: [] });
    }
    setTsModalApp(app);
  };

  const toggleWorkedDate = (dateStr) => {
    setTsForm((f) => {
      const list = [...(f.worked_days || [])];
      const idx = list.findIndex(x => x.date === dateStr);
      if (idx >= 0) list.splice(idx, 1);
      else list.push({ date: dateStr, hours: 8 });
      list.sort((a, b) => a.date.localeCompare(b.date));
      return { ...f, worked_days: list };
    });
  };

  const setHoursForDate = (dateStr, hours) => {
    setTsForm((f) => ({
      ...f,
      worked_days: (f.worked_days || []).map(d => d.date === dateStr ? { ...d, hours: Number(hours) } : d),
    }));
  };

  const submitTimesheet = async () => {
    if (!tsForm.worked_days || tsForm.worked_days.length === 0) {
      toast.error('Sélectionnez au moins un jour travaillé'); return;
    }
    const invalid = tsForm.worked_days.find(d => !d.hours || d.hours <= 0 || d.hours > 24);
    if (invalid) {
      toast.error(`Heures invalides pour ${invalid.date}`); return;
    }
    try {
      await axios.post(`${API}/interim/missions/${tsModalApp.mission_id}/timesheet`, {
        worked_days: tsForm.worked_days,
        notes: tsForm.notes,
      }, auth());
      toast.success('Pointage envoyé');
      setTsModalApp(null);
      loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const [rateCompanyApp, setRateCompanyApp] = useState(null);
  const [rateForm, setRateForm] = useState({ stars: 5, comment: '' });

  const submitRateCompany = async () => {
    try {
      await axios.post(`${API}/interim/missions/${rateCompanyApp.mission_id}/rate-company`, rateForm, auth());
      toast.success('Note envoyée');
      setRateCompanyApp(null);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const downloadInvoice = (missionId) => {
    const url = `${API}/interim/missions/${missionId}/invoice/${user.id}?token=${user.id}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="text-center py-10 text-gray-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  const unpaidCount = commissions.filter(c => ['pending', 'rejected'].includes(c.status)).length;

  return (
    <div className="space-y-4" data-testid="provider-interim-tab">
      {suspended && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3" data-testid="suspension-banner">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700">Votre compte intérim est suspendu</p>
            <p className="text-sm text-red-600">Vous avez {unpaidCount} commission(s) à régler. Vous pourrez postuler à nouveau dès la validation par l'admin.</p>
          </div>
        </div>
      )}

      {ratingsReceived.count > 0 && (
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200" data-testid="ratings-summary">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600">Votre réputation Intérim</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-amber-600">{ratingsReceived.average.toFixed(1)}</span>
                <span className="text-amber-500 text-xl">{'★'.repeat(Math.round(ratingsReceived.average))}{'☆'.repeat(5 - Math.round(ratingsReceived.average))}</span>
                <span className="text-xs text-gray-500">({ratingsReceived.count} avis)</span>
              </div>
            </div>
          </div>
          {ratingsReceived.ratings.length > 0 && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {ratingsReceived.ratings.slice(0, 5).map(r => (
                <div key={r.id} className="text-sm bg-white/70 rounded p-2 border border-amber-100" data-testid={`rating-${r.id}`}>
                  <div className="flex items-center justify-between">
                    <strong className="text-gray-800">{r.company_name}</strong>
                    <span className="text-amber-500 text-xs">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{r.mission_title}</p>
                  {r.comment && <p className="text-xs text-gray-700 italic mt-1">« {r.comment} »</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant={view === 'missions' ? 'default' : 'outline'} onClick={() => setView('missions')} className={view === 'missions' ? 'bg-emerald-600' : ''} data-testid="view-missions-btn">
          <Briefcase className="h-4 w-4 mr-1" /> Missions ({missions.length})
        </Button>
        <Button variant={view === 'applications' ? 'default' : 'outline'} onClick={() => setView('applications')} className={view === 'applications' ? 'bg-emerald-600' : ''} data-testid="view-applications-btn">
          <Send className="h-4 w-4 mr-1" /> Candidatures ({applications.length})
        </Button>
        <Button variant={view === 'timesheets' ? 'default' : 'outline'} onClick={() => setView('timesheets')} className={view === 'timesheets' ? 'bg-emerald-600' : ''} data-testid="view-timesheets-btn">
          <Clock className="h-4 w-4 mr-1" /> Pointages ({timesheets.length})
        </Button>
        <Button variant={view === 'availability' ? 'default' : 'outline'} onClick={() => setView('availability')} className={view === 'availability' ? 'bg-emerald-600' : ''} data-testid="view-availability-btn">
          <FileText className="h-4 w-4 mr-1" /> Disponibilité
        </Button>
        <Button variant={view === 'commissions' ? 'default' : 'outline'} onClick={() => setView('commissions')} className={view === 'commissions' ? 'bg-emerald-600' : ''} data-testid="view-commissions-btn">
          <Coins className="h-4 w-4 mr-1" /> Commissions ({commissions.length})
          {unpaidCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{unpaidCount}</span>}
        </Button>
      </div>

      {view === 'missions' && (
        <>
          <MissionFilters
            missions={missions}
            value={missionFilters}
            onChange={setMissionFilters}
            resultsCount={applyMissionFilters(missions, missionFilters).length}
          />
          {missions.length > 0 && (
            <div className="flex items-center justify-end gap-2" data-testid="missions-mode-toggle">
              <Button
                size="sm"
                variant={missionsMode === 'list' ? 'default' : 'outline'}
                onClick={() => setMissionsMode('list')}
                className={missionsMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                data-testid="missions-mode-list-btn"
              >
                <List className="h-4 w-4 mr-1" /> Liste
              </Button>
              <Button
                size="sm"
                variant={missionsMode === 'map' ? 'default' : 'outline'}
                onClick={() => setMissionsMode('map')}
                className={missionsMode === 'map' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                data-testid="missions-mode-map-btn"
              >
                <MapIcon className="h-4 w-4 mr-1" /> Carte
              </Button>
            </div>
          )}
          {(() => {
            const filteredMissions = applyMissionFilters(missions, missionFilters);
            if (missions.length === 0) {
              return <Card className="p-10 text-center text-gray-500"><Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-3" />Aucune mission ouverte.</Card>;
            }
            if (filteredMissions.length === 0) {
              return <Card className="p-10 text-center text-gray-500"><Filter className="h-12 w-12 mx-auto text-gray-300 mb-3" />Aucune mission ne correspond à vos filtres.</Card>;
            }
            if (missionsMode === 'map') {
              return (
                <MissionsMap
                  missions={filteredMissions}
                  onSelect={(m) => {
                    if (suspended) return;
                    if (applications.find(a => a.mission_id === m.id)) {
                      toast.info('Vous avez déjà postulé à cette mission.');
                      return;
                    }
                    openApply(m);
                  }}
                />
              );
            }
            return filteredMissions.map((m) => {
        const alreadyApplied = applications.find(a => a.mission_id === m.id);
        return (
          <Card key={m.id} className="p-4" data-testid={`available-mission-${m.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">{m.title}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-emerald-700 font-semibold">{m.company_name}</p>
                  {m.owner_type === 'customer' ? (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" data-testid={`particulier-badge-${m.id}`}>Particulier</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200">Entreprise</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{m.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                  <span><Badge variant="outline" className="text-xs">{m.job_type}</Badge></span>
                  {m.location_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.location_city}</span>}
                  {m.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {m.start_date}{m.end_date ? ` → ${m.end_date}` : ''}</span>}
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold"><Coins className="h-3 w-3" /> {m.rate_negotiable ? 'À négocier' : `${fmt(m.daily_rate)} GNF/jour`}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <Button disabled={!!alreadyApplied || suspended} onClick={() => openApply(m)} className="bg-emerald-600 hover:bg-emerald-700" data-testid={`apply-mission-${m.id}`}>
                  {alreadyApplied ? 'Déjà postulé' : 'Postuler'}
                </Button>
                {!alreadyApplied && (
                  <Button variant="outline" onClick={() => setDecliningMission(m)} className="text-gray-500 border-gray-300 hover:bg-gray-50" data-testid={`decline-mission-${m.id}`}>
                    Pas intéressé
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      });
          })()}
        </>
      )}

      {view === 'applications' && (applications.length === 0 ? (
        <Card className="p-10 text-center text-gray-500"><Send className="h-12 w-12 mx-auto text-gray-300 mb-3" />Aucune candidature.</Card>
      ) : applications.map((a) => {
        const quotaReached = a.status === 'pending' && ['closed', 'completed'].includes(a.mission_status);
        return (
        <Card key={a.id} className="p-4" data-testid={`my-application-${a.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-bold">{a.mission_title}</h3>
              <p className="text-sm text-gray-600">{a.company_name}</p>
              {a.cover_message && <p className="text-xs text-gray-500 italic mt-1">« {a.cover_message} »</p>}
              {quotaReached && (
                <p className="text-xs text-gray-600 mt-1.5 bg-gray-100 px-2 py-1 rounded inline-block">
                  🔒 Quota atteint ({a.mission_accepted_count}/{a.mission_num_providers_needed}) — l'entreprise peut encore vous sélectionner en remplacement
                </p>
              )}
              {a.status === 'rejected' && a.rejection_reason && (
                <p className="text-xs text-red-600 mt-1.5">
                  ✗ {a.rejection_reason}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleDateString('fr-FR')}</p>

              {a.status === 'accepted' && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openTimesheet(a)} className="h-8 text-blue-600 border-blue-300" data-testid={`open-ts-${a.id}`}>
                    <Clock className="h-3.5 w-3.5 mr-1" /> Pointer mes jours
                  </Button>
                  {a.mission_status === 'completed' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => downloadInvoice(a.mission_id)} className="h-8 text-emerald-600 border-emerald-300" data-testid={`invoice-${a.id}`}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> Facture
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setRateCompanyApp(a); setRateForm({ stars: 5, comment: '' }); }} className="h-8 text-amber-600 border-amber-300" data-testid={`rate-${a.id}`}>
                        ⭐ Noter l'entreprise
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            <Badge className={
              a.status === 'accepted' ? 'bg-green-600' :
              a.status === 'rejected' ? 'bg-red-500' :
              a.status === 'withdrawn' ? 'bg-gray-400' :
              quotaReached ? 'bg-gray-500' :
              'bg-orange-500'
            }>
              {a.status === 'accepted' ? <><CheckCircle className="h-3 w-3 mr-1" /> Accepté</> :
               a.status === 'rejected' ? <><XCircle className="h-3 w-3 mr-1" /> Rejeté</> :
               a.status === 'withdrawn' ? 'Retiré' :
               quotaReached ? 'Quota atteint' :
               <><Clock className="h-3 w-3 mr-1" /> En attente</>}
            </Badge>
          </div>
        </Card>
        );
      }))}

      {view === 'commissions' && (commissions.length === 0 ? (
        <Card className="p-10 text-center text-gray-500"><Coins className="h-12 w-12 mx-auto text-gray-300 mb-3" />Aucune commission à payer.</Card>
      ) : commissions.map((c) => {
        const lbl = COMMISSION_LABEL[c.status] || { label: c.status, cls: '' };
        return (
          <Card key={c.id} className="p-4" data-testid={`commission-${c.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">{c.mission_title}</h3>
                <p className="text-sm text-gray-600">{c.company_name}</p>
                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                  <p>{c.days_worked} jour(s) × {fmt(c.daily_rate)} GNF = <span className="text-gray-800 font-semibold">{fmt(c.gross_amount)} GNF</span></p>
                  <p>Commission ServisPro {c.commission_percent}% = <span className="text-red-600 font-bold">{fmt(c.commission_amount)} GNF</span></p>
                </div>
                {c.rejection_reason && <p className="text-xs text-red-600 mt-2"><FileText className="h-3 w-3 inline mr-1" />Rejet : {c.rejection_reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${lbl.cls}`}>{lbl.label}</span>
                {(c.status === 'pending' || c.status === 'rejected') && (
                  <Button size="sm" onClick={() => openPay(c)} className="bg-emerald-600 hover:bg-emerald-700" data-testid={`pay-commission-${c.id}`}>
                    Payer
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      }))}

      {view === 'timesheets' && (timesheets.length === 0 ? (
        <Card className="p-10 text-center text-gray-500"><Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />Aucun pointage. Soumettez-en un depuis vos candidatures acceptées.</Card>
      ) : timesheets.map(t => (
        <Card key={t.id} className="p-4" data-testid={`my-timesheet-${t.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-bold">{t.mission_title}</h3>
              <p className="text-sm text-gray-700">
                <strong>{t.total_hours || (t.days_worked * 8)} h</strong> = <strong>{t.days_worked}</strong> jour(s)
              </p>
              {t.worked_days && t.worked_days.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                  {t.worked_days.map(d => (
                    <div key={d.date}>• {new Date(d.date).toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short' })} — <strong>{d.hours}h</strong></div>
                  ))}
                </div>
              )}
              {t.notes && <p className="text-xs text-gray-500 italic mt-1">« {t.notes} »</p>}
              {t.rejection_reason && <p className="text-xs text-red-600 mt-1">✗ {t.rejection_reason}</p>}
            </div>
            <Badge className={
              t.status === 'validated' ? 'bg-green-600' :
              t.status === 'rejected' ? 'bg-red-500' :
              'bg-blue-500'
            }>
              {t.status === 'validated' ? 'Validé' : t.status === 'rejected' ? 'Rejeté' : 'En vérification'}
            </Badge>
          </div>
        </Card>
      )))}

      {view === 'availability' && (
        <AvailabilityCalendar
          unavailable={new Set(availability.manual_unavailable_dates)}
          busyByMission={new Set(availability.mission_busy_dates)}
          onToggle={toggleUnavailableDate}
        />
      )}

      {/* Apply dialog */}
      <ApplyMissionDialog
        mission={applyTo}
        user={user}
        form={applyForm}
        setForm={setApplyForm}
        onClose={() => setApplyTo(null)}
        onSubmit={submitApply}
        submitting={submitting}
      />

      <PayCommissionDialog
        commission={payingFor}
        form={payForm}
        setForm={setPayForm}
        payMethods={payMethods}
        onClose={() => setPayingFor(null)}
        onSubmit={submitPay}
        submitting={submitting}
      />

      <TimesheetSubmitDialog
        app={tsModalApp}
        form={tsForm}
        setForm={setTsForm}
        onToggleDate={toggleWorkedDate}
        onSetHours={setHoursForDate}
        onClose={() => setTsModalApp(null)}
        onSubmit={submitTimesheet}
      />

      <RateCompanyDialog
        app={rateCompanyApp}
        form={rateForm}
        setForm={setRateForm}
        onClose={() => setRateCompanyApp(null)}
        onSubmit={submitRateCompany}
      />

      <DeclineMissionDialog
        mission={decliningMission}
        onClose={() => setDecliningMission(null)}
        onConfirm={declineMission}
      />
    </div>
  );
};

export default ProviderInterimTab;
