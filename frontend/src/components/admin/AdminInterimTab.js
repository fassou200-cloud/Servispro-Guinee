import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Coins, CheckCircle, XCircle, Loader2, Plus, Trash2, Settings as SettingsIcon, RefreshCcw } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const PAY_LABELS = { orange_money: 'Orange Money', mtn_money: 'MTN Money', bank: 'Virement bancaire', other: 'Autre' };

const AdminInterimTab = () => {
  const [tab, setTab] = useState('commissions');     // commissions | missions | settings
  const [filter, setFilter] = useState('submitted');
  const [commissions, setCommissions] = useState([]);
  const [counts, setCounts] = useState({});
  const [missions, setMissions] = useState([]);
  const [missionCounts, setMissionCounts] = useState({});
  const [settings, setSettings] = useState({ commission_percent: 10, payment_methods: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter ? `${API}/admin/interim/commissions?status=${filter}` : `${API}/admin/interim/commissions`;
      const res = await axios.get(url, auth());
      setCommissions(res.data.commissions || []);
      setCounts(res.data.counts || {});
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  }, [filter]);

  const loadMissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/interim/missions`, auth());
      setMissions(res.data.missions || []);
      setMissionCounts(res.data.counts || {});
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/interim/settings`, auth());
      setSettings({
        commission_percent: res.data.commission_percent ?? 10,
        payment_methods: res.data.payment_methods || [],
      });
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'commissions') loadCommissions();
    else if (tab === 'missions') loadMissions();
    else loadSettings();
  }, [tab, loadCommissions, loadMissions, loadSettings]);

  const validateCommission = async (id) => {
    try {
      await axios.post(`${API}/admin/interim/commissions/${id}/validate`, {}, auth());
      toast.success('Commission validée');
      loadCommissions();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const rejectCommission = async (id) => {
    const reason = window.prompt('Motif de rejet (visible par le prestataire) :', '');
    if (reason === null) return;
    try {
      await axios.post(`${API}/admin/interim/commissions/${id}/reject`, { reason }, auth());
      toast.success('Commission rejetée');
      loadCommissions();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/interim/settings`, settings, auth());
      toast.success('Paramètres enregistrés');
      loadSettings();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const addPaymentMethod = () => {
    setSettings({
      ...settings,
      payment_methods: [...settings.payment_methods, { id: `tmp-${Date.now()}`, type: 'orange_money', label: '', account_name: '', account_number: '', instructions: '' }],
    });
  };

  const updatePM = (idx, field, value) => {
    const next = [...settings.payment_methods];
    next[idx] = { ...next[idx], [field]: value };
    setSettings({ ...settings, payment_methods: next });
  };

  const removePM = (idx) => {
    const next = settings.payment_methods.filter((_, i) => i !== idx);
    setSettings({ ...settings, payment_methods: next });
  };

  return (
    <div className="space-y-4 text-white" data-testid="admin-interim-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-emerald-400" /> Intérim</h2>
          <p className="text-sm text-slate-400">Gestion des missions, commissions et paramètres.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === 'commissions' ? 'default' : 'outline'} onClick={() => setTab('commissions')} className={tab === 'commissions' ? 'bg-emerald-600' : 'border-slate-600 text-slate-300'} data-testid="adm-tab-commissions">
          <Coins className="h-4 w-4 mr-1" /> Commissions
          {counts.submitted > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-xs rounded-full">{counts.submitted}</span>}
        </Button>
        <Button variant={tab === 'missions' ? 'default' : 'outline'} onClick={() => setTab('missions')} className={tab === 'missions' ? 'bg-emerald-600' : 'border-slate-600 text-slate-300'} data-testid="adm-tab-missions">
          <Briefcase className="h-4 w-4 mr-1" /> Missions
        </Button>
        <Button variant={tab === 'settings' ? 'default' : 'outline'} onClick={() => setTab('settings')} className={tab === 'settings' ? 'bg-emerald-600' : 'border-slate-600 text-slate-300'} data-testid="adm-tab-settings">
          <SettingsIcon className="h-4 w-4 mr-1" /> Paramètres
        </Button>
      </div>

      {loading && <div className="text-center py-6"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}

      {!loading && tab === 'commissions' && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {['submitted', 'pending', 'validated', 'rejected', ''].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full ${filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                data-testid={`filter-${f || 'all'}`}>
                {f === '' ? `Toutes (${(counts.pending || 0) + (counts.submitted || 0) + (counts.validated || 0) + (counts.rejected || 0)})`
                  : f === 'submitted' ? `À vérifier (${counts.submitted || 0})`
                  : f === 'pending' ? `En attente (${counts.pending || 0})`
                  : f === 'validated' ? `Validées (${counts.validated || 0})`
                  : `Rejetées (${counts.rejected || 0})`}
              </button>
            ))}
            <button onClick={loadCommissions} className="ml-auto p-1 text-slate-400 hover:text-white"><RefreshCcw className="h-4 w-4" /></button>
          </div>

          {commissions.length === 0 ? (
            <Card className="p-10 text-center text-slate-400 bg-slate-800/50 border-slate-700">Aucune commission.</Card>
          ) : commissions.map(c => (
            <Card key={c.id} className="p-4 bg-slate-800/50 border-slate-700" data-testid={`adm-commission-${c.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white">{c.mission_title}</h3>
                  <p className="text-sm text-slate-300">Entreprise : <strong>{c.company_name}</strong></p>
                  <p className="text-sm text-slate-300">Prestataire : <strong>{c.provider_name}</strong> ({c.provider_phone})</p>
                  <p className="text-xs text-slate-400 mt-1">{c.days_worked} jour(s) × {fmt(c.daily_rate)} = {fmt(c.gross_amount)} GNF · Commission {c.commission_percent}% = <strong className="text-emerald-400">{fmt(c.commission_amount)} GNF</strong></p>
                  {c.status === 'submitted' && (
                    <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/30 text-sm">
                      <p>Mode : <strong>{PAY_LABELS[c.payment_method] || c.payment_method}</strong></p>
                      <p>Référence : <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300">{c.transfer_reference}</code></p>
                      {c.sender_phone && <p>N° émetteur : {c.sender_phone}</p>}
                      {c.payment_note && <p className="text-xs italic text-slate-300">{c.payment_note}</p>}
                    </div>
                  )}
                  {c.rejection_reason && c.status === 'rejected' && (
                    <p className="text-xs text-red-300 mt-1">Rejet : {c.rejection_reason}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {c.status === 'submitted' && (
                    <>
                      <Button size="sm" onClick={() => validateCommission(c.id)} className="bg-emerald-600 hover:bg-emerald-700" data-testid={`validate-${c.id}`}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Valider
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectCommission(c.id)} className="border-red-500 text-red-400 hover:bg-red-500/10" data-testid={`reject-${c.id}`}>
                        <XCircle className="h-4 w-4 mr-1" /> Rejeter
                      </Button>
                    </>
                  )}
                  {c.status !== 'submitted' && (
                    <Badge className={c.status === 'validated' ? 'bg-green-600' : c.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'}>{c.status}</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {!loading && tab === 'missions' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { k: 'open', label: 'Ouvertes', color: 'text-green-400' },
              { k: 'closed', label: 'Fermées', color: 'text-blue-400' },
              { k: 'completed', label: 'Terminées', color: 'text-purple-400' },
              { k: 'cancelled', label: 'Annulées', color: 'text-red-400' },
            ].map(stat => (
              <Card key={stat.k} className="p-3 bg-slate-800/50 border-slate-700">
                <p className="text-xs text-slate-400">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{missionCounts[stat.k] || 0}</p>
              </Card>
            ))}
          </div>
          <div className="space-y-2">
            {missions.length === 0 ? (
              <Card className="p-10 text-center text-slate-400 bg-slate-800/50 border-slate-700">Aucune mission.</Card>
            ) : missions.slice(0, 50).map(m => (
              <Card key={m.id} className="p-3 bg-slate-800/50 border-slate-700">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{m.title}</p>
                    <p className="text-xs text-slate-400">{m.company_name} · {m.job_type} · {m.location_city}</p>
                  </div>
                  <Badge className={
                    m.status === 'open' ? 'bg-green-600' :
                    m.status === 'closed' ? 'bg-blue-600' :
                    m.status === 'completed' ? 'bg-purple-600' :
                    'bg-red-500'
                  }>{m.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {!loading && tab === 'settings' && (
        <Card className="p-5 bg-slate-800/50 border-slate-700 space-y-5">
          <div>
            <Label className="text-slate-200">Commission ServisPro (%)</Label>
            <Input type="number" step="0.1" min="0" max="100"
              value={settings.commission_percent}
              onChange={(e) => setSettings({ ...settings, commission_percent: e.target.value })}
              className="bg-slate-700/50 border-slate-600 text-white max-w-xs"
              data-testid="commission-percent-input"
            />
            <p className="text-xs text-slate-400 mt-1">Pourcentage prélevé sur chaque mission terminée.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-slate-200">Comptes de paiement ServisPro</Label>
              <Button size="sm" onClick={addPaymentMethod} className="bg-emerald-600 hover:bg-emerald-700 gap-1" data-testid="add-pm-btn">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>
            {settings.payment_methods.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucun compte. Ajoutez au moins un compte pour que les prestataires puissent payer.</p>
            ) : (
              <div className="space-y-3">
                {settings.payment_methods.map((pm, idx) => (
                  <Card key={pm.id || idx} className="p-3 bg-slate-700/50 border-slate-600 space-y-2" data-testid={`pm-card-${idx}`}>
                    <div className="flex items-center justify-between">
                      <select value={pm.type} onChange={(e) => updatePM(idx, 'type', e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white">
                        <option value="orange_money">Orange Money</option>
                        <option value="mtn_money">MTN Money</option>
                        <option value="bank">Virement bancaire</option>
                        <option value="other">Autre</option>
                      </select>
                      <button onClick={() => removePM(idx)} className="text-red-400 hover:text-red-300" data-testid={`remove-pm-${idx}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input placeholder="Libellé court (Ex: 'Compte principal')" value={pm.label} onChange={(e) => updatePM(idx, 'label', e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                      <Input placeholder="Titulaire du compte" value={pm.account_name} onChange={(e) => updatePM(idx, 'account_name', e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                    <Input placeholder="Numéro / IBAN (Ex: 622 00 00 00)" value={pm.account_number} onChange={(e) => updatePM(idx, 'account_number', e.target.value)} className="bg-slate-800 border-slate-600 text-white" />
                    <Textarea rows={2} placeholder="Instructions (optionnel)" value={pm.instructions} onChange={(e) => updatePM(idx, 'instructions', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm" />
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" data-testid="save-settings-btn">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement…</> : 'Enregistrer'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminInterimTab;
