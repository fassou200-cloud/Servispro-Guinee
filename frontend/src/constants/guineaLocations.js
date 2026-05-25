// Liste officielle des régions administratives de Guinée et leurs préfectures/villes.
// Utilisé pour les selects « Région » + « Ville » dans tout l'app (mission intérim, formulaire prestataire, etc.)

export const GUINEA_REGIONS = [
  'Conakry',
  'Boké',
  'Faranah',
  'Kankan',
  'Kindia',
  'Labé',
  'Mamou',
  'Nzérékoré',
];

// Préfectures / villes principales par région
export const GUINEA_CITIES_BY_REGION = {
  'Conakry': ['Kaloum', 'Dixinn', 'Matam', 'Matoto', 'Ratoma'],
  'Boké': ['Boké', 'Boffa', 'Fria', 'Gaoual', 'Koundara'],
  'Faranah': ['Faranah', 'Dabola', 'Dinguiraye', 'Kissidougou'],
  'Kankan': ['Kankan', 'Kérouané', 'Kouroussa', 'Mandiana', 'Siguiri'],
  'Kindia': ['Kindia', 'Coyah', 'Dubréka', 'Forécariah', 'Télimélé'],
  'Labé': ['Labé', 'Koubia', 'Lélouma', 'Mali', 'Tougué'],
  'Mamou': ['Mamou', 'Dalaba', 'Pita'],
  'Nzérékoré': ['Nzérékoré', 'Beyla', 'Guéckédou', 'Lola', 'Macenta', 'Yomou'],
};

export const getCitiesForRegion = (region) => GUINEA_CITIES_BY_REGION[region] || [];
