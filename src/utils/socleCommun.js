/**
 * Gestion du socle commun (annexes) par formule
 * Stockage dans inventory.socleCommun.assignments
 * Structure: { [itemId]: { [formule]: { qty: number } } }
 */

export const FORMULES = ['Classique', 'Premium', 'Excellence'];
export const CATEGORIES = ['DJ', 'SON', 'LUMIERE', 'ANNEXES'];

/**
 * Initialise la structure des socles communs si absente
 */
export function initializeDefaultSocles(inventory) {
  if (!inventory.socleCommun) {
    return {
      ...inventory,
      socleCommun: {
        assignments: {},
      },
    };
  }
  if (!inventory.socleCommun.assignments) {
    return {
      ...inventory,
      socleCommun: {
        ...inventory.socleCommun,
        assignments: {},
      },
    };
  }
  return inventory;
}
