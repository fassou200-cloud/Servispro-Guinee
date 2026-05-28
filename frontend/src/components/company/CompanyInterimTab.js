import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Briefcase, Plus, Clock, Loader2 } from 'lucide-react';
import MissionCard from '@/components/interim/MissionCard';
import TimesheetCard from '@/components/interim/TimesheetCard';
import CreateMissionDialog from '@/components/interim/dialogs/CreateMissionDialog';
import CompleteMissionDialog from '@/components/interim/dialogs/CompleteMissionDialog';
import RejectTimesheetDialog from '@/components/interim/dialogs/RejectTimesheetDialog';
import RateProviderDialog from '@/components/interim/dialogs/RateProviderDialog';
import { DeleteMissionDialog, OverquotaDialog } from '@/components/interim/dialogs/MissionConfirmDialogs';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default routes (company mode). Customer mode injects /interim/customer/* equivalents.
const DEFAULT_ROUTES = {
  createMission:    '/interim/missions',
  listMissions:     '/interim/missions/mine',
  updateMission:    (id) => `/interim/missions/${id}`,
  deleteMission:    (id) => `/interim/missions/${id}`,
  listApplications: (id) => `/interim/missions/${id}/applications`,
  acceptApp:        (aid) => `/interim/applications/${aid}/accept`,
  rejectApp:        (aid) => `/interim/applications/${aid}/reject`,
  completeMission:  (id) => `/interim/missions/${id}/complete`,
  rateProvider:     (id) => `/interim/missions/${id}/rate-provider`,
  listTimesheets:   '/interim/timesheets/company',
  validateTs:       (id) => `/interim/timesheets/${id}/validate`,
  rejectTs:         (id) => `/interim/timesheets/${id}/reject`,
};

const buildAuth = (tokenKey) => ({ headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey)}` } });

const blankForm = {
  title: '', description: '', job_type: '', location_region: '', location_city: '',
  location_commune: '', location_quartier: '',
  start_date: '', end_date: '', daily_rate: '', rate_negotiable: false,
  num_providers_needed: 1, documents_required: [],
};

const CompanyInterimTab = ({ routes = DEFAULT_ROUTES, tokenKey = 'companyToken', mode = 'company', ownerHeaderTitle = 'Missions Intérim', ownerHeaderSubtitle = 'Publiez des missions ponctuelles et recrutez des prestataires.' }) => {
  const auth = () => buildAuth(tokenKey);
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
        axios.get(`${API}${routes.listMissions}`, auth()),
        axios.get(`${API}${routes.listTimesheets}`, auth()),
      ]);
      setMissions(m.data || []);
      setTimesheets(t.data || []);
    } catch (e) {
      toast.error("Erreur de chargement des missions");
    } finally {
      setLoading(false);
    }
  }, [routes, tokenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateTs = async (id) => {
    try {
      await axios.post(`${API}${routes.validateTs(id)}`, {}, auth());
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
      await axios.post(`${API}${routes.rejectTs(rejectTsModal.id)}`, { reason: rejectReason.trim() }, auth());
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
      await axios.post(`${API}${routes.rateProvider(rateProviderModal.mission_id)}`, {
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
        const res = await axios.get(`${API}${routes.listApplications(missionId)}`, auth());
        setApps((p) => ({ ...p, [missionId]: res.data || [] }));
      } catch {
        toast.error("Erreur de chargement des candidatures");
      }
    }
  };

  const refreshApps = async (missionId) => {
    try {
      const res = await axios.get(`${API}${routes.listApplications(missionId)}`, auth());
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
      await axios.post(`${API}${routes.createMission}`, {
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
      await axios.post(`${API}${routes.acceptApp(aid)}`, {}, auth());
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
      await axios.post(`${API}${routes.rejectApp(aid)}`, { reason: '' }, auth());
      toast.success('Candidature rejetée');
      refreshApps(mid);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const deleteMission = async () => {
    if (!deletingId) return;
    try {
      await axios.delete(`${API}${routes.deleteMission(deletingId)}`, auth());
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

  const submitComplete = async (payload) => {
    try {
      await axios.post(`${API}${routes.completeMission(completing)}`, {
        days_worked: Number(payload.days_worked) || 1,
        daily_rate: Number(payload.daily_rate) || 0,
        ratings: payload.ratings || [],
      }, auth());
      toast.success('Mission clôturée — en attente des évaluations des prestataires');
      setCompleting(null); loadMissions();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  if (loading) return <div className="text-center py-10 text-gray-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6" data-testid="company-interim-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-emerald-600" /> {ownerHeaderTitle}</h2>
          <p className="text-sm text-gray-500">{ownerHeaderSubtitle}</p>
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
      ) : missions.map((m) => (
        <MissionCard
          key={m.id}
          mission={m}
          applications={apps[m.id] || []}
          isExpanded={!!expanded[m.id]}
          onToggleExpand={toggleExpand}
          onAcceptApp={(mission, aid) => acceptApp(mission, aid)}
          onRejectApp={(mid, aid) => rejectApp(mid, aid)}
          onComplete={openComplete}
          onDelete={(id) => setDeletingId(id)}
          onRateProvider={(target) => { setRateProviderModal(target); setRateForm({ stars: 5, comment: '' }); }}
          onDownloadInvoice={downloadInvoice}
        />
      ))}
      </>
      )}

      {view === 'timesheets' && (timesheets.length === 0 ? (
        <Card className="p-10 text-center text-gray-500"><Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />Aucun pointage reçu.</Card>
      ) : timesheets.map(t => (
        <TimesheetCard key={t.id} timesheet={t} onValidate={validateTs} onReject={rejectTs} />
      )))}

      <CreateMissionDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        form={form}
        setForm={setForm}
        onSubmit={submitForm}
        creating={creating}
      />

      <CompleteMissionDialog
        open={!!completing}
        onOpenChange={(o) => !o && setCompleting(null)}
        completeData={completeData}
        setCompleteData={setCompleteData}
        onSubmit={submitComplete}
        mission={missions.find((m) => m.id === completing)}
      />

      <RejectTimesheetDialog
        timesheet={rejectTsModal}
        onClose={() => setRejectTsModal(null)}
        reason={rejectReason}
        setReason={setRejectReason}
        onSubmit={submitRejectTs}
      />

      <RateProviderDialog
        target={rateProviderModal}
        onClose={() => setRateProviderModal(null)}
        form={rateForm}
        setForm={setRateForm}
        onSubmit={submitRateProvider}
      />

      <DeleteMissionDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={deleteMission}
      />

      <OverquotaDialog
        pending={overquotaPending}
        onClose={() => setOverquotaPending(null)}
        onConfirm={confirmOverquota}
      />
    </div>
  );
};

export default CompanyInterimTab;
