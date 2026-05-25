import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Briefcase, Plus, Users, CheckCircle, XCircle, Loader2, Trash2, MapPin, Calendar, Coins, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GUINEA_REGIONS, getCitiesForRegion } from '@/constants/guineaLocations';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('companyToken')}` } });

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);
const statusBadge = (s) => ({
  open: { label: 'Ouverte', cls: 'bg-green-100 text-green-700' },
  closed: { label: 'Fermée', cls: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Terminée', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Annulée', cls: 'bg-red-100 text-red-700' },
}[s] || { label: s, cls: 'bg-gray-100 text-gray-700' });

const blankForm = {
  title: '', description: '', job_type: '', location_region: '', location_city: '',
  start_date: '', end_date: '', daily_rate: '', rate_negotiable: false,
  num_providers_needed: 1, documents_required: [],
};

const CompanyInterimTab = () => {
  const [missions, setMissions] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [view, setView] = useState('missions');     // missions | timesheets
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [expanded, setExpanded] = useState({});            // missionId -> bool
  const [apps, setApps] = useState({});                    // missionId -> applications[]
  const [completing, setCompleting] = useState(null);      // missionId
  const [completeData, setCompleteData] = useState({ days_worked: 1, daily_rate: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [overquotaPending, setOverquotaPending] = useState(null);  // {mission, appId}

  const loadMissions = useCallback(async () => {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        axios.get(`${API}/interim/missions/mine`, auth()),
        axios.get(`${API}/interim/timesheets/company`, auth()),
      ]);
      setMissions(m.data || []);
      setTimesheets(t.data || []);
    } catch (e) {
      toast.error("Erreur de chargement des missions");
    } finally {
      setLoading(false);
    }
  }, []);

  const validateTs = async (id) => {
    try {
      await axios.post(`${API}/interim/timesheets/${id}/validate`, {}, auth());
      toast.success('Pointage validé');
      loadMissions();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const [rejectTsModal, setRejectTsModal] = useState(null);   // timesheet
  const [rejectReason, setRejectReason] = useState('');

  const rejectTs = (ts) => {
    setRejectReason('');
    setRejectTsModal(ts);
  };

  const submitRejectTs = async () => {
    if (rejectReason.trim().length < 5) {
      toast.error('Indiquez un motif d\'au moins 5 caractères'); return;
    }
    try {
      await axios.post(`${API}/interim/timesheets/${rejectTsModal.id}/reject`, { reason: rejectReason.trim() }, auth());
      toast.success('Pointage rejeté');
      setRejectTsModal(null);
      loadMissions();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const [rateProviderModal, setRateProviderModal] = useState(null);   // {mission_id, provider_id, provider_name}
  const [rateForm, setRateForm] = useState({ stars: 5, comment: '' });

  const submitRateProvider = async () => {
    if (!rateProviderModal) return;
    try {
      await axios.post(`${API}/interim/missions/${rateProviderModal.mission_id}/rate-provider`, {
        provider_id: rateProviderModal.provider_id,
        stars: rateForm.stars,
        comment: rateForm.comment,
      }, auth());
      toast.success('Note envoyée');
      setRateProviderModal(null);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const downloadInvoice = (missionId, providerId, companyId) => {
    const url = `${API}/interim/missions/${missionId}/invoice/${providerId}?token=${companyId}`;
    window.open(url, '_blank');
  };

  useEffect(() => { loadMissions(); }, [loadMissions]);

  const toggleExpand = async (missionId) => {
    const next = { ...expanded, [missionId]: !expanded[missionId] };
    setExpanded(next);
    if (next[missionId] && !apps[missionId]) {
      try {
        const res = await axios.get(`${API}/interim/missions/${missionId}/applications`, auth());
        setApps((p) => ({ ...p, [missionId]: res.data || [] }));
      } catch {
        toast.error("Erreur de chargement des candidatures");
      }
    }
  };

  const refreshApps = async (missionId) => {
    try {
      const res = await axios.get(`${API}/interim/missions/${missionId}/applications`, auth());
      setApps((p) => ({ ...p, [missionId]: res.data || [] }));
    } catch {/* */}
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.title || !form.job_type || !form.description) {
      toast.error('Titre, métier et description obligatoires'); return;
    }
    setCreating(true);
    try {
      await axios.post(`${API}/interim/missions`, {
        ...form,
        daily_rate: Number(form.daily_rate) || 0,
        num_providers_needed: Number(form.num_providers_needed) || 1,
      }, auth());
      toast.success('Mission publiée !');
      setShowCreate(false); setForm(blankForm); loadMissions();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la publication");
    } finally { setCreating(false); }
  };

  const acceptApp = async (mission, aid) => {
    if (mission && (mission.accepted_count || 0) >= (mission.num_providers_needed || 1)) {
      setOverquotaPending({ mission, aid });
      return;
    }
    await doAccept(mission, aid);
  };

  const doAccept = async (mission, aid) => {
    try {
      await axios.post(`${API}/interim/applications/${aid}/accept`, {}, auth());
      toast.success('Candidat accepté');
      refreshApps(mission.id); loadMissions();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const confirmOverquota = async () => {
    if (!overquotaPending) return;
    const { mission, aid } = overquotaPending;
    setOverquotaPending(null);
    await doAccept(mission, aid);
  };

  const rejectApp = async (mid, aid) => {
    try {
      await axios.post(`${API}/interim/applications/${aid}/reject`, { reason: '' }, auth());
      toast.success('Candidature rejetée');
      refreshApps(mid);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const deleteMission = async () => {
    if (!deletingId) return;
    try {
      await axios.delete(`${API}/interim/missions/${deletingId}`, auth());
      toast.success('Mission supprimée');
      setDeletingId(null);
      loadMissions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
      setDeletingId(null);
    }
  };

  const openComplete = (m) => {
    setCompleting(m.id);
    setCompleteData({ days_worked: m.days_worked || 1, daily_rate: m.daily_rate || '' });
  };

  const submitComplete = async () => {
    try {
      await axios.post(`${API}/interim/missions/${completing}/complete`, {
        days_worked: Number(completeData.days_worked) || 1,
        daily_rate: Number(completeData.daily_rate) || 0,
      }, auth());
      toast.success('Mission marquée terminée — commission(s) générée(s)');
      setCompleting(null); loadMissions();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  if (loading) return <div className="text-center py-10 text-gray-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6" data-testid="company-interim-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-emerald-600" /> Missions Intérim</h2>
          <p className="text-sm text-gray-500">Publiez des missions ponctuelles et recrutez des prestataires.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2" data-testid="open-create-mission-btn">
          <Plus className="h-4 w-4" /> Publier une mission
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={view === 'missions' ? 'default' : 'outline'} onClick={() => setView('missions')} className={view === 'missions' ? 'bg-emerald-600' : ''} data-testid="company-view-missions">
          <Briefcase className="h-4 w-4 mr-1" /> Mes missions ({missions.length})
        </Button>
        <Button variant={view === 'timesheets' ? 'default' : 'outline'} onClick={() => setView('timesheets')} className={view === 'timesheets' ? 'bg-emerald-600' : ''} data-testid="company-view-timesheets">
          <Clock className="h-4 w-4 mr-1" /> Pointages ({timesheets.length})
          {timesheets.filter(t => t.status === 'submitted').length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">{timesheets.filter(t => t.status === 'submitted').length}</span>
          )}
        </Button>
      </div>

      {view === 'missions' && (
      <>
      {missions.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p>Aucune mission publiée.</p>
        </Card>
      ) : missions.map((m) => {
        const s = statusBadge(m.status);
        const mApps = apps[m.id] || [];
        return (
          <Card key={m.id} className="p-4" data-testid={`mission-card-${m.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg">{m.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
                  <Badge variant="outline" className="text-xs">{m.job_type}</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                  {m.location_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.location_city}{m.location_region ? `, ${m.location_region}` : ''}</span>}
                  {m.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {m.start_date}{m.end_date ? ` → ${m.end_date}` : ''}</span>}
                  <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {m.rate_negotiable ? 'À négocier' : `${fmt(m.daily_rate)} GNF/jour`}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {m.accepted_count || 0}/{m.num_providers_needed} retenu(s) · {m.applications_count || 0} candidature(s)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.status === 'completed' && m.accepted_count > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(m.id)} className="gap-1 text-emerald-600">
                    Actions terminales {expanded[m.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                )}
                {m.status !== 'completed' && m.accepted_count > 0 && (
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openComplete(m)} data-testid={`complete-mission-${m.id}`}>
                    Marquer terminée
                  </Button>
                )}
                {m.accepted_count === 0 && m.status !== 'completed' && (
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDeletingId(m.id)} data-testid={`delete-mission-${m.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => toggleExpand(m.id)} className="gap-1">
                  Candidats {expanded[m.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {expanded[m.id] && (
              <div className="mt-4 border-t pt-3 space-y-2" data-testid={`applications-list-${m.id}`}>
                {mApps.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Aucune candidature pour le moment.</p>
                ) : mApps.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg" data-testid={`application-${a.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{a.provider_name || 'Prestataire'}</p>
                      <p className="text-xs text-gray-500">
                        {a.provider_city}
                        {a.provider_phone && !a.phone_locked ? <> · <span className="font-mono text-emerald-700">{a.provider_phone}</span></> : null}
                        {a.phone_locked && <> · <span className="italic text-gray-400">📞 visible après acceptation</span></>}
                      </p>
                      {a.cover_message && <p className="text-xs text-gray-600 mt-1 italic">« {a.cover_message} »</p>}
                      {a.proposed_rate ? <p className="text-xs text-emerald-700 mt-1">Taux proposé : {fmt(a.proposed_rate)} GNF/jour</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {a.status === 'pending' && m.status !== 'completed' ? (() => {
                        const quotaReached = (m.accepted_count || 0) >= (m.num_providers_needed || 1);
                        return (
                          <>
                            <Button
                              size="sm"
                              className={quotaReached ? 'bg-amber-500 hover:bg-amber-600 h-8' : 'bg-emerald-600 hover:bg-emerald-700 h-8'}
                              onClick={() => acceptApp(m, a.id)}
                              data-testid={`accept-app-${a.id}`}
                              title={quotaReached ? `Quota atteint (${m.accepted_count}/${m.num_providers_needed})` : 'Accepter'}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> {quotaReached ? 'Accepter (quota plein)' : 'Accepter'}
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200" onClick={() => rejectApp(m.id, a.id)} data-testid={`reject-app-${a.id}`}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeter
                            </Button>
                          </>
                        );
                      })() : a.status === 'pending' && m.status === 'completed' ? (
                        <Badge className="bg-gray-500">Mission terminée</Badge>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-end">
                          <Badge variant={a.status === 'accepted' ? 'default' : 'secondary'} className={a.status === 'accepted' ? 'bg-emerald-600' : ''}>{a.status}</Badge>
                          {a.status === 'accepted' && m.status === 'completed' && (
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-amber-600 border-amber-300" onClick={() => { setRateProviderModal({ mission_id: m.id, provider_id: a.provider_id, provider_name: a.provider_name }); setRateForm({ stars: 5, comment: '' }); }} data-testid={`rate-prov-${a.id}`}>
                                ⭐ Noter
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-emerald-600 border-emerald-300" onClick={() => downloadInvoice(m.id, a.provider_id, m.company_id)} data-testid={`invoice-${a.id}`}>
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
      })}
      </>
      )}

      {view === 'timesheets' && (timesheets.length === 0 ? (
        <Card className="p-10 text-center text-gray-500"><Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />Aucun pointage reçu.</Card>
      ) : timesheets.map(t => (
        <Card key={t.id} className="p-4" data-testid={`company-ts-${t.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-bold">{t.mission_title}</h3>
              <p className="text-sm text-gray-700">Prestataire : <strong>{t.provider_name}</strong></p>
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
            <div className="flex flex-col gap-2 shrink-0">
              {t.status === 'submitted' ? (
                <>
                  <Button size="sm" onClick={() => validateTs(t.id)} className="bg-emerald-600 hover:bg-emerald-700 h-8" data-testid={`validate-ts-${t.id}`}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Valider
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectTs(t)} className="h-8 text-red-600 border-red-200" data-testid={`reject-ts-${t.id}`}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeter
                  </Button>
                </>
              ) : (
                <Badge className={t.status === 'validated' ? 'bg-green-600' : 'bg-red-500'}>{t.status === 'validated' ? 'Validé' : 'Rejeté'}</Badge>
              )}
            </div>
          </div>
        </Card>
      )))}

      {/* Create mission dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="create-mission-dialog">
          <DialogHeader>
            <DialogTitle>Publier une mission d'intérim</DialogTitle>
            <DialogDescription>Décrivez la mission pour attirer les bons prestataires.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitForm} className="space-y-3">
            <div>
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Électricien pour câblage chantier" required data-testid="mission-title-input" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Métier *</Label>
                <Input value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} placeholder="Ex: Électricien" required data-testid="mission-jobtype-input" />
              </div>
              <div>
                <Label>Nb prestataires</Label>
                <Input type="number" min="1" value={form.num_providers_needed} onChange={(e) => setForm({ ...form, num_providers_needed: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Région</Label>
                <Select
                  value={form.location_region || undefined}
                  onValueChange={(v) => setForm({ ...form, location_region: v, location_city: '' })}
                >
                  <SelectTrigger data-testid="mission-region-select"><SelectValue placeholder="Sélectionner une région" /></SelectTrigger>
                  <SelectContent>
                    {GUINEA_REGIONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ville / Préfecture</Label>
                <Select
                  value={form.location_city || undefined}
                  onValueChange={(v) => setForm({ ...form, location_city: v })}
                  disabled={!form.location_region}
                >
                  <SelectTrigger data-testid="mission-city-select"><SelectValue placeholder={form.location_region ? 'Sélectionner une ville' : 'Choisir d\'abord une région'} /></SelectTrigger>
                  <SelectContent>
                    {getCitiesForRegion(form.location_region).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Date début</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="col-span-2">
                <Label>Taux journalier (GNF)</Label>
                <Input type="number" min="0" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} placeholder="Ex: 200000" data-testid="mission-rate-input" />
              </div>
              <label className="flex items-center gap-2 text-sm pb-2">
                <input type="checkbox" checked={form.rate_negotiable} onChange={(e) => setForm({ ...form, rate_negotiable: e.target.checked })} />
                À négocier
              </label>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détails de la mission, contraintes, compétences requises…" required data-testid="mission-desc-input" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-mission-btn">
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publication…</> : 'Publier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete mission dialog */}
      <Dialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)}>
        <DialogContent data-testid="complete-mission-dialog">
          <DialogHeader>
            <DialogTitle>Marquer la mission terminée</DialogTitle>
            <DialogDescription>Cette action génère la commission ServisPro à payer par chaque prestataire accepté.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Jours travaillés</Label>
              <Input type="number" min="1" value={completeData.days_worked} onChange={(e) => setCompleteData({ ...completeData, days_worked: e.target.value })} data-testid="days-worked-input" />
            </div>
            <div>
              <Label>Taux journalier final (GNF)</Label>
              <Input type="number" min="0" value={completeData.daily_rate} onChange={(e) => setCompleteData({ ...completeData, daily_rate: e.target.value })} data-testid="final-rate-input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setCompleting(null)}>Annuler</Button>
            <Button onClick={submitComplete} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-complete-btn">Valider</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reject timesheet modal */}
      <Dialog open={!!rejectTsModal} onOpenChange={(o) => !o && setRejectTsModal(null)}>
        <DialogContent data-testid="reject-ts-dialog">
          <DialogHeader>
            <DialogTitle className="text-red-600">Rejeter le pointage</DialogTitle>
            <DialogDescription>
              Pointage de <strong>{rejectTsModal?.provider_name}</strong> sur «&nbsp;{rejectTsModal?.mission_title}&nbsp;»<br/>
              <strong>{rejectTsModal?.total_hours || (rejectTsModal?.days_worked * 8)}h</strong> = {rejectTsModal?.days_worked} jour(s)
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Motif du rejet *</Label>
            <Textarea
              rows={3}
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Le 28 mai n'a pas été travaillé, présence absente sur site."
              maxLength={500}
              data-testid="reject-reason-input"
            />
            <p className="text-xs text-gray-500 mt-1">Le prestataire verra ce motif dans son pointage.</p>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setRejectTsModal(null)}>Annuler</Button>
            <Button onClick={submitRejectTs} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-reject-ts-btn">
              Rejeter le pointage
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate provider modal */}
      <Dialog open={!!rateProviderModal} onOpenChange={(o) => !o && setRateProviderModal(null)}>
        <DialogContent data-testid="rate-provider-dialog">
          <DialogHeader>
            <DialogTitle>Noter : {rateProviderModal?.provider_name}</DialogTitle>
            <DialogDescription>Donnez votre avis sur ce prestataire après la mission.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Note</Label>
              <div className="flex gap-1 text-3xl">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setRateForm({ ...rateForm, stars: s })} className={s <= rateForm.stars ? 'text-amber-400' : 'text-gray-300'} data-testid={`comp-star-${s}`}>★</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Commentaire (optionnel)</Label>
              <Textarea rows={3} value={rateForm.comment} onChange={(e) => setRateForm({ ...rateForm, comment: e.target.value })} maxLength={1000} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setRateProviderModal(null)}>Annuler</Button>
            <Button onClick={submitRateProvider} className="bg-amber-500 hover:bg-amber-600" data-testid="submit-rate-prov-btn">Envoyer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete mission confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md" data-testid="delete-mission-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Supprimer cette mission ?
            </DialogTitle>
            <DialogDescription className="mt-2">
              Cette action est définitive. La mission sera retirée et toutes les candidatures associées seront effacées.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Annuler</Button>
            <Button onClick={deleteMission} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-btn">
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Over-quota acceptance confirmation */}
      <Dialog open={!!overquotaPending} onOpenChange={(o) => !o && setOverquotaPending(null)}>
        <DialogContent className="sm:max-w-md" data-testid="overquota-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Users className="h-5 w-5" />
              Quota déjà atteint ({overquotaPending?.mission?.accepted_count}/{overquotaPending?.mission?.num_providers_needed})
            </DialogTitle>
            <DialogDescription className="mt-2 space-y-2">
              <span className="block">
                Vous avez déjà accepté le nombre de prestataires prévu pour cette mission.
              </span>
              <span className="block">
                Voulez-vous tout de même accepter un prestataire supplémentaire ?
              </span>
              <span className="block text-xs italic text-gray-500">
                Utile si un prestataire accepté ne s&apos;est pas présenté ou s&apos;est désisté.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setOverquotaPending(null)}>Annuler</Button>
            <Button onClick={confirmOverquota} className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="confirm-overquota-btn">
              Accepter quand même
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyInterimTab;
