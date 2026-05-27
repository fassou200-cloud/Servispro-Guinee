import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Shield, RefreshCw, CheckCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return iso; }
};

const JwtSecurityCard = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [showRotateDlg, setShowRotateDlg] = useState(false);
  const [showFinalizeDlg, setShowFinalizeDlg] = useState(false);

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/jwt/status`, auth());
      setStatus(res.data);
    } catch {
      // backend may be restarting — keep previous status if any
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const waitForBackend = useCallback(async () => {
    setRestarting(true);
    // Backend will restart in ~2s, poll every 1s for up to 25s
    for (let i = 0; i < 25; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 1000));
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await axios.get(`${API}/admin/jwt/status`, auth());
        setStatus(res.data);
        setRestarting(false);
        return;
      } catch { /* still restarting */ }
    }
    setRestarting(false);
    toast.warning("Le redémarrage prend plus de temps que prévu. Rafraîchissez la page si nécessaire.");
  }, []);

  const doRotate = async () => {
    setShowRotateDlg(false);
    try {
      await axios.post(`${API}/admin/jwt/rotate`, {}, auth());
      toast.success('Rotation effectuée — backend en cours de redémarrage…');
      await waitForBackend();
      toast.success('✅ Rotation terminée. Aucun utilisateur déconnecté.');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la rotation');
    }
  };

  const doFinalize = async () => {
    setShowFinalizeDlg(false);
    try {
      await axios.post(`${API}/admin/jwt/finalize`, {}, auth());
      toast.success('Finalisation lancée — backend en cours de redémarrage…');
      await waitForBackend();
      toast.success('✅ Ancien secret supprimé. Les tokens antérieurs à la rotation sont invalides.');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la finalisation');
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-700 text-slate-200" data-testid="jwt-security-card">
        <div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
      </Card>
    );
  }
  if (!status) return null;

  const due = status.rotation_due;
  const grace = status.grace_window_active;
  const daysSince = status.days_since_rotation ?? 0;
  const accent =
    due ? 'border-red-500 bg-gradient-to-br from-red-50 to-orange-50 text-slate-900' :
    grace ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 text-slate-900' :
    'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 text-slate-900';

  return (
    <>
      <Card className={`p-6 border-2 ${accent}`} data-testid="jwt-security-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${due ? 'bg-red-500' : grace ? 'bg-amber-500' : 'bg-emerald-500'} text-white`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                Sécurité JWT
                {due && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold" data-testid="jwt-due-badge">Rotation due</span>}
                {grace && <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold" data-testid="jwt-grace-badge">Grace window 24h</span>}
                {!due && !grace && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> OK</span>}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {due
                  ? `Il est temps de tourner le secret JWT (${daysSince} jours depuis la dernière rotation).`
                  : grace
                    ? `Une rotation est en cours. Finalisez après 24 heures pour invalider les anciens tokens.`
                    : `Dernière rotation il y a ${daysSince} jour(s). Tout va bien.`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {status.live_rotation_enabled ? (
              <>
                <Button
                  onClick={() => setShowRotateDlg(true)}
                  disabled={restarting}
                  className={due ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                  data-testid="rotate-jwt-btn"
                >
                  {restarting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                  Effectuer la rotation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFinalizeDlg(true)}
                  disabled={restarting || !grace}
                  data-testid="finalize-jwt-btn"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Finaliser
                </Button>
              </>
            ) : (
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-semibold" data-testid="jwt-readonly-badge">
                Production · rotation manuelle
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-sm">
          <div className="bg-white/70 rounded-lg p-3 border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">Dernière rotation</div>
            <div className="font-bold mt-0.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {fmtDate(status.rotated_at)}
            </div>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">Prochaine rotation conseillée</div>
            <div className="font-bold mt-0.5">{fmtDate(status.next_rotation_recommended_at)}</div>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-semibold">Intervalle recommandé</div>
            <div className="font-bold mt-0.5">{status.recommended_interval_days} jours (~6 mois)</div>
          </div>
        </div>

        {restarting && (
          <div className="mt-4 p-3 rounded-lg bg-blue-100 border border-blue-300 text-blue-900 text-sm flex items-center gap-2" data-testid="jwt-restarting">
            <Loader2 className="h-4 w-4 animate-spin" />
            Backend en cours de redémarrage… (5-10 secondes)
          </div>
        )}

        {!status.live_rotation_enabled && (
          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-slate-700" data-testid="jwt-prod-instructions">
            <div className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Procédure de rotation en production
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700">
              <li>Sur Emergent : <strong>Deploy → Environment Variables</strong></li>
              <li>Copier la valeur actuelle de <code className="bg-white px-1.5 py-0.5 rounded text-xs">JWT_SECRET</code> dans <code className="bg-white px-1.5 py-0.5 rounded text-xs">JWT_SECRET_PREVIOUS</code></li>
              <li>Générer un nouveau secret (86+ caractères) et le mettre dans <code className="bg-white px-1.5 py-0.5 rounded text-xs">JWT_SECRET</code></li>
              <li>Mettre la date du jour dans <code className="bg-white px-1.5 py-0.5 rounded text-xs">JWT_SECRET_ROTATED_AT</code> (format ISO : <code>2026-11-23T00:00:00Z</code>)</li>
              <li><strong>Redéployer</strong></li>
              <li>Après 24h : retirer <code className="bg-white px-1.5 py-0.5 rounded text-xs">JWT_SECRET_PREVIOUS</code> puis redéployer à nouveau</li>
            </ol>
            <div className="mt-3 text-xs text-slate-500">
              Astuce générateur : <code className="bg-white px-1.5 py-0.5 rounded text-xs">python3 -c "import secrets; print(secrets.token_urlsafe(64))"</code>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={showRotateDlg} onOpenChange={setShowRotateDlg}>
        <DialogContent data-testid="rotate-confirm-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-emerald-600" /> Confirmer la rotation</DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">Un nouveau secret JWT va être généré. L&apos;ancien sera conservé 24h.</span>
              <span className="block font-semibold text-emerald-700">✅ Aucun utilisateur connecté ne sera déconnecté.</span>
              <span className="block text-slate-500">Le backend redémarrera automatiquement (5-10 secondes).</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setShowRotateDlg(false)}>Annuler</Button>
            <Button onClick={doRotate} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-rotate-btn">Lancer la rotation</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFinalizeDlg} onOpenChange={setShowFinalizeDlg}>
        <DialogContent data-testid="finalize-confirm-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" /> Finaliser la rotation ?</DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">L&apos;ancien secret JWT sera <strong>supprimé définitivement</strong>.</span>
              <span className="block text-amber-700 font-semibold">⚠️ Les utilisateurs avec un token créé avant la rotation devront se reconnecter.</span>
              <span className="block text-slate-500">À faire idéalement 24h après la rotation.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setShowFinalizeDlg(false)}>Annuler</Button>
            <Button onClick={doFinalize} className="bg-amber-500 hover:bg-amber-600" data-testid="confirm-finalize-btn">Finaliser</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JwtSecurityCard;
