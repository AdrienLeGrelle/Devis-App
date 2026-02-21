/**
 * Stock commun annexe - Base de données indépendante
 * Totalement séparée de l'inventaire matériel principal
 */

export const FORMULES = ['Classique', 'Premium', 'Excellence'];
export const CATEGORIES = ['SON', 'LUMIERE', 'DJ', 'ANNEXES'];

/**
 * Base de données du stock commun annexe pour la formule Classique
 */
export const STOCK_COMMUN_ANNEXE_BASE = [
  // SON / DJ ANNEXES
  { id: 'annexe-xlr-10m', label: 'Câble XLR 3 broches – 10 m', qty: 8, category: 'SON' },
  { id: 'annexe-xlr-5m', label: 'Câble XLR 3 broches – 5 m', qty: 6, category: 'SON' },
  { id: 'annexe-xlr-2m', label: 'Câble XLR 3 broches – 2 m', qty: 4, category: 'SON' },
  { id: 'annexe-jack-trs', label: 'Câble Jack TRS 6.35 mm – 3 m', qty: 2, category: 'DJ' },
  { id: 'annexe-rca', label: 'Câble RCA stéréo – 3 m', qty: 2, category: 'DJ' },
  { id: 'annexe-powercon', label: 'Câble Powercon NAC3FCA / NAC3FCB', qty: 6, category: 'SON' },
  { id: 'annexe-rallonge-10m', label: 'Rallonge électrique HO7RNF 3G2.5 – 10 m', qty: 4, category: 'SON' },
  { id: 'annexe-enrouleur-20m', label: 'Enrouleur électrique 230V 16A – 20 m', qty: 2, category: 'SON' },
  { id: 'annexe-multiprise', label: 'Multiprise 6 prises 230V', qty: 6, category: 'SON' },
  { id: 'annexe-adaptateur-schuko', label: 'Adaptateur Schuko / Type E/F', qty: 4, category: 'SON' },
  { id: 'annexe-pied-enceinte', label: 'Pied d\'enceinte aluminium réglable 35 mm', qty: 2, category: 'SON' },
  { id: 'annexe-tube-couplage', label: 'Tube de couplage 35 mm', qty: 2, category: 'SON' },
  { id: 'annexe-pied-micro', label: 'Pied de microphone perche télescopique', qty: 2, category: 'DJ' },
  { id: 'annexe-di-box', label: 'DI Box passive', qty: 2, category: 'SON' },
  { id: 'annexe-adaptateur-xlr', label: 'Adaptateur XLR M/F', qty: 4, category: 'SON' },
  // LUMIÈRE ANNEXES
  { id: 'annexe-dmx-10m', label: 'Câble DMX 110Ω XLR 3 broches – 10 m', qty: 6, category: 'LUMIERE' },
  { id: 'annexe-dmx-5m', label: 'Câble DMX 110Ω XLR 3 broches – 5 m', qty: 4, category: 'LUMIERE' },
  { id: 'annexe-splitter-dmx', label: 'Splitter DMX 1 entrée / 4 sorties', qty: 1, category: 'LUMIERE' },
  { id: 'annexe-terminator-dmx', label: 'Terminator DMX 120Ω', qty: 2, category: 'LUMIERE' },
  { id: 'annexe-crochet-fixation', label: 'Crochet de fixation aluminium', qty: 8, category: 'LUMIERE' },
  { id: 'annexe-elingue-securite', label: 'Élingue de sécurité 50 cm', qty: 6, category: 'LUMIERE' },
  { id: 'annexe-pied-lumiere', label: 'Pied lumière trépied renforcé', qty: 2, category: 'LUMIERE' },
  { id: 'annexe-barre-t', label: 'Barre en T 4 projecteurs', qty: 2, category: 'LUMIERE' },
  { id: 'annexe-clamp', label: 'Clamp aluminium 30–50 mm', qty: 8, category: 'LUMIERE' },
  { id: 'annexe-alim-iec', label: 'Câble alimentation IEC C13 / Schuko – 3 m', qty: 6, category: 'LUMIERE' },
  // ANNEXES GÉNÉRALES
  { id: 'annexe-gaffer', label: 'Ruban gaffer noir 50 mm', qty: 2, category: 'ANNEXES' },
  { id: 'annexe-ruban-isolant', label: 'Ruban isolant PVC', qty: 2, category: 'ANNEXES' },
  { id: 'annexe-velcro', label: 'Velcro serre-câbles', qty: 20, category: 'ANNEXES' },
  { id: 'annexe-colliers', label: 'Colliers nylon', qty: 30, category: 'ANNEXES' },
  { id: 'annexe-kit-adaptateurs', label: 'Kit adaptateurs audio', qty: 1, category: 'ANNEXES' },
  { id: 'annexe-kit-outils', label: 'Kit outils montage', qty: 1, category: 'ANNEXES' },
  { id: 'annexe-lampe-frontale', label: 'Lampe frontale LED', qty: 1, category: 'ANNEXES' },
  { id: 'annexe-piles', label: 'Lot piles AA / AAA', qty: 1, category: 'ANNEXES' },
];

/**
 * Calcule les quantités pour Premium
 * - +30% sur XLR
 * - +30% sur DMX
 * - +2 multiprises
 * - +2 rallonges
 */
function calculatePremiumQty(baseItem, baseQty) {
  const label = baseItem.label.toLowerCase();
  
  // +30% sur XLR
  if (label.includes('xlr')) {
    return Math.ceil(baseQty * 1.3);
  }
  
  // +30% sur DMX
  if (label.includes('dmx')) {
    return Math.ceil(baseQty * 1.3);
  }
  
  // +2 multiprises
  if (label.includes('multiprise')) {
    return baseQty + 2;
  }
  
  // +2 rallonges
  if (label.includes('rallonge')) {
    return baseQty + 2;
  }
  
  return baseQty;
}

/**
 * Calcule les quantités pour Excellence
 * - Premium +
 * - Doubler XLR 10 m
 * - Doubler Powercon
 * - Ajouter Enrouleur 32A P17 (1)
 * - Ajouter Coffret distribution 32A / 16A (1)
 */
function calculateExcellenceQty(baseItem, baseQty) {
  const label = baseItem.label.toLowerCase();
  
  // D'abord appliquer Premium
  let qty = calculatePremiumQty(baseItem, baseQty);
  
  // Doubler XLR 10 m (sur la base Premium)
  if (label.includes('xlr') && label.includes('10 m')) {
    return qty * 2;
  }
  
  // Doubler Powercon (sur la base Premium)
  if (label.includes('powercon')) {
    return qty * 2;
  }
  
  return qty;
}

/**
 * Crée le stock commun annexe pour une formule
 */
export function createStockForFormule(formule) {
  if (formule === 'Classique') {
    return STOCK_COMMUN_ANNEXE_BASE.map(item => ({ ...item }));
  }
  
  if (formule === 'Premium') {
    return STOCK_COMMUN_ANNEXE_BASE.map(item => ({
      ...item,
      qty: calculatePremiumQty(item, item.qty),
    }));
  }
  
  if (formule === 'Excellence') {
    const items = STOCK_COMMUN_ANNEXE_BASE.map(item => ({
      ...item,
      qty: calculateExcellenceQty(item, item.qty),
    }));
    
    // Ajouter les items spécifiques Excellence
    items.push(
      { id: 'annexe-enrouleur-32a', label: 'Enrouleur 32A P17', qty: 1, category: 'SON' },
      { id: 'annexe-coffret-distrib', label: 'Coffret distribution 32A / 16A', qty: 1, category: 'SON' }
    );
    
    return items;
  }
  
  return [];
}

/**
 * Initialise le stock commun annexe si absent
 * Vide les colonnes existantes et les remplace par le nouveau système
 */
export function initializeStockCommunAnnexe(inventory) {
  // Toujours réinitialiser avec le nouveau système indépendant
  return {
    ...inventory,
    socleCommun: {
      stockAnnexe: {
        Classique: createStockForFormule('Classique'),
        Premium: createStockForFormule('Premium'),
        Excellence: createStockForFormule('Excellence'),
      },
    },
  };
}

/**
 * Extrait le nom de la formule depuis le label (ex: "Formule Classique" -> "Classique")
 * Supporte différents formats : "Formule Classique", "Classique", etc.
 */
export function extractFormuleName(formuleLabel) {
  if (!formuleLabel) return null;
  const label = formuleLabel.toLowerCase().trim();
  
  // Vérifier directement si c'est un nom exact
  if (label === 'classique' || label === 'premium' || label === 'excellence') {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  
  // Chercher dans le label
  if (label.includes('classique')) return 'Classique';
  if (label.includes('premium')) return 'Premium';
  if (label.includes('excellence')) return 'Excellence';
  
  return null;
}

/**
 * Récupère le stock commun annexe pour une formule donnée
 * @param {Object} inventory - L'inventaire contenant socleCommun.stockAnnexe
 * @param {string} formuleLabel - Le label de la formule (ex: "Formule Classique")
 * @returns {Array} Liste des items du stock commun annexe pour cette formule
 */
export function getStockCommunAnnexeForFormule(inventory, formuleLabel) {
  if (!inventory?.socleCommun?.stockAnnexe) return [];
  
  const formuleName = extractFormuleName(formuleLabel);
  if (!formuleName || !FORMULES.includes(formuleName)) return [];
  
  return inventory.socleCommun.stockAnnexe[formuleName] || [];
}
