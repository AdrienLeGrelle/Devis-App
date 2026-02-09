import { TARIF_KM } from '../config/melodix';

/**
 * Retourne les items d'un set à partir de l'inventaire pour une date donnée.
 * Utilise assignmentsByDate si une date est fournie, sinon assigned_sets (legacy).
 */
export function getItemsBySet(inventory, setId, date) {
  const items = inventory?.items || [];
  if (date && inventory?.assignmentsByDate?.[date]) {
    const byDate = inventory.assignmentsByDate[date];
    return items.filter((item) => {
      const tags = byDate[item.id] || [];
      return tags.some((t) => String(t).startsWith(`${setId}:`));
    });
  }
  return items.filter((item) => {
    const tags = item.assigned_sets || [];
    return tags.some((t) => String(t).startsWith(`${setId}:`));
  });
}

/**
 * Calcule le total TTC du devis : formule + options + transport
 */
export function calculerTotalDevis(devisData) {
  let total = 0;
  if (devisData.formuleChoisie?.prixTTC) {
    total += devisData.formuleChoisie.prixTTC;
  }
  (devisData.optionsChoisies || []).forEach((opt) => {
    const qty = Number(opt.quantite) || 1;
    total += (opt.prixTTC || 0) * qty;
  });
  const km = Number(devisData.kmDeplacement) || 0;
  total += km * TARIF_KM;
  return total;
}
