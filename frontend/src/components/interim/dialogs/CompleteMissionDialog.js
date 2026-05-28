import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StarRow = ({ value, onChange, testid }) => (
  <div className="flex gap-1" data-testid={testid}>
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => onChange(s)}
        className="p-0.5 hover:scale-110 transition-transform"
        aria-label={`${s} étoile${s > 1 ? 's' : ''}`}
      >
        <Star className={`h-6 w-6 ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      </button>
    ))}
  </div>
);

const CompleteMissionDialog = ({ open, onOpenChange, completeData, setCompleteData, onSubmit, mission }) => {
  const [accepted, setAccepted] = useState([]);
  const [ratings, setRatings] = useState({}); // {provider_id: {stars, comment}}
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !mission?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('companyToken') || localStorage.getItem('customerToken');
        const owner = localStorage.getItem('companyToken') ? 'company' : 'customer';
        const url = owner === 'company'
          ? `${API}/interim/missions/${mission.id}/applications`
          : `${API}/interim/customer/missions/${mission.id}/applications`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        const acc = res.data.filter((a) => a.status === 'accepted');
        setAccepted(acc);
        // Initialise empty rating per accepted provider
        const init = {};
        acc.forEach((a) => {
          init[a.provider_id] = { stars: 0, comment: '' };
        });
        setRatings(init);
      } catch {
        toast.error("Impossible de charger les prestataires acceptés");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, mission?.id]);

  const setStars = (pid, stars) => setRatings((r) => ({ ...r, [pid]: { ...r[pid], stars } }));
  const setComment = (pid, comment) => setRatings((r) => ({ ...r, [pid]: { ...r[pid], comment } }));

  const allRated = accepted.length > 0 && accepted.every((a) => (ratings[a.provider_id]?.stars || 0) >= 1);

  const submitWithRatings = () => {
    if (!allRated) {
      toast.error('Veuillez attribuer une note à chaque prestataire accepté');
      return;
    }
    const payload = {
      ...completeData,
      ratings: accepted.map((a) => ({
        provider_id: a.provider_id,
        stars: ratings[a.provider_id].stars,
        comment: (ratings[a.provider_id].comment || '').trim(),
      })),
    };
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="complete-mission-dialog">
        <DialogHeader>
          <DialogTitle>Marquer la mission terminée</DialogTitle>
          <DialogDescription>
            L&apos;évaluation de chaque prestataire est obligatoire pour finaliser la mission.
            Cette action génère la commission ServisPro à payer par chaque prestataire accepté.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jours travaillés</Label>
              <Input type="number" min="1" value={completeData.days_worked} onChange={(e) => setCompleteData({ ...completeData, days_worked: e.target.value })} data-testid="days-worked-input" />
            </div>
            <div>
              <Label>Taux journalier final (GNF)</Label>
              <Input type="number" min="0" value={completeData.daily_rate} onChange={(e) => setCompleteData({ ...completeData, daily_rate: e.target.value })} data-testid="final-rate-input" />
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <Label className="text-sm font-semibold">Évaluation des prestataires *</Label>
            {loading && <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></div>}
            {!loading && accepted.length === 0 && (
              <p className="text-sm text-red-600">Aucun prestataire accepté — impossible de clôturer cette mission.</p>
            )}
            {!loading && accepted.map((a) => (
              <div key={a.provider_id} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-2" data-testid={`rate-row-${a.provider_id}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-slate-700">{a.provider_name || 'Prestataire'}</span>
                  <StarRow
                    value={ratings[a.provider_id]?.stars || 0}
                    onChange={(s) => setStars(a.provider_id, s)}
                    testid={`stars-${a.provider_id}`}
                  />
                </div>
                <Textarea
                  rows={2}
                  placeholder="Commentaire (optionnel) — qualité du travail, ponctualité, etc."
                  value={ratings[a.provider_id]?.comment || ''}
                  onChange={(e) => setComment(a.provider_id, e.target.value)}
                  maxLength={1000}
                  className="text-sm"
                  data-testid={`comment-${a.provider_id}`}
                />
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 italic">
            Après clôture, les prestataires recevront un rappel pour vous évaluer en retour. La mission sera complètement terminée
            quand tous auront évalué (ou automatiquement après 7 jours avec note neutre).
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submitWithRatings} disabled={loading || !allRated} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-complete-btn">
            Clôturer la mission
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteMissionDialog;
