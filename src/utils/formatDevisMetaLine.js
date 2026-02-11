import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';

/**
 * Construit une ligne compacte avec les infos du devis.
 * Format: "N° DEV-20260209 • 09/02/2026 • Validité 30j (→ 11/03/2026) • Presta 09/02/2026 • 19h–2h • Granville"
 * Champs vides => non affichés.
 * @param {Object} devisData - Objet devis avec numero, date, validite, dateDebutPrestation, horairePrestation, lieuPrestation
 * @returns {string}
 */
export function formatDevisMetaLine(devisData) {
  if (!devisData) return '';
  
  const parts = [];
  
  // N° devis
  if (devisData.numero) {
    parts.push(`N° ${devisData.numero}`);
  }
  
  // Date devis
  if (devisData.date) {
    const dateDevis = format(new Date(devisData.date), 'dd/MM/yyyy', { locale: fr });
    parts.push(dateDevis);
  }
  
  // Validité
  if (devisData.validite) {
    const validiteJours = Number(devisData.validite);
    if (validiteJours > 0) {
      let validiteStr = `Validité ${validiteJours}j`;
      if (devisData.date) {
        const dateFin = format(
          new Date(new Date(devisData.date).getTime() + validiteJours * 24 * 60 * 60 * 1000),
          'dd/MM/yyyy',
          { locale: fr }
        );
        validiteStr += ` (→ ${dateFin})`;
      }
      parts.push(validiteStr);
    }
  }
  
  // Date prestation
  if (devisData.dateDebutPrestation) {
    const datePresta = format(new Date(devisData.dateDebutPrestation), 'dd/MM/yyyy', { locale: fr });
    parts.push(`Presta ${datePresta}`);
  }
  
  // Horaire prestation
  if (devisData.horairePrestation) {
    parts.push(devisData.horairePrestation);
  }
  
  // Lieu prestation
  if (devisData.lieuPrestation) {
    parts.push(devisData.lieuPrestation);
  }
  
  return parts.join(' • ').trim();
}
