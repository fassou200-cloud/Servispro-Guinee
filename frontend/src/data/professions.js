// Profession groups and their associated professions for Guinea
export const professionGroups = [
  {
    id: 'batiment',
    name: 'Bâtiment & Construction',
    icon: '🔧',
    professions: [
      { id: 'macon', name: 'Maçon' },
      { id: 'manoeuvre_chantier', name: 'Manœuvre de chantier' },
      { id: 'coffreur', name: 'Coffreur' },
      { id: 'ferrailleur', name: 'Ferrailleur' },
      { id: 'charpentier', name: 'Charpentier' },
      { id: 'menuisier', name: 'Menuisier' },
      { id: 'couvreur', name: 'Couvreur' },
      { id: 'peintre_batiment', name: 'Peintre en bâtiment' },
      { id: 'platrier_plaquiste', name: 'Plâtrier / Plaquiste' },
      { id: 'carreleur', name: 'Carreleur' },
      { id: 'tailleur_pierre', name: 'Tailleur de pierre' },
      { id: 'etancheur', name: 'Étancheur' },
      { id: 'facadier', name: 'Façadier' }
    ]
  },
  {
    id: 'electricite_energie',
    name: 'Électricité, Eau & Énergie',
    icon: '⚡',
    professions: [
      { id: 'electricien_batiment', name: 'Électricien bâtiment' },
      { id: 'electricien_industriel', name: 'Électricien industriel' },
      { id: 'electromecanicien', name: 'Électricien bâtiment' },
      { id: 'installateur_solaire', name: 'Installateur solaire' },
      { id: 'plombier', name: 'Plombier' },
      { id: 'chauffagiste', name: 'Chauffagiste' },
      { id: 'technicien_climatisation', name: 'Technicien en climatisation' },
      { id: 'installateur_sanitaire', name: 'Installateur sanitaire' }
    ]
  },
  {
    id: 'mecanique_industrie',
    name: 'Mécanique & Industrie',
    icon: '🔩',
    professions: [
      { id: 'mecanicien_auto', name: 'Mécanicien automobile' },
      { id: 'mecanicien_poids_lourds', name: 'Mécanicien poids lourds' },
      { id: 'mecanicien_industriel', name: 'Mécanicien industriel' },
      { id: 'soudeur', name: 'Soudeur' },
      { id: 'tourneur', name: 'Tourneur' },
      { id: 'fraiseur', name: 'Fraiseur' },
      { id: 'ajusteur_monteur', name: 'Ajusteur-monteur' },
      { id: 'chaudronnier', name: 'Chaudronnier' },
      { id: 'technicien_maintenance', name: 'Technicien de maintenance' },
      { id: 'operateur_machine', name: 'Opérateur de machine industrielle' }
    ]
  },
  {
    id: 'bois_metal_artisanat',
    name: 'Bois, Métal & Artisanat',
    icon: '🪚',
    professions: [
      { id: 'menuisier_bois', name: 'Menuisier bois' },
      { id: 'menuisier_aluminium', name: 'Menuisier aluminium' },
      { id: 'ebeniste', name: 'Ébéniste' },
      { id: 'forgeron', name: 'Forgeron' },
      { id: 'serrurier', name: 'Serrurier' },
      { id: 'metallier', name: 'Métallier' },
      { id: 'vitrier', name: 'Vitrier' },
      { id: 'ferronnier', name: 'Ferronnier' }
    ]
  },
  {
    id: 'usines_production',
    name: 'Usines & Production',
    icon: '🏭',
    professions: [
      { id: 'ouvrier_usine', name: "Ouvrier d'usine" },
      { id: 'ouvrier_production', name: 'Ouvrier de production' },
      { id: 'ouvrier_conditionnement', name: 'Ouvrier de conditionnement' },
      { id: 'conducteur_ligne', name: 'Conducteur de ligne' },
      { id: 'manutentionnaire_usine', name: 'Manutentionnaire' },
      { id: 'emballeur', name: 'Emballeur' },
      { id: 'agent_controle_qualite', name: 'Agent de contrôle qualité' }
    ]
  },
  {
    id: 'agriculture_environnement',
    name: 'Agriculture & Environnement',
    icon: '🚜',
    professions: [
      { id: 'ouvrier_agricole', name: 'Ouvrier agricole' },
      { id: 'jardinier', name: 'Jardinier' },
      { id: 'paysagiste', name: 'Paysagiste' },
      { id: 'ouvrier_forestier', name: 'Ouvrier forestier' },
      { id: 'maraicher', name: 'Maraîcher' },
      { id: 'irrigateur', name: 'Irrigateur' }
    ]
  },
  {
    id: 'transport_logistique',
    name: 'Transport & Logistique',
    icon: '🚚',
    professions: [
      { id: 'manutentionnaire', name: 'Manutentionnaire' },
      { id: 'cariste', name: 'Cariste' },
      { id: 'demenageur', name: 'Déménageur' },
      { id: 'magasinier', name: 'Magasinier' },
      { id: 'preparateur_commandes', name: 'Préparateur de commandes' },
      { id: 'aide_chauffeur', name: 'Chauffeur' }
    ]
  },
  {
    id: 'services_techniques',
    name: 'Services techniques',
    icon: '🛠️',
    professions: [
      { id: 'agent_entretien', name: "Agent d'entretien" },
      { id: 'technicien_maintenance_batiment', name: 'Technicien de maintenance bâtiment' },
      { id: 'agent_nettoyage_industriel', name: 'Agent de nettoyage industriel' },
      { id: 'ouvrier_polyvalent', name: 'Ouvrier polyvalent' },
      { id: 'homme_tout_faire', name: 'Homme à tout faire' }
    ]
  },
  {
    id: 'immobilier',
    name: 'Immobilier',
    icon: '🏠',
    professions: [
      { id: 'proprietaire_immobilier', name: 'Propriétaire immobilier' },
      { id: 'agent_immobilier', name: 'Agent immobilier' }
    ]
  }
];

// Helper functions
export const getProfessionGroups = () => professionGroups;

export const getProfessionsByGroup = (groupId) => {
  const group = professionGroups.find(g => g.id === groupId);
  return group ? group.professions : [];
};

export const getGroupById = (groupId) => {
  return professionGroups.find(g => g.id === groupId);
};

export const getProfessionById = (groupId, professionId) => {
  const group = professionGroups.find(g => g.id === groupId);
  if (!group) return null;
  return group.professions.find(p => p.id === professionId);
};

export const getProfessionDisplayName = (groupId, professionId) => {
  const profession = getProfessionById(groupId, professionId);
  return profession ? profession.name : professionId;
};
