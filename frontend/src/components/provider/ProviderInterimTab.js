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
import { Briefcase, Coins, MapPin, Calendar, Send, Loader2, AlertTriangle, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar';
import TimesheetCalendar from './TimesheetCalendar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const PAY_METHOD_LABELS = {
  orange_money: 'Orange Money',
  mtn_money: 'MTN Money',
  bank: 'Virement bancaire',
  other: 'Autre',
};
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
  const [loading, setLoading] = useState(true);
  const [applyTo, setApplyTo] = useState(null);             // mission object
  const [applyForm, setApplyForm] = useState({ cover_message: '', proposed_rate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [payingFor, setPayingFor] = useState(null);         // commission object
  const [payForm, setPayForm] = useState({ payment_method: 'orange_money', transfer_reference: '', sender_phone: '', note: '' });
  const [payMethods, setPayMethods] = useState([]);
  const [decliningMission, setDecliningMission] = useState(null);  // mission object to decline

  const suspended = user?.interim_suspended;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a, c, ts, av] = await Promise.all([
        axios.get(`${API}/interim/missions`, auth()),
        axios.get(`${API}/interim/applications/mine`, auth()),
        axios.get(`${API}/interim/commissions/mine`, auth()),
        axios.get(`${API}/interim/timesheets/mine`, auth()),
        axios.get(`${API}/interim/availability/mine`, auth()),
      ]);
      setMissions(m.data || []);
      setApplications(a.data || []);
      setCommissions(c.data || []);
      setTimesheets(ts.data || []);
      setAvailability(av.data || { manual_unavailable_dates: [], mission_busy_dates: [] });
    } catch {
      toast.error('Erreur de chargement');
    } finally { setLoading(false); }
  }, []);

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
  const [tsForm, setTsForm] = useState({ days_worked: '', notes: '', worked_dates: [] });

  const openTimesheet = (app) => {
    const existing = timesheets.find(t => t.mission_id === app.mission_id);
    if (existing) {
      setTsForm({ days_worked: existing.days_worked, notes: existing.notes || '', worked_dates: existing.worked_dates || [] });
    } else {
      setTsForm({ days_worked: '', notes: '', worked_dates: [] });
    }
    setTsModalApp(app);
  };

  const toggleWorkedDate = (dateStr) => {
    setTsForm((f) => {
      const set = new Set(f.worked_dates || []);
      if (set.has(dateStr)) set.delete(dateStr); else set.add(dateStr);
      const sorted = Array.from(set).sort();
      return { ...f, worked_dates: sorted, days_worked: sorted.length || f.days_worked };
    });
  };

  const submitTimesheet = async () => {
    if (!Number(tsForm.days_worked) || Number(tsForm.days_worked) <= 0) {
      toast.error('Indiquez le nombre de jours travaillés'); return;
    }
    try {
      await axios.post(`${API}/interim/missions/${tsModalApp.mission_id}/timesheet`, {
        days_worked: Number(tsForm.days_worked),
        notes: tsForm.notes,
        worked_dates: tsForm.worked_dates,
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

      {view === 'missions' && (missions.length === 0 ? (
        <Card className="p-10 text-center text-gray-500"><Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-3" />Aucune mission ouverte.</Card>
      ) : missions.map((m) => {
        const alreadyApplied = applications.find(a => a.mission_id === m.id);
        return (
          <Card key={m.id} className="p-4" data-testid={`available-mission-${m.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">{m.title}</h3>
                <p className="text-sm text-emerald-700 font-semibold">{m.company_name}</p>
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
      }))}

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
            <div>
              <h3 className="font-bold">{t.mission_title}</h3>
              <p className="text-sm text-gray-700"><strong>{t.days_worked}</strong> jour(s) travaillé(s)</p>
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
      <Dialog open={!!applyTo} onOpenChange={(o) => !o && setApplyTo(null)}>
        <DialogContent data-testid="apply-mission-dialog">
          <DialogHeader>
            <DialogTitle>Postuler à : {applyTo?.title}</DialogTitle>
            <DialogDescription>Votre profil ({user?.first_name} {user?.last_name}) sera envoyé à {applyTo?.company_name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Message (optionnel)</Label>
              <Textarea rows={3} value={applyForm.cover_message} onChange={(e) => setApplyForm({ ...applyForm, cover_message: e.target.value })} placeholder="Présentez brièvement votre expérience…" maxLength={1000} data-testid="cover-message-input" />
            </div>
            <div>
              <Label>Taux journalier proposé (GNF, optionnel)</Label>
              <Input type="number" min="0" value={applyForm.proposed_rate} onChange={(e) => setApplyForm({ ...applyForm, proposed_rate: e.target.value })} placeholder={applyTo?.rate_negotiable ? 'Proposez votre taux' : `Offre: ${fmt(applyTo?.daily_rate)} GNF`} data-testid="proposed-rate-input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setApplyTo(null)}>Annuler</Button>
            <Button onClick={submitApply} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-apply-btn">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…</> : <><Send className="h-4 w-4 mr-2" /> Envoyer ma candidature</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay commission dialog */}
      <Dialog open={!!payingFor} onOpenChange={(o) => !o && setPayingFor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="pay-commission-dialog">
          <DialogHeader>
            <DialogTitle>Payer la commission ServisPro</DialogTitle>
            <DialogDescription>Effectuez le transfert puis saisissez les détails ci-dessous.</DialogDescription>
          </DialogHeader>
          {payingFor && (
            <div className="space-y-3">
              <Card className="p-3 bg-emerald-50 border-emerald-200">
                <p className="text-sm text-gray-700">Mission : <strong>{payingFor.mission_title}</strong></p>
                <p className="text-sm text-gray-700">Montant à régler : <strong className="text-red-600">{fmt(payingFor.commission_amount)} GNF</strong></p>
              </Card>

              {payMethods.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Comptes ServisPro où transférer :</p>
                  {payMethods.map(pm => (
                    <div key={pm.id} className="text-sm py-1">
                      <span className="font-semibold">{PAY_METHOD_LABELS[pm.type] || pm.type}</span> — {pm.label || pm.account_name}<br />
                      <span className="font-mono text-gray-700">{pm.account_number}</span>
                      {pm.instructions && <p className="text-xs text-gray-500 mt-0.5">{pm.instructions}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Moyen utilisé *</Label>
                <select className="w-full h-10 px-3 border rounded-md text-sm" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} data-testid="pay-method-select">
                  <option value="orange_money">Orange Money</option>
                  <option value="mtn_money">MTN Money</option>
                  <option value="bank">Virement bancaire</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <Label>Référence du transfert *</Label>
                <Input value={payForm.transfer_reference} onChange={(e) => setPayForm({ ...payForm, transfer_reference: e.target.value })} placeholder="N° de transaction" data-testid="transfer-ref-input" required />
              </div>
              <div>
                <Label>Numéro émetteur (optionnel)</Label>
                <Input value={payForm.sender_phone} onChange={(e) => setPayForm({ ...payForm, sender_phone: e.target.value })} placeholder="+224..." />
              </div>
              <div>
                <Label>Note (optionnel)</Label>
                <Textarea rows={2} value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} maxLength={500} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setPayingFor(null)}>Annuler</Button>
            <Button onClick={submitPay} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-payment-btn">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…</> : 'Soumettre la preuve'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Timesheet modal */}
      <Dialog open={!!tsModalApp} onOpenChange={(o) => !o && setTsModalApp(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="timesheet-dialog">
          <DialogHeader>
            <DialogTitle>Pointage : {tsModalApp?.mission_title}</DialogTitle>
            <DialogDescription>Sélectionnez les jours réellement travaillés. L'entreprise validera votre pointage.</DialogDescription>
          </DialogHeader>
          {tsModalApp && (
            <div className="space-y-3">
              <TimesheetCalendar
                startDate={missions.find(m => m.id === tsModalApp.mission_id)?.start_date || applications.find(a => a.id === tsModalApp.id)?.mission_start_date}
                endDate={missions.find(m => m.id === tsModalApp.mission_id)?.end_date || applications.find(a => a.id === tsModalApp.id)?.mission_end_date}
                selected={new Set(tsForm.worked_dates || [])}
                onToggle={toggleWorkedDate}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Total jours travaillés *</Label>
                  <Input type="number" min="0.5" step="0.5" value={tsForm.days_worked} onChange={(e) => setTsForm({ ...tsForm, days_worked: e.target.value })} data-testid="ts-days-input" />
                </div>
                <div className="flex items-end text-xs text-gray-500">
                  {tsForm.worked_dates.length > 0 && `${tsForm.worked_dates.length} jour(s) sélectionné(s) dans le calendrier`}
                </div>
              </div>
              <div>
                <Label>Notes (optionnel)</Label>
                <Textarea rows={2} value={tsForm.notes} onChange={(e) => setTsForm({ ...tsForm, notes: e.target.value })} placeholder="Détails sur le travail effectué…" maxLength={1000} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setTsModalApp(null)}>Annuler</Button>
            <Button onClick={submitTimesheet} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-ts-btn">Envoyer le pointage</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate company modal */}
      <Dialog open={!!rateCompanyApp} onOpenChange={(o) => !o && setRateCompanyApp(null)}>
        <DialogContent data-testid="rate-company-dialog">
          <DialogHeader>
            <DialogTitle>Noter : {rateCompanyApp?.company_name}</DialogTitle>
            <DialogDescription>Votre avis aide les futurs prestataires.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Note</Label>
              <div className="flex gap-1 text-3xl">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setRateForm({ ...rateForm, stars: s })} className={s <= rateForm.stars ? 'text-amber-400' : 'text-gray-300'} data-testid={`star-${s}`}>★</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Commentaire (optionnel)</Label>
              <Textarea rows={3} value={rateForm.comment} onChange={(e) => setRateForm({ ...rateForm, comment: e.target.value })} maxLength={1000} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setRateCompanyApp(null)}>Annuler</Button>
            <Button onClick={submitRateCompany} className="bg-amber-500 hover:bg-amber-600" data-testid="submit-rating-btn">Envoyer la note</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline mission confirmation */}
      <Dialog open={!!decliningMission} onOpenChange={(o) => !o && setDecliningMission(null)}>
        <DialogContent className="sm:max-w-md" data-testid="decline-mission-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-500" />
              Masquer cette mission ?
            </DialogTitle>
            <DialogDescription>
              <span className="block mt-2 font-semibold text-gray-700">
                {decliningMission?.title}
              </span>
              <span className="block mt-2 text-sm">
                Cette mission n&apos;apparaîtra plus dans votre liste de missions disponibles.
                Vous pourrez toujours la retrouver si l&apos;entreprise vous contacte directement.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDecliningMission(null)} data-testid="cancel-decline-btn">
              Annuler
            </Button>
            <Button onClick={declineMission} className="bg-gray-700 hover:bg-gray-800 text-white" data-testid="confirm-decline-btn">
              Masquer la mission
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderInterimTab;
