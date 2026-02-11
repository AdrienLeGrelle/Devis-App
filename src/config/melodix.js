export const melodixEntreprise = {
  nom: 'MELODIX DJ',
  adresse: '10 Allée de l\'alliance',
  codePostal: '78000',
  ville: 'Versailles',
  telephone: '06 37 17 12 55',
  email: 'melodixdj.flg@gmail.com',
  siret: '932725476',
  codeAPE: '9329Z',
  tva: '',
};

// Tarif déplacement (€/km à partir de Versailles)
export const TARIF_KM = 0.6;

// Formules principales (prix uniquement, le matériel se configure dans Matériel / Préparation)
export const melodixFormules = [
  { id: 'classique', label: 'Formule Classique', prixTTC: 1200 },
  { id: 'premium', label: 'Formule Premium', prixTTC: 1450 },
  { id: 'excellence', label: 'Formule Excellence', prixTTC: 1750 },
];

// Options additionnelles (prix et quantité modifiables dans le devis)
export const melodixOptions = [
  { id: 'photobooth-400', label: 'PHOTOBOOTH 400', prixTTC: 580 },
  { id: 'photobooth-800', label: 'PHOTOBOOTH 800', prixTTC: 650 },
  { id: 'photobooth-no-limit', label: 'PHOTOBOOTH NO LIMIT', prixTTC: 750 },
  { id: 'pars-led-batterie', label: '6 PARS LED BATTERIE', prixTTC: 80 },
  { id: 'bar-lasers-rouge', label: 'BAR LASERS ROUGE', prixTTC: 120 },
  { id: 'stroboscope', label: 'STROBOSCOPE', prixTTC: 80 },
];

export const melodixNotes = `Prestation DJ complète : animation musicale, sonorisation et éclairage.
Équipement BOSE, YAMAHA, SHURE, PIONEER.
Prise en compte des playlists et demandes spécifiques.`;

export const melodixConditions = `Déplacement : 0,60 € / km à partir de Versailles (78000).
Hébergement et repas : à prévoir pour le DJ selon la localisation (à confirmer lors de l'appel de préparation).
Règlement : chèque, virement (au plus tard une semaine avant), ou espèces.

Pour confirmer la réservation, merci de retourner le devis signé avec la mention : « Bon pour accord », la formule et les options choisies.`;
