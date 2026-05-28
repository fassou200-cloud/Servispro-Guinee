import { useMemo, useState } from 'react';
import { GUINEA_LOCATIONS } from '@/data/guineaLocations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

const ANY = '__any__';

/**
 * Advanced filter panel for interim missions.
 * Props:
 *  - missions: full list (used to extract unique job_types)
 *  - value: current filter state
 *  - onChange(next): callback with new filter state
 *  - resultsCount: number after filtering (for the badge)
 */
export default function MissionFilters({ missions = [], value, onChange, resultsCount }) {
  const [open, setOpen] = useState(false);

  const jobTypes = useMemo(() => {
    const set = new Set();
    missions.forEach((m) => m.job_type && set.add(m.job_type));
    return Array.from(set).sort();
  }, [missions]);

  const region = useMemo(
    () => GUINEA_LOCATIONS.regions.find((r) => r.name === value.region),
    [value.region]
  );
  const ville = useMemo(
    () => region?.villes?.find((v) => v.name === value.ville),
    [region, value.ville]
  );
  const commune = useMemo(
    () => ville?.communes?.find((c) => c.name === value.commune),
    [ville, value.commune]
  );

  const set = (patch) => onChange({ ...value, ...patch });

  // Cascade resets when a parent changes
  const setRegion = (v) => set({ region: v === ANY ? '' : v, ville: '', commune: '', quartier: '' });
  const setVille = (v) => set({ ville: v === ANY ? '' : v, commune: '', quartier: '' });
  const setCommune = (v) => set({ commune: v === ANY ? '' : v, quartier: '' });
  const setQuartier = (v) => set({ quartier: v === ANY ? '' : v });

  const activeCount =
    (value.region ? 1 : 0) +
    (value.job_type ? 1 : 0) +
    (value.min_rate ? 1 : 0) +
    (value.max_rate ? 1 : 0);

  const clearAll = () =>
    onChange({ region: '', ville: '', commune: '', quartier: '', job_type: '', min_rate: '', max_rate: '' });

  return (
    <div className="rounded-lg border border-slate-200 bg-white" data-testid="mission-filters">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50"
        data-testid="mission-filters-toggle"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="h-4 w-4" /> Filtres
          {activeCount > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
          )}
          {typeof resultsCount === 'number' && (
            <span className="text-xs text-slate-400">· {resultsCount} résultat{resultsCount > 1 ? 's' : ''}</span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
          {/* Location cascade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Select value={value.region || ANY} onValueChange={setRegion}>
              <SelectTrigger className="h-9 text-sm" data-testid="filter-region"><SelectValue placeholder="Région" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Toutes les régions</SelectItem>
                {GUINEA_LOCATIONS.regions.map((r) => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={value.ville || ANY} onValueChange={setVille} disabled={!region}>
              <SelectTrigger className="h-9 text-sm" data-testid="filter-ville"><SelectValue placeholder="Ville" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Toutes les villes</SelectItem>
                {(region?.villes || []).map((v) => (
                  <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={value.commune || ANY} onValueChange={setCommune} disabled={!ville}>
              <SelectTrigger className="h-9 text-sm" data-testid="filter-commune"><SelectValue placeholder="Commune" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Toutes les communes</SelectItem>
                {(ville?.communes || []).map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={value.quartier || ANY} onValueChange={setQuartier} disabled={!commune}>
              <SelectTrigger className="h-9 text-sm" data-testid="filter-quartier"><SelectValue placeholder="Quartier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Tous les quartiers</SelectItem>
                {(commune?.quartiers || []).map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job type + salary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select
              value={value.job_type || ANY}
              onValueChange={(v) => set({ job_type: v === ANY ? '' : v })}
              disabled={jobTypes.length === 0}
            >
              <SelectTrigger className="h-9 text-sm" data-testid="filter-job-type">
                <SelectValue placeholder="Type de mission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Tous les types</SelectItem>
                {jobTypes.map((j) => (
                  <SelectItem key={j} value={j}>{j}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              data-testid="filter-min-rate"
              type="number"
              min="0"
              placeholder="Tarif min (GNF/jour)"
              value={value.min_rate || ''}
              onChange={(e) => set({ min_rate: e.target.value })}
              className="h-9 text-sm"
            />
            <Input
              data-testid="filter-max-rate"
              type="number"
              min="0"
              placeholder="Tarif max (GNF/jour)"
              value={value.max_rate || ''}
              onChange={(e) => set({ max_rate: e.target.value })}
              className="h-9 text-sm"
            />
          </div>

          {activeCount > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-500" data-testid="filter-clear-btn">
                <X className="h-3 w-3 mr-1" /> Effacer les filtres
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Empty filter state, used by parent components to initialize useState. */
export const EMPTY_FILTERS = {
  region: '',
  ville: '',
  commune: '',
  quartier: '',
  job_type: '',
  min_rate: '',
  max_rate: '',
};

/** Apply the filter set to a missions array. Pure function. */
export function applyMissionFilters(missions, f) {
  if (!f) return missions;
  const minR = f.min_rate ? Number(f.min_rate) : null;
  const maxR = f.max_rate ? Number(f.max_rate) : null;
  return missions.filter((m) => {
    if (f.region && m.location_region !== f.region) return false;
    if (f.ville && m.location_city !== f.ville) return false;
    if (f.commune) {
      // location_commune may include " (Centre-ville)" suffix
      const mc = (m.location_commune || '').replace(/\s*\(.*\)\s*$/, '').trim();
      const fc = f.commune.replace(/\s*\(.*\)\s*$/, '').trim();
      if (mc !== fc) return false;
    }
    if (f.quartier && m.location_quartier !== f.quartier) return false;
    if (f.job_type && m.job_type !== f.job_type) return false;
    if (minR != null && !m.rate_negotiable && (m.daily_rate || 0) < minR) return false;
    if (maxR != null && !m.rate_negotiable && (m.daily_rate || 0) > maxR) return false;
    return true;
  });
}
