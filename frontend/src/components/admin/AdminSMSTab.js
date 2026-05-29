import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare, CheckCircle2, XCircle, Wallet, RefreshCw,
  AlertTriangle, Loader2, TrendingUp,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });

const PURPOSE_LABEL = {
  otp: 'OTP',
  alert: 'Alerte',
  notification: 'Notification',
  other: 'Autre',
};

const PURPOSE_COLOR = {
  otp: 'bg-blue-600',
  alert: 'bg-amber-600',
  notification: 'bg-emerald-600',
  other: 'bg-slate-500',
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

const StatCard = ({ icon: Icon, label, value, sublabel, color = 'text-emerald-400', testId }) => (
  <Card className="p-4 bg-slate-800 border-slate-700" data-testid={testId}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
      </div>
      <Icon className={`h-7 w-7 ${color} opacity-70`} />
    </div>
  </Card>
);

const AdminSMSTab = () => {
  const [stats, setStats] = useState(null);
  const [balance, setBalance] = useState(null);
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState({ items: [], total: 0 });
  const [logFilter, setLogFilter] = useState({ purpose: '', success: '' });
  const [loading, setLoading] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [thresholdInput, setThresholdInput] = useState('');
  const [savingThreshold, setSavingThreshold] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/api/admin/sms/stats`, auth());
      setStats(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur chargement stats');
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/api/admin/sms/balance`, auth());
      setBalance(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur chargement solde');
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/api/admin/sms/settings`, auth());
      setSettings(r.data);
      setThresholdInput(String(r.data.low_balance_threshold_usd ?? ''));
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur chargement paramètres');
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (logFilter.purpose) params.set('purpose', logFilter.purpose);
      if (logFilter.success !== '') params.set('success', logFilter.success);
      const r = await axios.get(`${API}/api/admin/sms/logs?${params}`, auth());
      setLogs(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur chargement journal');
    }
  }, [logFilter.purpose, logFilter.success]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadBalance(), loadSettings(), loadLogs()]);
      setLoading(false);
    })();
  }, [loadStats, loadBalance, loadSettings, loadLogs]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const refreshBalance = async () => {
    setRefreshingBalance(true);
    await loadBalance();
    setRefreshingBalance(false);
    toast.success('Solde mis à jour');
  };

  const saveThreshold = async () => {
    const val = Number(thresholdInput);
    if (isNaN(val) || val < 0) {
      toast.error('Seuil invalide');
      return;
    }
    setSavingThreshold(true);
    try {
      await axios.put(`${API}/api/admin/sms/settings`, { low_balance_threshold_usd: val }, auth());
      toast.success('Seuil enregistré');
      await Promise.all([loadSettings(), loadBalance()]);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    } finally {
      setSavingThreshold(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-300" data-testid="admin-sms-loading">
        <Loader2 className="h-6 w-6 mr-2 animate-spin" /> Chargement…
      </div>
    );
  }

  const totalSent = stats?.total?.sent || 0;
  const totalCost = stats?.total_cost_usd || 0;
  const successRate = stats?.success_rate_pct ?? 0;

  return (
    <div className="space-y-5" data-testid="admin-sms-tab">
      {/* SMS globally disabled banner */}
      {balance && balance.sms_enabled === false && (
        <Card className="p-4 bg-amber-950/60 border border-amber-700 text-amber-100 flex items-center gap-3" data-testid="sms-disabled-banner">
          <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Envoi SMS temporairement désactivé</p>
            <p className="text-sm text-amber-200/90">
              Le kill-switch <code className="bg-amber-900/60 px-1 py-0.5 rounded text-xs">SMS_ENABLED=false</code> est actif dans le backend.
              Les utilisateurs sont auto-vérifiés à l&apos;inscription ; aucun SMS réel n&apos;est envoyé. Réactivez via <code className="bg-amber-900/60 px-1 py-0.5 rounded text-xs">SMS_ENABLED=true</code> une fois le top-up Africa&apos;s Talking validé.
            </p>
          </div>
        </Card>
      )}

      {/* Low balance alert */}
      {balance?.sms_enabled !== false && balance?.is_low && (
        <Card className="p-4 bg-red-950/60 border border-red-700 text-red-200 flex items-center gap-3" data-testid="sms-low-balance-alert">
          <AlertTriangle className="h-6 w-6 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Solde Africa&apos;s Talking faible</p>
            <p className="text-sm text-red-300/90">
              Solde actuel : <strong>{balance.balance_str || '—'}</strong> (≈ {balance.balance_usd?.toFixed(2)} USD) — sous le seuil de {balance.threshold_usd} USD. Rechargez votre compte pour éviter les échecs d&apos;envoi.
            </p>
          </div>
        </Card>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Envoyés aujourd'hui"
          value={stats?.today?.sent ?? 0}
          sublabel={`${stats?.today?.success ?? 0} succès · ${stats?.today?.failed ?? 0} échecs`}
          color="text-emerald-400"
          testId="sms-stat-today"
        />
        <StatCard
          icon={TrendingUp}
          label="7 derniers jours"
          value={stats?.week?.sent ?? 0}
          sublabel={`${stats?.month?.sent ?? 0} sur 30 jours`}
          color="text-blue-400"
          testId="sms-stat-week"
        />
        <StatCard
          icon={Wallet}
          label="Coût total"
          value={`$${totalCost.toFixed(2)}`}
          sublabel={`${totalSent} SMS envoyés`}
          color="text-amber-400"
          testId="sms-stat-cost"
        />
        <StatCard
          icon={CheckCircle2}
          label="Taux de succès"
          value={`${successRate}%`}
          sublabel={`${stats?.total?.failed ?? 0} échecs totaux`}
          color={successRate >= 90 ? 'text-emerald-400' : 'text-red-400'}
          testId="sms-stat-success-rate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Balance widget */}
        <Card className="p-5 bg-slate-800 border-slate-700 lg:col-span-1" data-testid="sms-balance-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-400" /> Solde Africa&apos;s Talking
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshBalance}
              disabled={refreshingBalance}
              className="text-slate-300 hover:text-white"
              data-testid="sms-refresh-balance-btn"
            >
              <RefreshCw className={`h-4 w-4 ${refreshingBalance ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {balance?.success ? (
            <>
              <p className="text-3xl font-bold text-emerald-400">{balance.balance_str || '—'}</p>
              {balance.balance_usd !== null && (
                <p className="text-xs text-slate-400 mt-1">≈ {balance.balance_usd.toFixed(4)} USD</p>
              )}
              <p className="text-xs text-slate-500 mt-3">
                Seuil d&apos;alerte : <strong className="text-slate-300">{balance.threshold_usd} USD</strong>
              </p>
            </>
          ) : (
            <div className="text-sm text-slate-400">
              <p className="text-red-400 font-semibold mb-1">Solde indisponible</p>
              <p className="text-xs">{balance?.error || 'Vérifiez vos identifiants AT_USERNAME / AT_API_KEY dans le backend .env.'}</p>
              <p className="text-xs mt-2 text-slate-500">Tip : le solde devient disponible une fois votre premier topup Live validé par Africa&apos;s Talking.</p>
            </div>
          )}
        </Card>

        {/* Threshold setting */}
        <Card className="p-5 bg-slate-800 border-slate-700 lg:col-span-1" data-testid="sms-threshold-card">
          <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" /> Seuil d&apos;alerte solde bas
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-400">Montant minimum (USD)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="mt-1 bg-slate-900 border-slate-600 text-slate-100"
                data-testid="sms-threshold-input"
              />
            </div>
            <Button
              onClick={saveThreshold}
              disabled={savingThreshold}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="sms-threshold-save-btn"
            >
              {savingThreshold ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
            <p className="text-xs text-slate-500">
              Une alerte rouge s&apos;affichera dès que le solde AT passe sous ce seuil.
            </p>
          </div>
        </Card>

        {/* Purposes breakdown */}
        <Card className="p-5 bg-slate-800 border-slate-700 lg:col-span-1" data-testid="sms-purposes-card">
          <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" /> Répartition par motif
          </h3>
          {(stats?.by_purpose || []).length === 0 ? (
            <p className="text-sm text-slate-400">Aucun SMS envoyé pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {stats.by_purpose.map((p) => (
                <div key={p.purpose} className="flex items-center justify-between text-sm">
                  <Badge className={`${PURPOSE_COLOR[p.purpose] || 'bg-slate-500'} text-white`}>
                    {PURPOSE_LABEL[p.purpose] || p.purpose}
                  </Badge>
                  <span className="text-slate-300">
                    <strong>{p.count}</strong> · {p.success} ok
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Logs */}
      <Card className="p-5 bg-slate-800 border-slate-700" data-testid="sms-logs-card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-400" /> Journal des SMS récents ({logs.total})
          </h3>
          <div className="flex items-center gap-2">
            <select
              className="h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
              value={logFilter.purpose}
              onChange={(e) => setLogFilter((f) => ({ ...f, purpose: e.target.value }))}
              data-testid="sms-filter-purpose"
            >
              <option value="">Tous les motifs</option>
              <option value="otp">OTP</option>
              <option value="alert">Alerte</option>
              <option value="notification">Notification</option>
              <option value="other">Autre</option>
            </select>
            <select
              className="h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
              value={logFilter.success}
              onChange={(e) => setLogFilter((f) => ({ ...f, success: e.target.value }))}
              data-testid="sms-filter-success"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Succès uniquement</option>
              <option value="false">Échecs uniquement</option>
            </select>
          </div>
        </div>

        {logs.items.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Aucun SMS dans le journal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700 text-slate-400 text-left">
                <tr>
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Destinataire</th>
                  <th className="py-2 px-2">Motif</th>
                  <th className="py-2 px-2">Statut</th>
                  <th className="py-2 px-2">Coût</th>
                  <th className="py-2 px-2">Message</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {logs.items.map((l) => (
                  <tr key={l.id} className="border-b border-slate-700/50 hover:bg-slate-700/20" data-testid={`sms-log-row-${l.id}`}>
                    <td className="py-2 px-2 whitespace-nowrap text-xs text-slate-400">{fmtDate(l.created_at)}</td>
                    <td className="py-2 px-2 whitespace-nowrap font-mono text-xs">{l.phone_number_masked}</td>
                    <td className="py-2 px-2">
                      <Badge className={`${PURPOSE_COLOR[l.purpose] || 'bg-slate-500'} text-white text-xs`}>
                        {PURPOSE_LABEL[l.purpose] || l.purpose}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">
                      {l.success ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1 text-xs" title={l.error}><XCircle className="h-3.5 w-3.5" /> Échec</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs">{l.cost || '—'}</td>
                    <td className="py-2 px-2 text-xs text-slate-400 max-w-xs truncate">{l.message_preview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminSMSTab;
