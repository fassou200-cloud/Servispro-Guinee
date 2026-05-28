// Approximate GPS coordinates for Guinean cities and Conakry communes.
// Used by the interim missions map view to plot a marker for each mission
// without needing per-mission geocoding.
//
// Coordinates source: OpenStreetMap public data, rounded to 4 decimals.
// Match priority: commune > city > region.

export const GUINEA_COORDS = {
  // ────────────────────────────────────────── Régions (centroïdes)
  regions: {
    Conakry: { lat: 9.6412, lng: -13.5784 },
    Boké: { lat: 10.9342, lng: -14.2913 },
    Kindia: { lat: 10.0379, lng: -12.8651 },
    Mamou: { lat: 10.3753, lng: -12.0921 },
    Labé: { lat: 11.3192, lng: -12.2837 },
    Faranah: { lat: 10.0356, lng: -10.7396 },
    Kankan: { lat: 10.3853, lng: -9.3056 },
    Nzérékoré: { lat: 7.7559, lng: -8.8244 },
  },
  // ────────────────────────────────────────── Villes principales
  cities: {
    Conakry: { lat: 9.6412, lng: -13.5784 },
    Boké: { lat: 10.9342, lng: -14.2913 },
    Kamsar: { lat: 10.6500, lng: -14.6000 },
    Fria: { lat: 10.3667, lng: -13.5833 },
    Kindia: { lat: 10.0379, lng: -12.8651 },
    Coyah: { lat: 9.7050, lng: -13.4014 },
    Forécariah: { lat: 9.4307, lng: -13.0863 },
    Dubréka: { lat: 9.7903, lng: -13.5181 },
    Télimélé: { lat: 10.9047, lng: -13.0356 },
    Mamou: { lat: 10.3753, lng: -12.0921 },
    Pita: { lat: 11.0763, lng: -12.4006 },
    Dalaba: { lat: 10.6913, lng: -12.2516 },
    Labé: { lat: 11.3192, lng: -12.2837 },
    Tougué: { lat: 11.4486, lng: -11.6606 },
    Koubia: { lat: 11.5917, lng: -11.8917 },
    Lélouma: { lat: 11.4514, lng: -12.6517 },
    Mali: { lat: 12.0820, lng: -12.3094 },
    Koundara: { lat: 12.4831, lng: -13.2986 },
    Gaoual: { lat: 11.7547, lng: -13.2056 },
    Faranah: { lat: 10.0356, lng: -10.7396 },
    Dabola: { lat: 10.7494, lng: -11.1117 },
    Dinguiraye: { lat: 11.3000, lng: -10.7167 },
    Kissidougou: { lat: 9.1864, lng: -10.0950 },
    Kankan: { lat: 10.3853, lng: -9.3056 },
    Kérouané: { lat: 9.2667, lng: -9.0167 },
    Kouroussa: { lat: 10.6500, lng: -9.8833 },
    Mandiana: { lat: 10.6328, lng: -8.6850 },
    Siguiri: { lat: 11.4181, lng: -9.1683 },
    Nzérékoré: { lat: 7.7559, lng: -8.8244 },
    Macenta: { lat: 8.5500, lng: -9.4667 },
    Guéckédou: { lat: 8.5650, lng: -10.1392 },
    Beyla: { lat: 8.6914, lng: -8.6486 },
    Lola: { lat: 7.8000, lng: -8.5333 },
    Yomou: { lat: 7.5708, lng: -9.2569 },
  },
  // ────────────────────────────────────────── Communes de Conakry
  communes: {
    Kaloum: { lat: 9.5092, lng: -13.7122 },
    Dixinn: { lat: 9.5460, lng: -13.6750 },
    Matam: { lat: 9.5350, lng: -13.6580 },
    Ratoma: { lat: 9.6230, lng: -13.6390 },
    Matoto: { lat: 9.5740, lng: -13.5710 },
    Lambanyi: { lat: 9.6580, lng: -13.5630 },
    Sonfonia: { lat: 9.6650, lng: -13.6010 },
    Gbessia: { lat: 9.5780, lng: -13.6080 },
    Kagbelen: { lat: 9.6620, lng: -13.5300 },
    Sangoyah: { lat: 9.5980, lng: -13.5430 },
  },
};

/**
 * Resolve mission coordinates from its 4-level location.
 * Priority: commune match > city match > region match > default Conakry.
 * Adds a small random jitter (~50m) so multiple missions at the same city
 * don't perfectly overlap on the map.
 */
export function resolveMissionCoords(mission) {
  const stripAccents = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const match = (dict, key) => {
    if (!key) return null;
    const cleanKey = stripAccents(String(key).trim()).toLowerCase();
    for (const k of Object.keys(dict)) {
      if (stripAccents(k).toLowerCase() === cleanKey) return dict[k];
    }
    return null;
  };

  const commune = (mission.location_commune || '').replace(/\s*\(.*\)\s*$/, '').trim();
  const city = mission.location_city;
  const region = mission.location_region;

  const base =
    match(GUINEA_COORDS.communes, commune) ||
    match(GUINEA_COORDS.cities, city) ||
    match(GUINEA_COORDS.regions, region) ||
    GUINEA_COORDS.cities.Conakry;

  // Deterministic small jitter (so same mission always renders at same spot)
  const seed = (mission.id || mission._id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = ((seed % 200) / 200 - 0.5) * 0.006; // ~0.3km radius
  const jitter2 = (((seed * 31) % 200) / 200 - 0.5) * 0.006;
  return { lat: base.lat + jitter, lng: base.lng + jitter2 };
}
