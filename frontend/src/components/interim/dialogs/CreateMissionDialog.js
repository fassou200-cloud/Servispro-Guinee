import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2 } from 'lucide-react';
import { getRegions, getVillesByRegion, getCommunesByVille } from '@/data/guineaLocations';

const CreateMissionDialog = ({ open, onOpenChange, form, setForm, onSubmit, creating }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="create-mission-dialog">
      <DialogHeader>
        <DialogTitle>Publier une mission d'intérim</DialogTitle>
        <DialogDescription>Décrivez la mission pour attirer les bons prestataires.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3">
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
        <div className="p-4 bg-slate-50 rounded-xl space-y-3" data-testid="mission-location-section">
          <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
            <MapPin className="h-4 w-4 text-orange-500" />
            Localisation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Région *</Label>
              <Select
                value={form.location_region || undefined}
                onValueChange={(v) => setForm({ ...form, location_region: v, location_city: '', location_commune: '' })}
              >
                <SelectTrigger data-testid="mission-region-select"><SelectValue placeholder="Région" /></SelectTrigger>
                <SelectContent>
                  {getRegions().map(r => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Ville *</Label>
              <Select
                value={form.location_city || undefined}
                onValueChange={(v) => setForm({ ...form, location_city: v, location_commune: '' })}
                disabled={!form.location_region}
              >
                <SelectTrigger data-testid="mission-city-select"><SelectValue placeholder="Ville" /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    const region = getRegions().find(r => r.name === form.location_region);
                    return region ? getVillesByRegion(region.id).map(v => (
                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                    )) : null;
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Commune *</Label>
              <Select
                value={form.location_commune || undefined}
                onValueChange={(v) => setForm({ ...form, location_commune: v })}
                disabled={!form.location_city}
              >
                <SelectTrigger data-testid="mission-commune-select"><SelectValue placeholder="Commune" /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    const region = getRegions().find(r => r.name === form.location_region);
                    if (!region) return null;
                    const ville = getVillesByRegion(region.id).find(v => v.name === form.location_city);
                    if (!ville) return null;
                    return getCommunesByVille(region.id, ville.id).map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Quartier</Label>
              <Input
                value={form.location_quartier}
                onChange={(e) => setForm({ ...form, location_quartier: e.target.value })}
                placeholder="Entrez le quartier"
                data-testid="mission-quartier-input"
              />
            </div>
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-mission-btn">
            {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publication…</> : 'Publier'}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);

export default CreateMissionDialog;
